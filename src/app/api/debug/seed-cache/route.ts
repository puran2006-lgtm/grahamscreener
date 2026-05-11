import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY — prepare everything for an end-to-end alert email test.
 *
 * 1. Upserts AAPL at $200.50 into snapshot_cache
 * 2. Updates the AAPL alert: real email, threshold $250 (so $200.50 fires),
 *    clears debounce, ensures active=1
 * 3. Reads back both rows to prove they persisted in Turso
 *
 * DELETE THIS FILE after confirming alerts work.
 */
export async function POST() {
  const ticker = "AAPL";
  const exchange = "US";
  const seedPrice = 200.50;
  const alertThreshold = 250; // $200.50 <= $250 → fires
  const testEmail = "puran.2006@gmail.com";
  const now = Date.now();

  const payload = JSON.stringify({
    ticker,
    exchange,
    currency: "USD",
    shortName: "Apple Inc.",
    price: seedPrice,
    regularMarketPrice: seedPrice,
    marketState: "REGULAR",
  });

  try {
    const db = await getDb();

    // ── Step 1: Seed snapshot_cache ──────────────────────────
    await db
      .insert(schema.snapshotCache)
      .values({ ticker, exchange, payload, fetchedAt: now })
      .onConflictDoUpdate({
        target: schema.snapshotCache.ticker,
        set: { exchange, payload, fetchedAt: now },
      })
      .run();

    // Read back to verify write persisted
    const cachedRow = await db
      .select()
      .from(schema.snapshotCache)
      .where(eq(schema.snapshotCache.ticker, ticker))
      .get();

    // ── Step 2: Update the AAPL alert ───────────────────────
    const existingAlert = await db
      .select()
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.ticker, ticker),
          eq(schema.alerts.conditionType, "target_buy")
        )
      )
      .get();

    let alertUpdate: Record<string, unknown> | null = null;

    if (existingAlert) {
      await db
        .update(schema.alerts)
        .set({
          userEmail: testEmail,
          threshold: alertThreshold,
          active: 1,
          lastFiredAt: null,
        })
        .where(eq(schema.alerts.id, existingAlert.id))
        .run();
      alertUpdate = { action: "updated", id: existingAlert.id };
    } else {
      await db
        .insert(schema.alerts)
        .values({
          userEmail: testEmail,
          ticker,
          exchange,
          conditionType: "target_buy",
          threshold: alertThreshold,
          active: 1,
          createdAt: now,
          notes: "Test alert created by seed-cache endpoint",
        })
        .run();
      alertUpdate = { action: "created" };
    }

    const alertRow = await db
      .select()
      .from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.ticker, ticker),
          eq(schema.alerts.conditionType, "target_buy")
        )
      )
      .get();

    const allCache = await db.select().from(schema.snapshotCache).all();

    return NextResponse.json({
      success: true,
      message: `${ticker} seeded at $${seedPrice}, alert updated to fire at ≤$${alertThreshold}, email→${testEmail}`,
      cache: {
        written: { ticker, exchange, fetchedAt: now },
        readBack: cachedRow
          ? {
              ticker: cachedRow.ticker,
              exchange: cachedRow.exchange,
              fetchedAt: cachedRow.fetchedAt,
              payloadPreview: cachedRow.payload.substring(0, 200),
            }
          : "READ-BACK FAILED — row not found after insert!",
        totalCacheRows: allCache.length,
        allTickers: allCache.map((r) => r.ticker),
      },
      alert: {
        ...alertUpdate,
        current: alertRow
          ? {
              id: alertRow.id,
              ticker: alertRow.ticker,
              email: alertRow.userEmail,
              conditionType: alertRow.conditionType,
              threshold: alertRow.threshold,
              active: alertRow.active,
              lastFiredAt: alertRow.lastFiredAt,
            }
          : "ALERT NOT FOUND",
      },
      nextStep:
        "Run check-alerts workflow. Expected: cache HIT at $200.50, target_buy 200.5 <= 250 → true, email sent.",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
