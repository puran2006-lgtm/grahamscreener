import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

/**
 * Database driver: @libsql/client (async, Turso-compatible).
 *
 * Local dev:  connects to file:./data/valuelens.db  (same SQLite format)
 * Production: connects to TURSO_DATABASE_URL with TURSO_AUTH_TOKEN
 *
 * All Drizzle calls are async — every .all(), .get(), .run() returns a Promise.
 *
 * @see /docs/12_DEPLOY.md for deployment instructions.
 */

const isTurso = !!process.env.TURSO_DATABASE_URL;

function buildClient() {
  if (isTurso) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  // Local file mode
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return createClient({
    url: `file:${path.join(dataDir, "valuelens.db")}`,
  });
}

let _db: LibSQLDatabase<typeof schema> | null = null;
let _initPromise: Promise<LibSQLDatabase<typeof schema>> | null = null;

/**
 * Initialise the database: create tables, set pragmas, return drizzle instance.
 * Safe to call multiple times — returns the cached instance after first init.
 */
async function init(): Promise<LibSQLDatabase<typeof schema>> {
  if (_db) return _db;

  const client = buildClient();
  const d = drizzle(client, { schema });

  // Pragmas (best-effort — Turso ignores some)
  try { await client.execute("PRAGMA journal_mode = WAL"); } catch {}
  try { await client.execute("PRAGMA foreign_keys = ON"); } catch {}
  try { await client.execute("PRAGMA busy_timeout = 5000"); } catch {}

  // Schema creation — one statement per execute (libsql doesn't support multi-statement exec)
  const stmts = [
    `CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL UNIQUE,
      exchange TEXT NOT NULL,
      thesis TEXT NOT NULL DEFAULT '',
      target_buy_price REAL,
      stop_loss REAL,
      position_size_pct REAL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS portfolio_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      exchange TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      fees REAL NOT NULL DEFAULT 0,
      trade_date INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_trades_ticker ON portfolio_trades(ticker)`,
    `CREATE TABLE IF NOT EXISTS snapshot_cache (
      ticker TEXT PRIMARY KEY,
      exchange TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      ticker TEXT NOT NULL,
      exchange TEXT NOT NULL,
      condition_type TEXT NOT NULL CHECK (condition_type IN ('target_buy', 'stop_loss', 'pct_change_up', 'pct_change_down')),
      threshold REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      last_fired_at INTEGER,
      last_checked_at INTEGER,
      reference_price REAL,
      created_at INTEGER NOT NULL,
      notes TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_ticker ON alerts(ticker)`,
  ];

  for (const sql of stmts) {
    await client.execute(sql);
  }

  _db = d;
  return d;
}

/**
 * Get the database instance. Returns a Promise on first call (initialisation),
 * then the cached instance on subsequent calls.
 *
 * Usage:  const database = await getDb();
 */
export async function getDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (_db) return _db;
  if (!_initPromise) _initPromise = init();
  return _initPromise;
}

export { schema };
export type { LibSQLDatabase };
