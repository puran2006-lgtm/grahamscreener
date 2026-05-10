import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY debug endpoint — lists all alerts and environment status.
 * DELETE THIS FILE after diagnosing the email issue.
 */
export async function GET() {
  const db = await getDb();
  const allAlerts = await db.select().from(schema.alerts).all();

  return NextResponse.json({
    count: allAlerts.length,
    alerts: allAlerts.map((a) => ({
      id: a.id,
      ticker: a.ticker,
      exchange: a.exchange,
      conditionType: a.conditionType,
      threshold: a.threshold,
      active: a.active,
      userEmail: a.userEmail,
      referencePrice: a.referencePrice,
      lastCheckedAt: a.lastCheckedAt,
      lastFiredAt: a.lastFiredAt,
      createdAt: a.createdAt,
      notes: a.notes,
    })),
    environment: {
      hasResendKey: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.ALERT_FROM_EMAIL ?? "(not set)",
      replyTo: process.env.ALERT_REPLY_TO ?? "(not set)",
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasCronSecret: !!process.env.CRON_SECRET,
      demoMode: process.env.DEMO_MODE ?? "(not set)",
    },
  });
}
