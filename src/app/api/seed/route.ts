import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { exchangeFromTicker } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED = [
  {
    ticker: "CBA.AX",
    thesis:
      "Dominant Australian retail bank with the most disciplined cost-to-income ratio of the Big Four. Watching for entries below 14× P/E during housing-cycle wobbles.",
    targetBuyPrice: 95,
    stopLoss: 80,
    positionSizePct: 6,
  },
  {
    ticker: "RELIANCE.BO",
    thesis:
      "Petrochemicals/refining cash machine funding Jio + retail buildout. Sum-of-parts gives a decent margin once Jio scales ARPU. Re-rate trigger: Jio IPO clarity.",
    targetBuyPrice: 2400,
    stopLoss: 2000,
    positionSizePct: 5,
  },
  {
    ticker: "INFY.NS",
    thesis:
      "High-quality IT services franchise with consistent FCF, double-digit ROIC, and dividend yield > 5Y avg. Add on margin compression scares — secular demand intact.",
    targetBuyPrice: 1300,
    stopLoss: 1100,
    positionSizePct: 4,
  },
  {
    ticker: "AAPL",
    thesis:
      "Services + installed base = annuity. Capital return is enormous. Pay up in fear (forward P/E < 24); trim in euphoria (> 32). Watching China + AI narrative.",
    targetBuyPrice: 165,
    stopLoss: 140,
    positionSizePct: 7,
  },
  {
    ticker: "BRK-B",
    thesis:
      "Permanent capital, fortress balance sheet, optionality on cash deployment. Below 1.4× book is historically a strong long-term entry.",
    targetBuyPrice: 380,
    stopLoss: 320,
    positionSizePct: 8,
  },
];

export async function POST() {
  const db = await getDb();
  let inserted = 0;
  let updated = 0;
  for (const s of SEED) {
    const existing = await db
      .select()
      .from(schema.watchlist)
      .where(eq(schema.watchlist.ticker, s.ticker))
      .get();
    if (existing) {
      await db.update(schema.watchlist)
        .set({
          thesis: s.thesis,
          targetBuyPrice: s.targetBuyPrice,
          stopLoss: s.stopLoss,
          positionSizePct: s.positionSizePct,
        })
        .where(eq(schema.watchlist.id, existing.id))
        .run();
      updated++;
    } else {
      await db.insert(schema.watchlist)
        .values({
          ticker: s.ticker,
          exchange: exchangeFromTicker(s.ticker),
          thesis: s.thesis,
          targetBuyPrice: s.targetBuyPrice,
          stopLoss: s.stopLoss,
          positionSizePct: s.positionSizePct,
          createdAt: Date.now(),
        })
        .run();
      inserted++;
    }
  }
  return NextResponse.json({ ok: true, inserted, updated });
}
