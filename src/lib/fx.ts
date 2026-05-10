/**
 * Foreign exchange rate service.
 *
 * Fetches live rates from Yahoo Finance (e.g. AUDUSD=X) with a 24h SQLite cache.
 * Falls back to hardcoded rates when Yahoo is unavailable.
 */

import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isDemoMode } from "@/lib/demo";
import type { BaseCurrency } from "@/lib/settings";

/* ------------------------------------------------------------------ */
/*  Hardcoded fallback rates (vs USD, approximate May 2026)            */
/* ------------------------------------------------------------------ */

const FALLBACK_RATES: Record<string, number> = {
  AUDUSD: 0.65,
  INRUSD: 0.012,
  GBPUSD: 1.27,
  EURUSD: 1.09,
  USDAUD: 1.54,
  USDINR: 83.5,
  USDGBP: 0.79,
  USDEUR: 0.92,
  AUDEUR: 0.60,
  AUDINR: 54.3,
  AUDGBP: 0.51,
  INREUR: 0.011,
  INRGBP: 0.0095,
  INRAUD: 0.018,
  GBPEUR: 0.86,
  GBPAUD: 1.96,
  GBPINR: 105.0,
  EURAUD: 1.68,
  EURINR: 91.0,
  EURGBP: 1.16,
};

/** Cache TTL — 24 hours. */
const FX_CACHE_TTL = 1000 * 60 * 60 * 24;

/* ------------------------------------------------------------------ */
/*  Yahoo pair ticker helper                                           */
/* ------------------------------------------------------------------ */

/** Build the Yahoo Finance ticker for an FX pair, e.g. "AUDUSD=X". */
function yahooFxTicker(from: string, to: string): string {
  return `${from}${to}=X`;
}

/* ------------------------------------------------------------------ */
/*  Fetch a single FX rate                                             */
/* ------------------------------------------------------------------ */

/**
 * Get the exchange rate from `from` to `to`.
 * Returns how many `to` units 1 `from` unit buys (e.g. AUDUSD = 0.65 means 1 AUD = 0.65 USD).
 */
export async function getFxRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const cacheKey = `fx_${from}${to}`;

  // Check SQLite cache
  const db = await getDb();
  const cached = await db
    .select()
    .from(schema.snapshotCache)
    .where(eq(schema.snapshotCache.ticker, cacheKey))
    .get();

  if (cached && Date.now() - cached.fetchedAt < FX_CACHE_TTL) {
    try {
      const rate = Number(cached.payload);
      if (rate > 0) return rate;
    } catch {}
  }

  // Demo mode — use fallback
  if (isDemoMode()) {
    return getFallbackRate(from, to);
  }

  // Fetch from Yahoo
  try {
    const ticker = yahooFxTicker(from, to);
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`Yahoo FX ${resp.status}`);
    const json = await resp.json();
    const price =
      json?.chart?.result?.[0]?.meta?.regularMarketPrice ??
      json?.chart?.result?.[0]?.meta?.previousClose;
    if (typeof price === "number" && price > 0) {
      // Cache the result
      await db.insert(schema.snapshotCache)
        .values({ ticker: cacheKey, exchange: "FX", payload: String(price), fetchedAt: Date.now() })
        .onConflictDoUpdate({
          target: schema.snapshotCache.ticker,
          set: { payload: String(price), fetchedAt: Date.now(), exchange: "FX" },
        })
        .run();
      return price;
    }
  } catch {
    // Fall through to fallback
  }

  // Use cached value even if stale
  if (cached) {
    const rate = Number(cached.payload);
    if (rate > 0) return rate;
  }

  return getFallbackRate(from, to);
}

/** Look up a fallback rate from the hardcoded table. */
function getFallbackRate(from: string, to: string): number {
  const direct = FALLBACK_RATES[`${from}${to}`];
  if (direct) return direct;
  // Try inverse
  const inverse = FALLBACK_RATES[`${to}${from}`];
  if (inverse) return 1 / inverse;
  // Two-hop via USD
  if (from !== "USD" && to !== "USD") {
    const toUsd = FALLBACK_RATES[`${from}USD`] ?? (1 / (FALLBACK_RATES[`USD${from}`] ?? 1));
    const fromUsd = FALLBACK_RATES[`USD${to}`] ?? (1 / (FALLBACK_RATES[`${to}USD`] ?? 1));
    return toUsd * fromUsd;
  }
  return 1;
}

/* ------------------------------------------------------------------ */
/*  Batch FX rates for portfolio conversion                            */
/* ------------------------------------------------------------------ */

/** Map of source currency → rate to base currency. */
export type FxRateMap = Record<string, number>;

/**
 * Get FX rates for converting from each source currency to the base currency.
 * Sources are the unique currencies of portfolio positions.
 */
export async function getPortfolioFxRates(
  sourceCurrencies: string[],
  baseCurrency: BaseCurrency
): Promise<FxRateMap> {
  const unique = Array.from(new Set(sourceCurrencies));
  const rates: FxRateMap = {};

  await Promise.all(
    unique.map(async (src) => {
      rates[src] = await getFxRate(src, baseCurrency);
    })
  );

  return rates;
}

/**
 * Convert an amount from one currency to another using a rate map.
 * If no rate found, returns the original amount (no conversion).
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  rates: FxRateMap
): number {
  const rate = rates[fromCurrency];
  if (!rate) return amount;
  return amount * rate;
}
