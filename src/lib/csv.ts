/**
 * CSV import/export for portfolio trades.
 *
 * Supports auto-detection of broker CSV formats:
 *   - GrahamScreener (round-trip)
 *   - Stake (AU broker for US stocks)
 *   - CommSec (AU broker for ASX stocks)
 *   - Interactive Brokers (global)
 *   - Zerodha (Indian broker for BSE/NSE)
 *
 * Falls back to manual column-mapping when headers don't match.
 */

import Papa from "papaparse";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A single trade row ready for DB insertion (matches /api/portfolio POST). */
export interface CsvTrade {
  ticker: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
  tradeDate: number; // epoch ms
  notes: string;
}

export type BrokerFormat =
  | "grahamscreener"
  | "stake"
  | "commsec"
  | "interactivebrokers"
  | "zerodha"
  | "unknown";

export interface ParseResult {
  broker: BrokerFormat;
  trades: CsvTrade[];
  errors: string[];
  /** Raw headers from the CSV for manual mapping fallback */
  headers: string[];
  /** Raw data rows (string[][]) when broker=unknown, for manual mapping */
  rawRows: string[][];
}

/* ------------------------------------------------------------------ */
/*  Header patterns for each broker                                    */
/* ------------------------------------------------------------------ */

/** Check if a set of lowercase headers matches a broker pattern. */
function detectBroker(headers: string[]): BrokerFormat {
  const lc = new Set(headers.map((h) => h.toLowerCase().trim()));

  // GrahamScreener own format (round-trip)
  if (lc.has("ticker") && lc.has("side") && lc.has("quantity") && lc.has("price") && lc.has("date")) {
    return "grahamscreener";
  }

  // Stake: "Symbol", "Side", "Qty", "Price", "Brokerage", "Date" (US stocks via AU app)
  if (lc.has("symbol") && lc.has("side") && lc.has("qty") && lc.has("brokerage")) {
    return "stake";
  }

  // CommSec: "Date", "Reference", "Type" (or "Details"), "Quantity", "Price", "Brokerage"
  if (lc.has("reference") && lc.has("quantity") && lc.has("brokerage") && lc.has("details")) {
    return "commsec";
  }

  // Interactive Brokers: "Symbol", "Date/Time", "Quantity", "T. Price", "Comm/Fee"
  if ((lc.has("symbol") || lc.has("conid")) && lc.has("t. price") && lc.has("comm/fee")) {
    return "interactivebrokers";
  }

  // Zerodha: "symbol", "trade_type", "quantity", "price", "trade_date"
  if (lc.has("trade_type") && lc.has("trade_date") && lc.has("symbol")) {
    return "zerodha";
  }

  return "unknown";
}

/* ------------------------------------------------------------------ */
/*  Parsing helpers                                                    */
/* ------------------------------------------------------------------ */

/** Parse a date string or epoch number into epoch ms. */
function parseDate(raw: string): number {
  if (!raw) return Date.now();
  // Already epoch ms
  const num = Number(raw);
  if (!isNaN(num) && num > 1e12) return num;
  // Already epoch seconds
  if (!isNaN(num) && num > 1e9) return num * 1000;
  // Try ISO or common date formats
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.getTime();
  // DD/MM/YYYY (AU format)
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const d2 = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    if (!isNaN(d2.getTime())) return d2.getTime();
  }
  return Date.now();
}

/** Normalize side string to BUY or SELL. */
function parseSide(raw: string): "BUY" | "SELL" {
  const u = raw.toUpperCase().trim();
  if (u === "SELL" || u === "S" || u === "SLD" || u === "SOLD") return "SELL";
  return "BUY";
}

/** Parse a number, stripping currency symbols and commas. */
function parseNum(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$,₹A]/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : Math.abs(n);
}

