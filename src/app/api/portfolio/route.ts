import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { exchangeFromTicker } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tradeSchema = z.object({
  ticker: z.string().min(1).max(40),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().nonnegative().optional().default(0),
  tradeDate: z.number().int().positive(),
  notes: z.string().max(2000).optional().default(""),
});

export async function GET() {
  const db = await getDb();
  const trades = await db.select().from(schema.portfolioTrades).all();
  trades.sort((a, b) => b.tradeDate - a.tradeDate);
  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = tradeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data;
  const db = await getDb();
  const ticker = v.ticker.toUpperCase();
  const exchange = exchangeFromTicker(ticker);
  await db.insert(schema.portfolioTrades)
    .values({
      ticker,
      exchange,
      side: v.side,
      quantity: v.quantity,
      price: v.price,
      fees: v.fees ?? 0,
      tradeDate: v.tradeDate,
      notes: v.notes ?? "",
      createdAt: Date.now(),
    })
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id") ?? 0);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getDb();
  await db.delete(schema.portfolioTrades).where(eq(schema.portfolioTrades.id, id)).run();
  return NextResponse.json({ ok: true });
}
