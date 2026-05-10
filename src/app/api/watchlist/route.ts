import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { exchangeFromTicker } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  ticker: z.string().min(1).max(40),
  thesis: z.string().max(2000).optional().default(""),
  targetBuyPrice: z.number().nonnegative().optional().nullable(),
  stopLoss: z.number().nonnegative().optional().nullable(),
  positionSizePct: z.number().min(0).max(100).optional().nullable(),
});

export async function GET() {
  const db = await getDb();
  const items = await db.select().from(schema.watchlist).all();
  items.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = await getDb();
  const v = parsed.data;
  const ticker = v.ticker.toUpperCase();
  const exchange = exchangeFromTicker(ticker);
  const existing = await db
    .select()
    .from(schema.watchlist)
    .where(eq(schema.watchlist.ticker, ticker))
    .get();
  if (existing) {
    await db.update(schema.watchlist)
      .set({
        thesis: v.thesis ?? "",
        targetBuyPrice: v.targetBuyPrice ?? null,
        stopLoss: v.stopLoss ?? null,
        positionSizePct: v.positionSizePct ?? null,
      })
      .where(eq(schema.watchlist.id, existing.id))
      .run();
  } else {
    await db.insert(schema.watchlist)
      .values({
        ticker,
        exchange,
        thesis: v.thesis ?? "",
        targetBuyPrice: v.targetBuyPrice ?? null,
        stopLoss: v.stopLoss ?? null,
        positionSizePct: v.positionSizePct ?? null,
        createdAt: Date.now(),
      })
      .run();
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").toUpperCase();
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
  const db = await getDb();
  await db.delete(schema.watchlist).where(eq(schema.watchlist.ticker, ticker)).run();
  return NextResponse.json({ ok: true });
}
