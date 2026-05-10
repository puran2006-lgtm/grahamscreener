import type { Fundamentals } from "../yahoo/types";
import type { ValuationSettings } from "../settings";
import { DEFAULTS } from "../settings";

export interface ValuationResult {
  value: number | null;
  formula: string;
  inputs: Record<string, number | null | undefined>;
  notes?: string;
}

/**
 * Graham Number = sqrt(22.5 * EPS * BVPS)
 * The classic conservative ceiling for "defensive" stocks per Benjamin Graham.
 * 22.5 = max P/E (15) * max P/B (1.5).
 */
export function grahamNumber(f: Fundamentals): ValuationResult {
  const eps = f.trailingEps;
  const bvps = f.bookValuePerShare;
  const inputs = { eps, bvps };
  if (eps === undefined || bvps === undefined || eps <= 0 || bvps <= 0) {
    return {
      value: null,
      formula: "√(22.5 × EPS × BVPS)",
      inputs,
      notes: "Requires positive trailing EPS and book value per share.",
    };
  }
  const value = Math.sqrt(22.5 * eps * bvps);
  return {
    value,
    formula: "√(22.5 × EPS × BVPS)",
    inputs,
  };
}

/**
 * Net-Net (NCAV per share) = (Current Assets − Total Liabilities) / Shares Outstanding.
 * A stricter Graham ceiling — buying below NCAV gives a wide margin even at liquidation.
 */
export function ncavPerShare(f: Fundamentals): ValuationResult {
  const ca = f.totalCurrentAssets;
  const tl = f.totalLiabilities;
  const shares = f.sharesOutstanding;
  const inputs = { totalCurrentAssets: ca, totalLiabilities: tl, sharesOutstanding: shares };
  if (ca === undefined || tl === undefined || !shares || shares <= 0) {
    return {
      value: null,
      formula: "(Current Assets − Total Liabilities) / Shares Outstanding",
      inputs,
      notes: "Requires balance-sheet totals and share count.",
    };
  }
  const value = (ca - tl) / shares;
  return {
    value,
    formula: "(Current Assets − Total Liabilities) / Shares Outstanding",
    inputs,
  };
}

/**
 * Earnings Power Value (Bruce Greenwald, simplified):
 *   EPV = (Normalised Earnings × (1 − tax)) / Cost of Capital  (we use the EBITDA-based form)
 *   per-share = (EBITDA × (1 − tax)) / WACC / Shares
 * No reliable WACC is available unauthenticated, so we use a fixed 9% discount rate
 * (a defensible long-run equity premium for liquid large-caps) and 25% tax. EPV ignores growth.
 */
export function epvPerShare(f: Fundamentals, s?: Partial<ValuationSettings>): ValuationResult {
  const ebitda = f.ebitda;
  const shares = f.sharesOutstanding;
  const tax = s?.taxRate ?? DEFAULTS.taxRate;
  const wacc = s?.wacc ?? DEFAULTS.wacc;
  const inputs = { ebitda, sharesOutstanding: shares, taxRate: tax, discountRate: wacc };
  if (ebitda === undefined || ebitda <= 0 || !shares || shares <= 0) {
    return {
      value: null,
      formula: "(EBITDA × (1 − tax)) / WACC / Shares",
      inputs,
      notes: `Requires positive EBITDA and share count. Tax ${(tax * 100).toFixed(0)}%, WACC ${(wacc * 100).toFixed(0)}%.`,
    };
  }
  const value = (ebitda * (1 - tax)) / wacc / shares;
  return {
    value,
    formula: "(EBITDA × (1 − tax)) / WACC / Shares",
    inputs,
    notes: `Tax ${(tax * 100).toFixed(0)}%, WACC ${(wacc * 100).toFixed(0)}%. Greenwald-style — ignores growth.`,
  };
}

/**
 * Graham Growth Formula (revised 1962):
 *   V = EPS × (8.5 + 2g) × 4.4 / Y
 * where g = expected annual EPS growth (cap at 15%), Y = current AAA-corp-bond yield.
 * We use a fixed Y = 4.5% (long-run global proxy) when no live yield is available.
 * If Yahoo's earningsGrowth is missing, we default g to 5% (assumes mature large-cap).
 */
export function grahamGrowth(f: Fundamentals, s?: Partial<ValuationSettings>): ValuationResult {
  const eps = f.trailingEps;
  const aaaYield = s?.aaaYield ?? DEFAULTS.aaaYield;
  const baseMult = s?.baseMultiplier ?? DEFAULTS.baseMultiplier;
  const gCap = s?.growthCap ?? DEFAULTS.growthCap;
  const rawG = f.earningsGrowth;
  const g = rawG === undefined ? 5 : Math.max(-5, Math.min(gCap, rawG * 100));
  const inputs = { eps, growthPct: g, aaaYieldPct: aaaYield, baseMultiplier: baseMult };
  if (eps === undefined || eps <= 0) {
    return {
      value: null,
      formula: `EPS × (${baseMult} + 2g) × 4.4 / Y`,
      inputs,
      notes: "Requires positive trailing EPS.",
    };
  }
  const value = (eps * (baseMult + 2 * g) * 4.4) / aaaYield;
  return {
    value,
    formula: `EPS × (${baseMult} + 2g) × 4.4 / Y`,
    inputs,
    notes: `g capped at ${gCap}%, Y = ${aaaYield}% (AAA proxy).`,
  };
}

export function marginOfSafety(price: number | undefined, intrinsic: number | null): number | null {
  if (!price || !intrinsic) return null;
  return (intrinsic - price) / intrinsic;
}

export interface ValuationBundle {
  graham: ValuationResult;
  ncav: ValuationResult;
  epv: ValuationResult;
  growth: ValuationResult;
  mos: {
    graham: number | null;
    ncav: number | null;
    epv: number | null;
    growth: number | null;
  };
}

export function computeValuations(f: Fundamentals, s?: Partial<ValuationSettings>): ValuationBundle {
  const graham = grahamNumber(f);
  const ncav = ncavPerShare(f);
  const epv = epvPerShare(f, s);
  const growth = grahamGrowth(f, s);
  return {
    graham,
    ncav,
    epv,
    growth,
    mos: {
      graham: marginOfSafety(f.price, graham.value),
      ncav: marginOfSafety(f.price, ncav.value),
      epv: marginOfSafety(f.price, epv.value),
      growth: marginOfSafety(f.price, growth.value),
    },
  };
}