/** Get field from a row object, case-insensitive. */
function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    for (const [rk, rv] of Object.entries(row)) {
      if (rk.toLowerCase().trim() === k.toLowerCase()) return rv ?? "";
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/*  Broker-specific parsers                                            */
/* ------------------------------------------------------------------ */

function parseGrahamScreener(rows: Record<string, string>[]): { trades: CsvTrade[]; errors: string[] } {
  const trades: CsvTrade[] = [];
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ticker = getField(r, "ticker").toUpperCase();
    if (!ticker) { errors.push(`Row ${i + 1}: missing ticker`); continue; }
    const qty = parseNum(getField(r, "quantity"));
    if (qty <= 0) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    const price = parseNum(getField(r, "price"));
    if (price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
    trades.push({
      ticker,
      side: parseSide(getField(r, "side")),
      quantity: qty,
      price,
      fees: parseNum(getField(r, "fees")),
      tradeDate: parseDate(getField(r, "date")),
      notes: getField(r, "notes"),
    });
  }
  return { trades, errors };
}

function parseStake(rows: Record<string, string>[]): { trades: CsvTrade[]; errors: string[] } {
  const trades: CsvTrade[] = [];
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ticker = getField(r, "symbol").toUpperCase();
    if (!ticker) { errors.push(`Row ${i + 1}: missing symbol`); continue; }
    const qty = parseNum(getField(r, "qty", "quantity"));
    if (qty <= 0) { errors.push(`Row ${i + 1}: invalid qty`); continue; }
    const price = parseNum(getField(r, "price"));
    if (price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
    trades.push({
      ticker,
      side: parseSide(getField(r, "side")),
      quantity: qty,
      price,
      fees: parseNum(getField(r, "brokerage", "fee", "fees")),
      tradeDate: parseDate(getField(r, "date")),
      notes: `Imported from Stake`,
    });
  }
  return { trades, errors };
}

function parseCommSec(rows: Record<string, string>[]): { trades: CsvTrade[]; errors: string[] } {
  const trades: CsvTrade[] = [];
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // CommSec "Details" field contains something like "B 100 CBA @ $110.50"
    const details = getField(r, "details");
    const ticker = getField(r, "code", "security code", "stock code").toUpperCase() ||
      extractTickerFromDetails(details);
    if (!ticker) { errors.push(`Row ${i + 1}: can't extract ticker`); continue; }
    const qty = parseNum(getField(r, "quantity", "qty"));
    if (qty <= 0) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    const price = parseNum(getField(r, "price", "unit price", "average price"));
    if (price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
    // CommSec Type field: "B" = buy, "S" = sell
    const sideRaw = getField(r, "type", "b/s") || (details.startsWith("B") ? "B" : "S");
    trades.push({
      ticker: ticker.endsWith(".AX") ? ticker : `${ticker}.AX`,
      side: parseSide(sideRaw === "B" ? "BUY" : "SELL"),
      quantity: qty,
      price,
      fees: parseNum(getField(r, "brokerage", "fees")),
      tradeDate: parseDate(getField(r, "date")),
      notes: `Imported from CommSec`,
    });
  }
  return { trades, errors };
}

function parseInteractiveBrokers(rows: Record<string, string>[]): { trades: CsvTrade[]; errors: string[] } {
  const trades: CsvTrade[] = [];
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ticker = getField(r, "symbol").toUpperCase();
    if (!ticker) { errors.push(`Row ${i + 1}: missing symbol`); continue; }
    const qty = parseNum(getField(r, "quantity"));
    if (qty <= 0) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    const price = parseNum(getField(r, "t. price", "price"));
    if (price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
    // IB: negative quantity = sell
    const rawQty = getField(r, "quantity");
    const isSell = rawQty.trim().startsWith("-");
    trades.push({
      ticker,
      side: isSell ? "SELL" : "BUY",
      quantity: qty,
      price,
      fees: parseNum(getField(r, "comm/fee", "commission", "ibcommission")),
      tradeDate: parseDate(getField(r, "date/time", "tradetime", "date")),
      notes: `Imported from Interactive Brokers`,
    });
  }
  return { trades, errors };
}

function parseZerodha(rows: Record<string, string>[]): { trades: CsvTrade[]; errors: string[] } {
  const trades: CsvTrade[] = [];
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let ticker = getField(r, "symbol", "tradingsymbol").toUpperCase();
    if (!ticker) { errors.push(`Row ${i + 1}: missing symbol`); continue; }
    const qty = parseNum(getField(r, "quantity", "qty"));
    if (qty <= 0) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    const price = parseNum(getField(r, "price", "average_price"));
    if (price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
    // Zerodha exchange: BSE or NSE
    const exch = getField(r, "exchange").toUpperCase();
    if (exch === "BSE") ticker = `${ticker}.BO`;
    else ticker = `${ticker}.NS`; // default to NSE
    trades.push({
      ticker,
      side: parseSide(getField(r, "trade_type", "order_type", "type")),
      quantity: qty,
      price,
      fees: parseNum(getField(r, "charges", "brokerage", "fees")),
      tradeDate: parseDate(getField(r, "trade_date", "order_date", "date")),
      notes: `Imported from Zerodha`,
    });
  }
  return { trades, errors };
}

/** Extract a ticker code from a CommSec "Details" string like "B 100 CBA @ $110.50". */
function extractTickerFromDetails(details: string): string {
  const match = details.match(/[BS]\s+\d+\s+([A-Z0-9]+)/);
  return match ? match[1] : "";
}

/* ------------------------------------------------------------------ */
/*  Manual mapping parser (for unknown brokers)                        */
/* ------------------------------------------------------------------ */

export interface ColumnMapping {
  ticker: string;
  side: string;
  quantity: string;
  price: string;
  fees?: string;
  date?: string;
  notes?: string;
}

export function parseWithMapping(
  rows: string[][],
  headers: string[],
  mapping: ColumnMapping
): { trades: CsvTrade[]; errors: string[] } {
  const trades: CsvTrade[] = [];
  const errors: string[] = [];
  const idx = (col: string) => headers.findIndex((h) => h === col);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ti = idx(mapping.ticker);
    const si = idx(mapping.side);
    const qi = idx(mapping.quantity);
    const pi = idx(mapping.price);
    const fi = mapping.fees ? idx(mapping.fees) : -1;
    const di = mapping.date ? idx(mapping.date) : -1;
    const ni = mapping.notes ? idx(mapping.notes) : -1;

    const ticker = ti >= 0 ? (r[ti] ?? "").toUpperCase() : "";
    if (!ticker) { errors.push(`Row ${i + 1}: missing ticker`); continue; }
    const qty = qi >= 0 ? parseNum(r[qi] ?? "") : 0;
    if (qty <= 0) { errors.push(`Row ${i + 1}: invalid quantity`); continue; }
    const price = pi >= 0 ? parseNum(r[pi] ?? "") : 0;
    if (price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }

    trades.push({
      ticker,
      side: si >= 0 ? parseSide(r[si] ?? "BUY") : "BUY",
      quantity: qty,
      price,
      fees: fi >= 0 ? parseNum(r[fi] ?? "") : 0,
      tradeDate: di >= 0 ? parseDate(r[di] ?? "") : Date.now(),
      notes: ni >= 0 ? (r[ni] ?? "") : "Imported from CSV",
    });
  }
  return { trades, errors };
}

