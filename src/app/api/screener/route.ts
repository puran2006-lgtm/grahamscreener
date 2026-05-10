import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { yahooFundamentals } from "@/lib/yahoo/client";
import { UNIVERSE } from "@/lib/universe";
import type { Exchange, Fundamentals } from "@/lib/yahoo/types";
import { isDemoMode, demoQuote, demoUniverse } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const querySchema = z.object({
  exchange: z.enum(["ASX", "BSE", "NSE", "US"]).default("US"),
  maxPE: z.number().optional(),
  maxPB: z.number().optional(),
  minCurrentRatio: z.number().optional(),
  maxDebtToEquity: z.number().optional(),
  minDividendYield: z.number().optional(),
});

const FRESH_MS = 1000 * 60 * 60 * 24; // 24h

async function getFundamentalsCached(ticker: string): Promise<Fundamentals | null> {
  const db = await getDb();
  const cached = await db
    .select()
    .from(schema.snapshotCache)
    .where(eq(schema.snapshotCache.ticker, ticker))
    .get();
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
    try {
      return JSON.parse(cached.payload) as Fundamentals;
    } catch {
      // fallthrough
    }
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
        set: { payload: JSON.stringify(f), fetchedAt: Date.now(), exchange: f.exchange },
      })
      .run();
    return f;
  } catch {
    return cached ? (JSON.parse(cached.payload) as Fundamentals) : null;
  }
}

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
  const json = await req.json().catch(() => ({}));
  const parsed = querySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const f = parsed.data;
  const exchange = f.exchange as Exchange;
  const tickers = UNIVERSE[exchange];

  let data: Fundamentals[];
  if (isDemoMode()) {
    // In demo mode, use fixture files instead of Yahoo API
    const demoTickers = demoUniverse()[exchange] ?? [];
    data = demoTickers
      .map((t) => demoQuote(t))
      .filter((x): x is Fundamentals => x !== null);
  } else {
    data = (await fetchWithConcurrency(tickers, getFundamentalsCached, 6)).filter(
      (x): x is Fundamentals => x !== null
    );
  }

  const filtered = data.filter((d) => {
    if (f.maxPE !== undefined && (d.trailingPE === undefined || d.trailingPE > f.maxPE)) return false;
    if (f.maxPB !== undefined && (d.priceToBook === undefined || d.priceToBook > f.maxPB)) return false;
    if (f.minCurrentRatio !== undefined && (d.currentRatio === undefined || d.currentRatio < f.minCurrentRatio))
      return false;
    if (f.maxDebtToEquity !== undefined) {
      const dte = d.debtToEquity === undefined ? undefined : d.debtToEquity / 100;
      if (dte === undefined || dte > f.maxDebtToEquity) return false;
    }
    if (f.minDividendYield !== undefined && (d.dividendYield === undefined || d.dividendYield < f.minDividendYield))
      return false;
    return true;
  });

  return NextResponse.json({
    exchange,
    total: isDemoMode() ? data.length : tickers.length,
    matched: filtered.length,
    rows: filtered.sort((a, b) => (a.trailingPE ?? 1e9) - (b.trailingPE ?? 1e9)),
  });
}

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({ universe: demoUniverse(), demo: true });
  }
  return NextResponse.json({ universe: UNIVERSE });
}
