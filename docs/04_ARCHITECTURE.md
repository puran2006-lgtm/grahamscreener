# Architecture

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  Dashboard │ Stock Detail │ Screener │ Watchlist │ Portfolio │ Alerts │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Command Palette (cmdk) — Cmd+K global ticker search      │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ fetch()
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Node.js)                  │
│                                                                  │
│  /api/yahoo/search    → yahooSearch()                            │
│  /api/yahoo/quote     → yahooFundamentals() + snapshotCache      │
│  /api/yahoo/chart     → yahooChart()                             │
│  /api/screener        → getFundamentalsCached() × 50 tickers     │
│  /api/watchlist       → Drizzle ORM → SQLite                     │
│  /api/portfolio       → Drizzle ORM → SQLite                     │
│  /api/alerts          → Drizzle ORM → SQLite                     │
│  /api/cron/check-alerts → evaluate alerts + send email (Resend)  │
│  /api/snapshot        → batch yahooFundamentals() → SQLite       │
│  /api/seed            → insert 5 watchlist items                 │
│  /api/health          → DB stats, cache freshness, snapshot info  │
└────────────┬─────────────────────────────────┬───────────────────┘
             │                                 │
             ▼                                 ▼
┌─────────────────────────┐    ┌───────────────────────────────────┐
│   Yahoo Finance APIs    │    │   SQLite (better-sqlite3 + WAL)   │
│                         │    │   ./data/valuelens.db              │
│  fc.yahoo.com           │    │                                   │
│    → Set-Cookie (A1/A3) │    │   Tables:                         │
│                         │    │   ├── watchlist                    │
│  query2.../getcrumb     │    │   ├── portfolio_trades             │
│    → crumb token        │    │   ├── snapshot_cache               │
│                         │    │   ├── settings                     │
│                         │    │   └── alerts                       │
│                         │    │                                   │
│  query1.../v1/search    │    │   Async singleton via getDb()         │
│  query1.../v8/chart     │    │   WAL mode for concurrent reads   │
│  query2.../v10/quote    │    └───────────────────────────────────┘
│    Summary              │
└─────────────────────────┘
```

## Folder Structure

```
valuelens/
├── data/                          # SQLite database (gitignored)
│   └── valuelens.db
├── docs/                          # This documentation
├── scripts/
│   ├── seed.ts                    # CLI: seed watchlist + demo alert
│   ├── snapshot.ts                # CLI: batch-fetch Yahoo fundamentals
│   └── test-email.ts              # CLI: send test alert email via Resend
├── src/
│   ├── app/
│   │   ├── alerts/page.tsx        # Price alerts page
│   │   ├── api/
│   │   │   ├── alerts/route.ts    # CRUD for alerts (GET, POST)
│   │   │   ├── alerts/[id]/route.ts # PATCH, DELETE for single alert
│   │   │   ├── cron/check-alerts/route.ts # Vercel cron: evaluate + email
│   │   │   ├── portfolio/route.ts # CRUD for trades
│   │   │   ├── screener/route.ts  # POST: filter universe; GET: list universe
│   │   │   ├── health/route.ts     # GET: system health check
│   │   │   ├── seed/route.ts      # POST: seed watchlist
│   │   │   ├── snapshot/route.ts  # POST: batch fetch; GET: cache status
│   │   │   ├── watchlist/route.ts # CRUD for watchlist
│   │   │   └── yahoo/
│   │   │       ├── chart/route.ts # Price chart data
│   │   │       ├── quote/route.ts # Fundamentals with cache
│   │   │       └── search/route.ts# Ticker search
│   │   ├── health/page.tsx         # System health page
│   │   ├── portfolio/page.tsx     # Portfolio page
│   │   ├── screener/page.tsx      # Screener page
│   │   ├── stock/[ticker]/page.tsx# Stock detail (dynamic route)
│   │   ├── watchlist/page.tsx     # Watchlist page
│   │   ├── page.tsx               # Dashboard / home
│   │   ├── layout.tsx             # Root layout (theme, shell)
│   │   └── globals.css            # Tailwind + custom CSS
│   ├── components/
│   │   ├── alerts/
│   │   │   ├── alerts-view.tsx    # Alert table, sections, actions
│   │   │   └── alert-modal.tsx    # New/edit alert dialog
│   │   ├── charts/
│   │   │   └── price-chart.tsx    # Recharts-based price chart
│   │   ├── empty/
│   │   │   └── empty-state.tsx    # Empty state with SVG illustration
│   │   ├── layout/
│   │   │   ├── app-shell.tsx      # Sidebar + bottom nav + shortcuts
│   │   │   └── command-palette.tsx# Cmd+K command dialog (cmdk)
│   │   ├── portfolio/
│   │   │   └── portfolio-view.tsx # Portfolio trade list + positions
│   │   ├── screener/
│   │   │   └── screener-view.tsx  # Screener filters + results table
│   │   ├── stock/
│   │   │   ├── fundamentals-table.tsx # Key metrics table
│   │   │   ├── mos-bar.tsx        # Margin-of-safety bar chart
│   │   │   ├── valuation-cards.tsx# 4 valuation model cards
│   │   │   └── watchlist-toggle.tsx # Star toggle for watchlist
│   │   ├── ui/                    # shadcn/ui primitives (button, card, etc.)
│   │   ├── watchlist/
│   │   │   └── watchlist-view.tsx # Watchlist item list
│   │   ├── snapshot-panel.tsx     # Dashboard snapshot status + trigger
│   │   ├── theme-provider.tsx     # next-themes provider
│   │   ├── theme-toggle.tsx       # Dark/light toggle
│   │   └── ticker-search.tsx      # Hero search bar
│   └── lib/
│       ├── db/
│       │   ├── index.ts           # Lazy SQLite connection + schema init
│       │   └── schema.ts          # Drizzle table definitions
│       ├── universe/
│       │   └── index.ts           # 200-ticker universe + benchmark indices
│       ├── valuation/
│       │   └── index.ts           # Graham Number, NCAV, EPV, Growth formulas
│       ├── yahoo/
│       │   ├── client.ts          # yahooSearch, yahooChart, yahooFundamentals
│       │   ├── session.ts         # Cookie + crumb bootstrap + caching
│       │   └── types.ts           # TypeScript interfaces
│       ├── email.ts               # Resend email helper (sendPriceAlert)
│       ├── portfolio.ts           # FIFO cost-basis engine
│       └── utils.ts               # Format helpers, exchange detection
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── DECISIONS.md                   # Architectural decision log
```

## Data Flow: Stock Detail Page

When a user navigates to `/stock/AAPL`:

1. **Page component** (`src/app/stock/[ticker]/page.tsx`) renders and the client-side component fetches two endpoints in parallel:
   - `GET /api/yahoo/quote?ticker=AAPL` — fundamentals
   - `GET /api/yahoo/chart?ticker=AAPL&range=1y` — price data

2. **Quote route** (`src/app/api/yahoo/quote/route.ts`):
   - Checks `snapshot_cache` table for a row with `ticker = 'AAPL'` and `fetched_at` within 6 hours
   - **Cache hit:** returns cached JSON immediately
   - **Cache miss:** calls `yahooFundamentals('AAPL')` → upserts into `snapshot_cache` → returns fresh data

3. **yahooFundamentals** (`src/lib/yahoo/client.ts`):
   - Calls `getSession()` to get cookie + crumb (cached 30 min in-process)
   - Fetches `query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=price,summaryDetail,...&crumb=xxx`
   - Parses 7 modules into flat `Fundamentals` object

4. **Client receives fundamentals** → passes to `computeValuations(f)` (`src/lib/valuation/index.ts`):
   - Computes Graham Number, NCAV/share, EPV/share, Graham Growth
   - Computes margin-of-safety for each model vs current price

5. **Chart route** (`src/app/api/yahoo/chart/route.ts`):
   - Fetches `query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1y&interval=1d`
   - Returns time series of adjusted close prices

6. **Client renders:**
   - Price chart (Recharts)
   - Fundamentals table
   - 4 valuation cards with tooltips showing formula + inputs
   - MoS bar chart comparing price to each intrinsic value

## SQLite Schema

```sql
CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL UNIQUE,
  exchange TEXT NOT NULL,
  thesis TEXT NOT NULL DEFAULT '',
  target_buy_price REAL,
  stop_loss REAL,
  position_size_pct REAL,
  created_at INTEGER NOT NULL
);

CREATE TABLE portfolio_trades (
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
);

CREATE INDEX idx_trades_ticker ON portfolio_trades(ticker);

CREATE TABLE snapshot_cache (
  ticker TEXT PRIMARY KEY,
  exchange TEXT NOT NULL,
  payload TEXT NOT NULL,     -- Full Fundamentals JSON
  fetched_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE alerts (
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
);

CREATE INDEX idx_alerts_active ON alerts(active);
CREATE INDEX idx_alerts_ticker ON alerts(ticker);
```

All timestamps are Unix milliseconds (JavaScript `Date.now()`).

---

Last updated: 2026-05-10 by Claude Cowork
