/**
 * Snapshot CLI — batch-fetch Yahoo fundamentals into the SQLite cache.
 *
 * Usage:
 *   npm run snapshot                          # All 4 exchanges (200 tickers)
 *   npm run snapshot ASX                      # ASX only (50 tickers)
 *   npm run snapshot ASX US                   # ASX + US (100 tickers)
 *   npm run snapshot -- --limit 20            # First 20 tickers only
 *   npm run snapshot -- --tickers AAPL,CBA.AX # Specific tickers
 *   npm run snapshot -- --watchlist-only       # Only watchlist tickers (~5)
 *
 * Rate-limit handling:
 *   - Sequential processing (no parallel requests)
 *   - 1.5–2.5s jitter between requests
 *   - Exponential backoff on 429: 30s → 60s → 120s
 *   - 5-min pause after 3 consecutive 429s
 */

import { getDb, schema } from "../src/lib/db";
import { yahooFundamentals } from "../src/lib/yahoo/client";
import { UNIVERSE } from "../src/lib/universe";


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Sleep for ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Format seconds as "Xm Ys". */
function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ------------------------------------------------------------------ */
/*  Parse CLI arguments                                                */
/* ------------------------------------------------------------------ */

interface CliArgs {
  exchanges: Array<keyof typeof UNIVERSE>;
  limit: number | null;
  tickers: string[] | null;
  watchlistOnly: boolean;
}

function parseArgs(): CliArgs {
  const raw = process.argv.slice(2);
  const exchanges: Array<keyof typeof UNIVERSE> = [];
  let limit: number | null = null;
  let tickers: string[] | null = null;
  let watchlistOnly = false;

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === "--limit" && raw[i + 1]) {
      limit = parseInt(raw[++i], 10);
      if (isNaN(limit) || limit <= 0) {
        console.error("--limit must be a positive integer");
        process.exit(1);
      }
    } else if (arg === "--tickers" && raw[i + 1]) {
      tickers = raw[++i].split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    } else if (arg === "--watchlist-only") {
      watchlistOnly = true;
    } else if (arg === "--") {
      // skip separator
    } else if (UNIVERSE[arg as keyof typeof UNIVERSE]) {
      exchanges.push(arg as keyof typeof UNIVERSE);
    }
  }

  return { exchanges, limit, tickers, watchlistOnly };
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

(async () => {
  const args = parseArgs();
  const db = await getDb();
  const startTime = Date.now();

  // Resolve ticker list
  let tickerList: string[];

  if (args.tickers) {
    tickerList = args.tickers;
    console.log(`Snapshotting ${tickerList.length} specific tickers: ${tickerList.join(", ")}`);
  } else if (args.watchlistOnly) {
    const wl = await db.select().from(schema.watchlist).all();
    tickerList = wl.map((w) => w.ticker);
    if (tickerList.length === 0) {
      console.log("Watchlist is empty — nothing to snapshot. Run `npm run seed` first.");
      return;
    }
    console.log(`Snapshotting ${tickerList.length} watchlist tickers: ${tickerList.join(", ")}`);
  } else {
    const target = args.exchanges.length
      ? args.exchanges
      : (Object.keys(UNIVERSE) as Array<keyof typeof UNIVERSE>);
    tickerList = target.flatMap((e) => UNIVERSE[e]);
    console.log(`Snapshotting ${tickerList.length} tickers (${target.join(", ")})…`);
  }

  // Apply --limit
  if (args.limit && args.limit < tickerList.length) {
    tickerList = tickerList.slice(0, args.limit);
    console.log(`  (limited to first ${args.limit})`);
  }

  const total = tickerList.length;
  let success = 0;
  let failed = 0;
  let consecutive429s = 0;
  const failures: Array<{ ticker: string; error: string }> = [];

  // Sequential processing with jitter and backoff
  for (let idx = 0; idx < total; idx++) {
    const ticker = tickerList[idx];

    // Progress every 10 tickers (or on first/last)
    if (idx % 10 === 0 || idx === total - 1) {
      const elapsed = fmtDuration((Date.now() - startTime) / 1000);
      console.log(`[${idx + 1}/${total}] Processing… (${success} ok, ${failed} failed, ${elapsed} elapsed)`);
    }

    try {
      const f = await yahooFundamentals(ticker);
      await db.insert(schema.snapshotCache)
        .values({
          ticker,
          exchange: f.exchange,
          payload: JSON.stringify(f),
          fetchedAt: Date.now(),
        })
        .onConflictDoUpdate({
          target: schema.snapshotCache.ticker,
          set: {
            payload: JSON.stringify(f),
            fetchedAt: Date.now(),
            exchange: f.exchange,
          },
        })
        .run();
      success++;
      consecutive429s = 0; // reset on success
      process.stdout.write(".");
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ ticker, error: msg });
      process.stdout.write("x");

      // Detect 429
      const is429 = msg.includes("429");
      if (is429) {
        consecutive429s++;

        if (consecutive429s >= 3) {
          // Major cooldown — 5 minutes
          console.log(`\n  ⏸  3 consecutive 429s — pausing 5 minutes…`);
          await sleep(5 * 60 * 1000);
          consecutive429s = 0;
        } else {
          // Exponential backoff: 30s, 60s
          const backoffSec = 30 * Math.pow(2, consecutive429s - 1);
          console.log(`\n  ⏸  429 on ${ticker} — backing off ${backoffSec}s…`);
          await sleep(backoffSec * 1000);
        }
      } else {
        consecutive429s = 0; // non-429 error doesn't count
      }
    }

    // Jitter delay between requests (skip after last ticker)
    if (idx < total - 1) {
      await sleep(randInt(1500, 2500));
    }
  }

  // Summary
  const elapsed = fmtDuration((Date.now() - startTime) / 1000);
  console.log(`\n\nDone in ${elapsed} — success: ${success}, failed: ${failed}, total: ${total}`);

  if (failures.length > 0) {
    // Group failures by exchange
    const byExchange: Record<string, string[]> = {};
    for (const f of failures) {
      const ex = f.ticker.includes(".AX") ? "ASX"
        : f.ticker.includes(".BO") ? "BSE"
        : f.ticker.includes(".NS") ? "NSE"
        : "US";
      if (!byExchange[ex]) byExchange[ex] = [];
      byExchange[ex].push(f.ticker);
    }
    console.log("\nFailed tickers by exchange:");
    for (const [ex, tks] of Object.entries(byExchange)) {
      console.log(`  ${ex}: ${tks.join(", ")}`);
    }
  }
})();
