import type { Trade } from "./db/schema";

export interface Lot {
  quantity: number;
  costPerShare: number;
  tradeDate: number;
}

export interface PositionSummary {
  ticker: string;
  exchange: string;
  quantityHeld: number;
  avgCost: number;
  costBasis: number;
  realizedPnL: number;
  totalFees: number;
  firstBuy: number | null;
  lastTrade: number;
}

/**
 * FIFO matcher. Walks through trades chronologically; sells consume the oldest lots first
 * and accumulate realized P&L. Returns the surviving open lots and the realized total.
 */
export function buildPositionsFIFO(trades: Trade[]): Map<string, PositionSummary> {
  const grouped = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = grouped.get(t.ticker) ?? [];
    arr.push(t);
    grouped.set(t.ticker, arr);
  }

  const result = new Map<string, PositionSummary>();
  grouped.forEach((list, ticker) => {
    list.sort((a: Trade, b: Trade) => a.tradeDate - b.tradeDate);
    const lots: Lot[] = [];
    let realized = 0;
    let totalFees = 0;
    let firstBuy: number | null = null;
    let lastTrade = 0;
    let exchange = list[0].exchange;
    for (const t of list) {
      lastTrade = Math.max(lastTrade, t.tradeDate);
      totalFees += t.fees ?? 0;
      exchange = t.exchange;
      if (t.side === "BUY") {
        if (firstBuy === null) firstBuy = t.tradeDate;
        lots.push({ quantity: t.quantity, costPerShare: t.price, tradeDate: t.tradeDate });
      } else {
        let remaining = t.quantity;
        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0];
          const used = Math.min(lot.quantity, remaining);
          realized += used * (t.price - lot.costPerShare);
          lot.quantity -= used;
          remaining -= used;
          if (lot.quantity <= 1e-9) lots.shift();
        }
        // If sells exceed buys (short or data error), we just stop and ignore the surplus.
      }
    }
    const quantityHeld = lots.reduce((s, l) => s + l.quantity, 0);
    const costBasis = lots.reduce((s, l) => s + l.quantity * l.costPerShare, 0);
    const avgCost = quantityHeld > 0 ? costBasis / quantityHeld : 0;
    result.set(ticker, {
      ticker,
      exchange,
      quantityHeld,
      avgCost,
      costBasis,
      realizedPnL: realized,
      totalFees,
      firstBuy,
      lastTrade,
    });
  });
  return result;
}
