import { getDb, schema } from "../src/lib/db";
import { and, eq } from "drizzle-orm";
import { exchangeFromTicker } from "../src/lib/utils";

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

/**
 * Sample trade(s) seeded into portfolio_trades. Uses a fixed UTC tradeDate so
 * re-running the seed is idempotent — we look up by ticker+side+tradeDate and
 * update notes/qty/price/fees if they drift, otherwise skip.
 */
const SEED_TRADES: Array<{
  ticker: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
  tradeDate: number;
  notes: string;
}> = [
  {
    ticker: "AAPL",
    side: "BUY",
    quantity: 10,
    price: 150,
    fees: 0,
    tradeDate: Date.UTC(2026, 4, 1), // 2026-05-01
    notes: "Sample trade seeded by `npm run seed`.",
  },
];

(async () => {
  const db = await getDb();

  // ── Watchlist ────────────────────────────────────────────────
  let wlInserted = 0;
  let wlUpdated = 0;
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
      wlUpdated++;
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
      wlInserted++;
    }
  }
  console.log(`Seeded watchlist: ${wlInserted} inserted, ${wlUpdated} updated.`);

  // ── Portfolio trades ─────────────────────────────────────────
  let trInserted = 0;
  let trUpdated = 0;
  for (const t of SEED_TRADES) {
    try {
      console.log(`Inserting trade: ${t.ticker} ${t.side} ${t.quantity}@${t.price}…`);

      // Idempotency: match on (ticker, side, tradeDate). A trade is a unique event,
      // so we treat that triple as the natural key for the seed.
      const existing = await db
        .select()
        .from(schema.portfolioTrades)
        .where(
          and(
            eq(schema.portfolioTrades.ticker, t.ticker),
            eq(schema.portfolioTrades.side, t.side),
            eq(schema.portfolioTrades.tradeDate, t.tradeDate)
          )
        )
        .get();

      if (existing) {
        await db.update(schema.portfolioTrades)
          .set({
            quantity: t.quantity,
            price: t.price,
            fees: t.fees,
            notes: t.notes,
          })
          .where(eq(schema.portfolioTrades.id, existing.id))
          .run();
        trUpdated++;
        console.log(`  Trade already existed (id=${existing.id}); refreshed in place.`);
      } else {
        await db.insert(schema.portfolioTrades)
          .values({
            ticker: t.ticker,
            exchange: exchangeFromTicker(t.ticker),
            side: t.side,
            quantity: t.quantity,
            price: t.price,
            fees: t.fees,
            tradeDate: t.tradeDate,
            notes: t.notes,
            createdAt: Date.now(),
          })
          .run();
        const inserted = await db
          .select()
          .from(schema.portfolioTrades)
          .where(
            and(
              eq(schema.portfolioTrades.ticker, t.ticker),
              eq(schema.portfolioTrades.side, t.side),
              eq(schema.portfolioTrades.tradeDate, t.tradeDate)
            )
          )
          .get();
        trInserted++;
        console.log(`  Trade inserted, id=${inserted?.id ?? "?"}.`);
      }
    } catch (err) {
      console.error(`  Failed to seed trade ${t.ticker} ${t.side}:`);
      console.error(err instanceof Error ? err.stack ?? err.message : err);
      throw err;
    }
  }
  console.log(`Seeded portfolio_trades: ${trInserted} inserted, ${trUpdated} updated.`);

  // ── Demo alert ───────────────────────────────────────────────
  // Idempotent: keyed on (ticker, conditionType, threshold).
  const demoAlert = {
    userEmail: "demo@grahamscreener.com",
    ticker: "AAPL",
    exchange: "US" as const,
    conditionType: "target_buy" as const,
    threshold: 100,
    notes: "Sample alert seeded by `npm run seed`. Target buy well below market — unlikely to fire.",
  };

  const existingAlert = await db
    .select()
    .from(schema.alerts)
    .where(
      and(
        eq(schema.alerts.ticker, demoAlert.ticker),
        eq(schema.alerts.conditionType, demoAlert.conditionType)
      )
    )
    .get();

  if (existingAlert) {
    console.log(`Demo alert already exists (id=${existingAlert.id}); skipping.`);
  } else {
    await db.insert(schema.alerts)
      .values({
        ...demoAlert,
        active: 1,
        createdAt: Date.now(),
      })
      .run();
    console.log("Seeded demo alert: AAPL target_buy @ $100.");
  }
})();
