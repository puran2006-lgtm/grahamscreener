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

/** Diagnostic detail for one alert evaluation. */
interface AlertDiag {
  id: number;
  ticker: string;
  condition: string;
  threshold: number;
  email: string;
  currentPrice: number | null;
  shouldFire: boolean;
  debounced: boolean;
  emailSent: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Cron endpoint: evaluate all active alerts against current prices.
 * Protected by CRON_SECRET — Vercel sends this as Authorization header.
 * Returns full diagnostics in the JSON body so GitHub Actions logs capture everything.
 */
export async function GET(req: NextRequest) {
  const log: string[] = [];
  const push = (msg: string) => { console.log(`[check-alerts] ${msg}`); log.push(msg); };

  // Auth check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    push("AUTH FAIL — header mismatch");
    return NextResponse.json({ error: "unauthorized", log }, { status: 401 });
  }
  push("Auth OK");

  // Env var check
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "(not set)";
  push(`Env: RESEND_API_KEY=${hasResendKey ? "SET" : "MISSING"}, FROM=${fromEmail}`);

  const db = await getDb();
  const activeAlerts = await db.select().from(schema.alerts)
    .where(eq(schema.alerts.active, 1)).all();

  push(`Found ${activeAlerts.length} active alert(s) in DB`);

  if (activeAlerts.length === 0) {
    // Also fetch ALL alerts (including inactive) to help diagnose
    const allAlerts = await db.select().from(schema.alerts).all();
    push(`Total alerts in DB (including inactive): ${allAlerts.length}`);
    return NextResponse.json({
      checked: 0, triggered: 0, sent: 0, failed: 0,
      totalAlertsInDb: allAlerts.length,
      environment: { hasResendKey, fromEmail },
      log,
      details: [],
    });
  }

  let checked = 0;
  let triggered = 0;
  let sent = 0;
  let failed = 0;
  const now = Date.now();
  const details: AlertDiag[] = [];

  for (const alert of activeAlerts) {
    const diag: AlertDiag = {
      id: alert.id,
      ticker: alert.ticker,
      condition: alert.conditionType,
      threshold: alert.threshold,
      email: alert.userEmail,
      currentPrice: null,
      shouldFire: false,
      debounced: false,
      emailSent: false,
    };

    try {
      // Get current price
      push(`Fetching price for ${alert.ticker}...`);
      const fundamentals = await yahooFundamentals(alert.ticker);
      const currentPrice = fundamentals.price;
      diag.currentPrice = currentPrice ?? null;
      checked++;
      push(`  ${alert.ticker} price = ${currentPrice ?? "null"}`);

      // Update last_checked_at
      await db.update(schema.alerts)
        .set({ lastCheckedAt: now })
        .where(eq(schema.alerts.id, alert.id))
        .run();

      if (currentPrice === null || currentPrice === undefined || currentPrice <= 0) {
        push(`  ${alert.ticker} — skipped: price is null/zero`);
        details.push(diag);
        continue;
      }

      // Evaluate condition
      let shouldFire = false;
      switch (alert.conditionType) {
        case "target_buy":
          shouldFire = currentPrice <= alert.threshold;
          push(`  target_buy: ${currentPrice} <= ${alert.threshold} → ${shouldFire}`);
          break;
        case "stop_loss":
          shouldFire = currentPrice <= alert.threshold;
          push(`  stop_loss: ${currentPrice} <= ${alert.threshold} → ${shouldFire}`);
          break;
        case "pct_change_up":
          if (alert.referencePrice && alert.referencePrice > 0) {
            const target = alert.referencePrice * (1 + alert.threshold / 100);
            shouldFire = currentPrice >= target;
            push(`  pct_change_up: ${currentPrice} >= ${target.toFixed(2)} → ${shouldFire}`);
          } else {
            push(`  pct_change_up: no referencePrice — skipped`);
          }
          break;
        case "pct_change_down":
          if (alert.referencePrice && alert.referencePrice > 0) {
            const target = alert.referencePrice * (1 - alert.threshold / 100);
            shouldFire = currentPrice <= target;
            push(`  pct_change_down: ${currentPrice} <= ${target.toFixed(2)} → ${shouldFire}`);
          } else {
            push(`  pct_change_down: no referencePrice — skipped`);
          }
          break;
      }
      diag.shouldFire = shouldFire;

      if (!shouldFire) {
        push(`  ${alert.ticker} — condition NOT met, skipping`);
        details.push(diag);
        continue;
      }

      // Debounce
      if (alert.lastFiredAt && (now - alert.lastFiredAt) < DEBOUNCE_MS) {
        diag.debounced = true;
        push(`  ${alert.ticker} — debounced (last fired ${Math.round((now - alert.lastFiredAt) / 60000)}m ago)`);
        details.push(diag);
        continue;
      }

      // Send email
      triggered++;
      push(`  Sending email to ${alert.userEmail} for ${alert.ticker}...`);
      const result = await sendPriceAlert(alert, currentPrice);
      push(`  Resend result: success=${result.success}, id=${result.id ?? "n/a"}, error=${result.error ?? "none"}`);

      if (result.success) {
        sent++;
        diag.emailSent = true;
        diag.emailId = result.id;
        await db.update(schema.alerts)
          .set({ lastFiredAt: now })
          .where(eq(schema.alerts.id, alert.id))
          .run();
      } else {
        failed++;
        diag.error = result.error;
      }
    } catch (err) {
      failed++;
      const msg = (err as Error).message;
      diag.error = msg;
      push(`  ERROR for ${alert.ticker}: ${msg}`);
    }

    details.push(diag);

    // Brief pause between tickers to avoid Yahoo rate-limits
    await new Promise((r) => setTimeout(r, 500));
  }

  push(`Done: checked=${checked}, triggered=${triggered}, sent=${sent}, failed=${failed}`);

  return NextResponse.json({
    checked, triggered, sent, failed,
    environment: { hasResendKey, fromEmail },
    log,
    details,
  });
}
