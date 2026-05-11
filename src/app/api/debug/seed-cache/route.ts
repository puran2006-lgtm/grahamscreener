import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY — inject a test price into snapshot_cache for AAPL.
 * Used to verify the email alert pipeline end-to-end when Yahoo
 * rate-limits both Vercel and GitHub Actions IPs.
 * DELETE THIS FILE after confirming alerts work.
 */
export async function POST() {
  const ticker = "AAPL";
  const exchange = "US";
  const price = 200.50;
  const now = Date.now();

  const payload = JSON.stringify({
    price,
    currency: "USD",
    marketState: "REGULAR",
    shortName: "Apple Inc.",
    regularMarketPrice: price,
  });

  try {
    const db = await getDb();
    await db
      .insert(schema.snapshotCache)
      .values({ ticker, exchange, payload, fetchedAt: now })
      .onConflictDoUpdate({
        target: schema.snapshotCache.ticker,
        set: { exchange, payload, fetchedAt: now },
      })
      .run();

    return NextResponse.json({
      success: true,
      message: `${ticker} seeded at $${price.toFixed(2)}`,
      inserted: { ticker, exchange, fetchedAt: now },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
