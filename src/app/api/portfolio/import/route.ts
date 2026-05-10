import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { exchangeFromTicker } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/portfolio/import
 * Accepts an array of trades and bulk-inserts them.
 * Used by the CSV import UI after the user confirms the preview.
 */

const tradeRow = z.object({
  ticker: z.string().min(1).max(40),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().nonnegative().optional().default(0),
  tradeDate: z.number().int().positive(),
  notes: z.string().max(2000).optional().default(""),
});

const bodySchema = z.object({
  trades: z.array(tradeRow).min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const now = Date.now();
  let inserted = 0;

  // Use a transaction for atomicity — all-or-nothing bulk insert
  await db.transaction(async (tx) => {
    for (const t of parsed.data.trades) {
      const ticker = t.ticker.toUpperCase();
      await tx.insert(schema.portfolioTrades)
        .values({
          ticker,
          exchange: exchangeFromTicker(ticker),
          side: t.side,
          quantity: t.quantity,
          price: t.price,
          fees: t.fees ?? 0,
          tradeDate: t.tradeDate,
          notes: t.notes ?? "",
          createdAt: now,
        })
        .run();
      inserted++;
    }
  });

  return NextResponse.json({ ok: true, inserted });
}
