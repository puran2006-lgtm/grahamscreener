import { NextRequest, NextResponse } from "next/server";
import { yahooFundamentals } from "@/lib/yahoo/client";
import { getDb, schema } from "@/lib/db";
import { UNIVERSE } from "@/lib/universe";
import type { Exchange } from "@/lib/yahoo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function fetchWithConcurrency<T>(
  items: string[],
  fn: (item: string) => Promise<T>,
  concurrency = 6
): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const exchanges: Exchange[] = (body?.exchanges as Exchange[]) ?? ["ASX", "BSE", "NSE", "US"];
  const watchlistOnly = body?.watchlistOnly === true;

  const db = await getDb();
  let tickers: string[] = [];
  if (watchlistOnly) {
    const wl = await db.select().from(schema.watchlist).all();
    tickers = wl.map((w) => w.ticker);
  } else {
    tickers = exchanges.flatMap((e) => UNIVERSE[e]);
  }

  let success = 0;
  let failed = 0;
  await fetchWithConcurrency(
    tickers,
    async (ticker) => {
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
            set: { payload: JSON.stringify(f), fetchedAt: Date.now(), exchange: f.exchange },
          })
          .run();
        success++;
      } catch {
        failed++;
      }
    },
    6
  );

  return NextResponse.json({ ok: true, total: tickers.length, success, failed });
}

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(schema.snapshotCache).all();
  return NextResponse.json({
    count: rows.length,
    lastFetchedAt: rows.reduce((m, r) => Math.max(m, r.fetchedAt), 0) || null,
    tickers: rows.map((r) => ({
      ticker: r.ticker,
      exchange: r.exchange,
      fetchedAt: r.fetchedAt,
    })),
  });
}
