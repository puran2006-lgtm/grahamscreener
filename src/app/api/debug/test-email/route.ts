import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { sendPriceAlert } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY — directly test email delivery for the AAPL alert.
 * Bypasses cache lookup and Yahoo entirely.
 * Uses a hardcoded test price so the only variable is Resend.
 * DELETE THIS FILE after confirming emails work.
 */
export async function GET() {
  const testPrice = 200.50;

  try {
    const db = await getDb();
    const alert = await db.select().from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.ticker, "AAPL"),
          eq(schema.alerts.active, 1)
        )
      )
      .get();

    if (!alert) {
      return NextResponse.json({ error: "No active AAPL alert found" });
    }

    // Send email directly — no condition check, no debounce
    const result = await sendPriceAlert(alert, testPrice);

    return NextResponse.json({
      success: result.success,
      emailId: result.id ?? null,
      error: result.error ?? null,
      alert: {
        id: alert.id,
        ticker: alert.ticker,
        email: alert.userEmail,
        conditionType: alert.conditionType,
        threshold: alert.threshold,
      },
      testPrice,
      env: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.ALERT_FROM_EMAIL ?? "(not set)",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
