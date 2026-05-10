import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import fs from "fs";
import path from "path";
import { isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dbPath = path.join(process.cwd(), "data", "valuelens.db");

  // DB size
  let dbSizeBytes = 0;
  try {
    const stat = fs.statSync(dbPath);
    dbSizeBytes = stat.size;
    // Include WAL if exists
    const walPath = dbPath + "-wal";
    if (fs.existsSync(walPath)) {
      dbSizeBytes += fs.statSync(walPath).size;
    }
  } catch {
    // DB may not exist yet
  }

  // Table row counts
  const db = await getDb();
  const watchlistRows = await db.select().from(schema.watchlist).all();
  const watchlistCount = watchlistRows.length;
  const tradeRows = await db.select().from(schema.portfolioTrades).all();
  const tradeCount = tradeRows.length;
  const cacheRows = await db.select().from(schema.snapshotCache).all();
  const cacheCount = cacheRows.length;

  // Last snapshot time per exchange
  const snapshotsByExchange: Record<string, { count: number; oldestAt: number; newestAt: number }> = {};
  for (const row of cacheRows) {
    const ex = row.exchange;
    if (!snapshotsByExchange[ex]) {
      snapshotsByExchange[ex] = { count: 0, oldestAt: Infinity, newestAt: 0 };
    }
    snapshotsByExchange[ex].count++;
    snapshotsByExchange[ex].oldestAt = Math.min(snapshotsByExchange[ex].oldestAt, row.fetchedAt);
    snapshotsByExchange[ex].newestAt = Math.max(snapshotsByExchange[ex].newestAt, row.fetchedAt);
  }

  // Cache freshness stats
  const now = Date.now();
  const STOCK_TTL = 1000 * 60 * 60 * 6;    // 6h
  const SCREENER_TTL = 1000 * 60 * 60 * 24; // 24h
  let freshForStock = 0;
  let freshForScreener = 0;
  for (const row of cacheRows) {
    const age = now - row.fetchedAt;
    if (age < STOCK_TTL) freshForStock++;
    if (age < SCREENER_TTL) freshForScreener++;
  }

  return NextResponse.json({
    status: "ok",
    demoMode: isDemoMode(),
    timestamp: now,
    database: {
      path: "data/valuelens.db",
      sizeBytes: dbSizeBytes,
      sizeHuman: dbSizeBytes > 1e6
        ? `${(dbSizeBytes / 1e6).toFixed(1)} MB`
        : `${(dbSizeBytes / 1e3).toFixed(1)} KB`,
      tables: {
        watchlist: watchlistCount,
        portfolio_trades: tradeCount,
        snapshot_cache: cacheCount,
      },
    },
    cache: {
      totalCached: cacheCount,
      freshForStockPage: freshForStock,
      freshForScreener: freshForScreener,
      stale: cacheCount - freshForScreener,
      hitRateEstimate: cacheCount > 0
        ? `${((freshForScreener / 200) * 100).toFixed(0)}% of universe cached`
        : "0% — run npm run snapshot",
    },
    snapshotsByExchange,
    yahooSession: {
      note: "Session cookie + crumb cached in-process for 30 min. Not inspectable via API — refreshes automatically on 401/403/429.",
      ttlMinutes: 30,
    },
  });
}
