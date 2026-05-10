/**
 * Demo mode support — serves fixture JSON instead of hitting Yahoo Finance.
 *
 * Enable by setting DEMO_MODE=true in .env.local (or env var).
 * Fixtures live in /fixtures at the project root.
 *
 * Coverage:
 *  - Quote (fundamentals): fixtures/quote-{TICKER}.json  (dots replaced with _)
 *  - Chart:                fixtures/chart-{TICKER}.json   (dots replaced with _)
 *  - Search:               fixtures/search-demo.json      (keyed lookup)
 */

import fs from "fs";
import path from "path";
import type { Fundamentals, ChartResponse, SearchResult } from "./yahoo/types";

const FIXTURES_DIR = path.join(process.cwd(), "fixtures");

/** True when DEMO_MODE env var is truthy ("true", "1", "yes"). */
export function isDemoMode(): boolean {
  const val = process.env.DEMO_MODE ?? "";
  return ["true", "1", "yes"].includes(val.toLowerCase());
}

function safeName(ticker: string): string {
  return ticker.replace(/\./g, "_");
}

function readFixture<T>(filename: string): T | null {
  const filepath = path.join(FIXTURES_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Returns fixture fundamentals or null if no fixture exists. */
export function demoQuote(ticker: string): Fundamentals | null {
  return readFixture<Fundamentals>(`quote-${safeName(ticker)}.json`);
}

/** Returns fixture chart data or null. */
export function demoChart(ticker: string): ChartResponse | null {
  return readFixture<ChartResponse>(`chart-${safeName(ticker)}.json`);
}

/** Returns fixture search results or null. */
export function demoSearch(query: string): SearchResult[] | null {
  const data = readFixture<Record<string, SearchResult[]>>("search-demo.json");
  if (!data) return null;
  const q = query.toUpperCase();
  // Direct key match
  if (data[q]) return data[q];
  // Partial match — search all keys
  const matches: SearchResult[] = [];
  for (const [key, results] of Object.entries(data)) {
    if (key.toUpperCase().includes(q) || q.includes(key.toUpperCase())) {
      matches.push(...results);
    }
  }
  // Also search within results by symbol or name
  if (matches.length === 0) {
    for (const results of Object.values(data)) {
      for (const r of results) {
        if (
          r.symbol?.toUpperCase().includes(q) ||
          r.longname?.toUpperCase().includes(q) ||
          r.shortname?.toUpperCase().includes(q)
        ) {
          matches.push(r);
        }
      }
    }
  }
  return matches.length > 0 ? matches : [];
}

/** Lists all tickers that have quote fixtures, grouped by exchange. */
export function demoUniverse(): Record<string, string[]> {
  if (!fs.existsSync(FIXTURES_DIR)) return {};
  const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.startsWith("quote-") && f.endsWith(".json"));
  const byExchange: Record<string, string[]> = {};
  for (const file of files) {
    const data = readFixture<Fundamentals>(file);
    if (data) {
      const ex = data.exchange ?? "US";
      if (!byExchange[ex]) byExchange[ex] = [];
      byExchange[ex].push(data.ticker);
    }
  }
  return byExchange;
}
