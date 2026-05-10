import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  exchange: text("exchange").notNull(),
  thesis: text("thesis").notNull().default(""),
  targetBuyPrice: real("target_buy_price"),
  stopLoss: real("stop_loss"),
  positionSizePct: real("position_size_pct"),
  createdAt: integer("created_at").notNull(),
});

export const portfolioTrades = sqliteTable("portfolio_trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  exchange: text("exchange").notNull(),
  side: text("side", { enum: ["BUY", "SELL"] }).notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  fees: real("fees").notNull().default(0),
  tradeDate: integer("trade_date").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const snapshotCache = sqliteTable("snapshot_cache", {
  ticker: text("ticker").primaryKey(),
  exchange: text("exchange").notNull(),
  payload: text("payload").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type WatchlistInsert = typeof watchlist.$inferInsert;
export type Trade = typeof portfolioTrades.$inferSelect;
export type TradeInsert = typeof portfolioTrades.$inferInsert;
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  ticker: text("ticker").notNull(),
  exchange: text("exchange").notNull(),
  conditionType: text("condition_type", {
    enum: ["target_buy", "stop_loss", "pct_change_up", "pct_change_down"],
  }).notNull(),
  threshold: real("threshold").notNull(),
  active: integer("active").notNull().default(1),
  lastFiredAt: integer("last_fired_at"),
  lastCheckedAt: integer("last_checked_at"),
  referencePrice: real("reference_price"),
  createdAt: integer("created_at").notNull(),
  notes: text("notes"),
});

export type Snapshot = typeof snapshotCache.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type AlertInsert = typeof alerts.$inferInsert;
