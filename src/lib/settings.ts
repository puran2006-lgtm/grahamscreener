/**
 * Valuation settings — configurable constants for EPV and Graham Growth.
 * Stored in the `settings` SQLite table. Falls back to defaults when unset.
 */

import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  Defaults (Graham/Greenwald conservative)                           */
/* ------------------------------------------------------------------ */

export interface ValuationSettings {
  /** WACC / discount rate for EPV, as decimal (default 0.09 = 9%) */
  wacc: number;
  /** Tax rate for EPV, as decimal (default 0.25 = 25%) */
  taxRate: number;
  /** AAA-corp-bond yield for Graham Growth, as percentage (default 4.5) */
  aaaYield: number;
  /** Base multiplier for Graham Growth (default 8.5 — Graham's no-growth P/E) */
  baseMultiplier: number;
  /** Max growth cap for Graham Growth, as percentage (default 15) */
  growthCap: number;
}

export const DEFAULTS: Readonly<ValuationSettings> = {
  wacc: 0.09,
  taxRate: 0.25,
  aaaYield: 4.5,
  baseMultiplier: 8.5,
  growthCap: 15,
};

/** Supported base currencies for portfolio conversion. */
export const BASE_CURRENCIES = ["USD", "AUD", "INR", "GBP", "EUR"] as const;
export type BaseCurrency = (typeof BASE_CURRENCIES)[number];

/* ------------------------------------------------------------------ */
/*  Read / write from SQLite                                           */
/* ------------------------------------------------------------------ */

const SETTINGS_KEY = "valuation";

/** Read settings from DB, falling back to defaults for any missing key. */
export async function getSettings(): Promise<ValuationSettings> {
  const db = await getDb();
  const row = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, SETTINGS_KEY))
    .get();

  if (!row) return { ...DEFAULTS };

  try {
    const parsed = JSON.parse(row.value) as Partial<ValuationSettings>;
    return {
      wacc: parsed.wacc ?? DEFAULTS.wacc,
      taxRate: parsed.taxRate ?? DEFAULTS.taxRate,
      aaaYield: parsed.aaaYield ?? DEFAULTS.aaaYield,
      baseMultiplier: parsed.baseMultiplier ?? DEFAULTS.baseMultiplier,
      growthCap: parsed.growthCap ?? DEFAULTS.growthCap,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist settings to DB. */
export async function saveSettings(s: ValuationSettings): Promise<void> {
  const db = await getDb();
  const value = JSON.stringify(s);
  const now = Date.now();
  await db.insert(schema.settings)
    .values({ key: SETTINGS_KEY, value, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value, updatedAt: now },
    })
    .run();
}

/* ------------------------------------------------------------------ */
/*  Base currency setting                                              */
/* ------------------------------------------------------------------ */

const CURRENCY_KEY = "baseCurrency";

/** Get the user's selected base currency (default USD). */
export async function getBaseCurrency(): Promise<BaseCurrency> {
  const db = await getDb();
  const row = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, CURRENCY_KEY))
    .get();
  if (!row) return "USD";
  const val = row.value as BaseCurrency;
  return BASE_CURRENCIES.includes(val) ? val : "USD";
}

/** Save the user's selected base currency. */
export async function saveBaseCurrency(currency: BaseCurrency): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.insert(schema.settings)
    .values({ key: CURRENCY_KEY, value: currency, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: currency, updatedAt: now },
    })
    .run();
}
