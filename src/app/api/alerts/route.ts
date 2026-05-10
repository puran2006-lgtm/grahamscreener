import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { exchangeFromTicker } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  userEmail: z.string().email(),
  ticker: z.string().min(1).max(40),
  conditionType: z.enum(["target_buy", "stop_loss", "pct_change_up", "pct_change_down"]),
  threshold: z.number().positive(),
  referencePrice: z.number().positive().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const db = await getDb();
  const items = await db.select().from(schema.alerts).all();
  items.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = await getDb();
  const v = parsed.data;
  const ticker = v.ticker.toUpperCase();
  const exchange = exchangeFromTicker(ticker);

  await db.insert(schema.alerts)
    .values({
      userEmail: v.userEmail,
      ticker,
      exchange,
      conditionType: v.conditionType,
      threshold: v.threshold,
      referencePrice: v.referencePrice ?? null,
      active: 1,
      createdAt: Date.now(),
      notes: v.notes ?? null,
    })
    .run();

  return NextResponse.json({ ok: true });
}