/* ------------------------------------------------------------------ */
/*  Main parse entry point                                             */
/* ------------------------------------------------------------------ */

export function parseCsvText(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const broker = detectBroker(headers);

  // For unknown broker, return raw rows so the UI can show column-mapping
  if (broker === "unknown") {
    const rawResult = Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: true,
    });
    const rawHeaders = rawResult.data[0] ?? [];
    const rawRows = rawResult.data.slice(1);
    return {
      broker: "unknown",
      trades: [],
      errors: [],
      headers: rawHeaders,
      rawRows,
    };
  }

  let parsed: { trades: CsvTrade[]; errors: string[] };
  switch (broker) {
    case "grahamscreener":
      parsed = parseGrahamScreener(result.data);
      break;
    case "stake":
      parsed = parseStake(result.data);
      break;
    case "commsec":
      parsed = parseCommSec(result.data);
      break;
    case "interactivebrokers":
      parsed = parseInteractiveBrokers(result.data);
      break;
    case "zerodha":
      parsed = parseZerodha(result.data);
      break;
    default:
      parsed = { trades: [], errors: ["Unknown format"] };
  }

  // Add papaparse-level errors
  const parseErrors = result.errors
    .filter((e) => e.type !== "FieldMismatch") // ignore column count mismatches
    .map((e) => `CSV parse error row ${(e.row ?? 0) + 1}: ${e.message}`);

  return {
    broker,
    trades: parsed.trades,
    errors: [...parseErrors, ...parsed.errors],
    headers,
    rawRows: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Export trades to CSV string                                        */
/* ------------------------------------------------------------------ */

export function exportTradesToCsv(
  trades: Array<{
    ticker: string;
    exchange: string;
    side: string;
    quantity: number;
    price: number;
    fees: number;
    tradeDate: number;
    notes: string;
  }>
): string {
  const rows = trades.map((t) => ({
    ticker: t.ticker,
    exchange: t.exchange,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    fees: t.fees,
    date: new Date(t.tradeDate).toISOString().slice(0, 10),
    notes: t.notes,
  }));
  return Papa.unparse(rows, {
    columns: ["ticker", "exchange", "side", "quantity", "price", "fees", "date", "notes"],
  });
}

/** Broker display name for the UI. */
export function brokerDisplayName(broker: BrokerFormat): string {
  switch (broker) {
    case "grahamscreener": return "GrahamScreener";
    case "stake": return "Stake";
    case "commsec": return "CommSec";
    case "interactivebrokers": return "Interactive Brokers";
    case "zerodha": return "Zerodha";
    default: return "Unknown";
  }
}
