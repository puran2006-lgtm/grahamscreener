import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { yahooFundamentals } from "@/lib/yahoo/client";
import { sendPriceAlert } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** 24h debounce — don't re-fire the same alert within a day. */
const DEBOUNCE_MS = 24 * 60 * 60 * 1000;

/**
 * Cron endpoint: evaluate all active alerts against current prices.
 * Protected by CRON_SECRET — Vercel sends this as Authorization header.
 */
export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const activeAlerts = await db.select().from(schema.alerts)
    .where(eq(schema.alerts.active, 1)).all();

  if (activeAlerts.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0, failed: 0 });
  }

  let checked = 0;
  let triggered = 0;
  let failed = 0;
  const now = Date.now();

  for (const alert of activeAlerts) {
    try {
      // Get current price — uses snapshot cache if fresh enough
      const fundamentals = await yahooFundamentals(alert.ticker);
      const currentPrice = fundamentals.price;
      checked++;

      // Update last_checked_at
      await db.update(schema.alerts)
        .set({ lastCheckedAt: now })
        .where(eq(schema.alerts.id, alert.id))
        .run();

      if (currentPrice === null || currentPrice === undefined || currentPrice <= 0) {
        continue;
      }

      // Evaluate condition
      let shouldFire = false;
      switch (alert.conditionType) {
        case "target_buy":
          shouldFire = currentPrice <= alert.threshold;
          break;
        case "stop_loss":
          shouldFire = currentPrice <= alert.threshold;
          break;
        case "pct_change_up":
          if (alert.referencePrice && alert.referencePrice > 0) {
            shouldFire = currentPrice >= alert.referencePrice * (1 + alert.threshold / 100);
          }
          break;
        case "pct_change_down":
          if (alert.referencePrice && alert.referencePrice > 0) {
            shouldFire = currentPrice <= alert.referencePrice * (1 - alert.threshold / 100);
          }
          break;
      }

      if (!shouldFire) continue;

      // Debounce — don't fire if fired within last 24h
      if (alert.lastFiredAt && (now - alert.lastFiredAt) < DEBOUNCE_MS) {
        continue;
      }

      // Send email
      const result = await sendPriceAlert(alert, currentPrice);
      if (result.success) {
        triggered++;
        await db.update(schema.alerts)
          .set({ lastFiredAt: now })
          .where(eq(schema.alerts.id, alert.id))
          .run();
      } else {
        failed++;
        console.error(`Alert email failed for ${alert.ticker}:`, result.error);
      }
    } catch (err) {
      failed++;
      console.error(`Alert check failed for ${alert.ticker}:`, (err as Error).message);
    }

    // Brief pause between tickers to avoid Yahoo rate-limits
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ checked, triggered, failed });
}
