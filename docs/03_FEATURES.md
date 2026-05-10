# Features

## 1. Ticker Search

**What it does:** Real-time search across all Yahoo Finance equities. Filters to EQUITY quote type only. Powers both the hero search bar on the dashboard and the command palette (Cmd+K).

**Where the code lives:**
- Yahoo client: `src/lib/yahoo/client.ts` → `yahooSearch()`
- API route: `src/app/api/yahoo/search/route.ts`
- Hero search component: `src/components/ticker-search.tsx`
- Command palette: `src/components/layout/command-palette.tsx`

**How to test manually:**
1. Open `http://localhost:3000`
2. Type "CBA" into the hero search bar — should show CBA.AX and related results
3. Press `Cmd+K` → type "RELIANCE" — should show RELIANCE.BO and RELIANCE.NS
4. Click a result → navigates to `/stock/[ticker]`

**Known limitations:**
- Yahoo occasionally returns 0 results for valid queries during rate-limiting windows
- EU regions may get consent-page responses; the session manager handles this gracefully

![](./screenshots/feature-1-search.png)

## 2. Stock Detail Page

**What it does:** Displays a full stock analysis page with price chart (1M–Max range selector), fundamentals table, 4 valuation model cards (Graham Number, NCAV, EPV, Graham Growth), and a margin-of-safety bar chart comparing each model's intrinsic value to the current price.

**Where the code lives:**
- Page: `src/app/stock/[ticker]/page.tsx`
- Valuation cards: `src/components/stock/valuation-cards.tsx`
- MoS bar: `src/components/stock/mos-bar.tsx`
- Fundamentals table: `src/components/stock/fundamentals-table.tsx`
- Price chart: `src/components/charts/price-chart.tsx`
- Watchlist toggle: `src/components/stock/watchlist-toggle.tsx`
- Valuation engine: `src/lib/valuation/index.ts`
- Yahoo quote API: `src/app/api/yahoo/quote/route.ts`
- Yahoo chart API: `src/app/api/yahoo/chart/route.ts`

**How to test manually:**
1. Navigate to `http://localhost:3000/stock/AAPL`
2. Verify: price chart loads with data points, range selector works (1M, 3M, 6M, 1Y, 5Y, Max)
3. Verify: fundamentals table shows P/E, P/B, EPS, book value, current ratio, etc.
4. Verify: 4 valuation cards show computed values or "—" with explanation tooltip
5. Verify: MoS bar chart shows price line vs each model's intrinsic value
6. Verify: watchlist star toggle adds/removes from watchlist

**Known limitations:**
- NCAV is almost always negative for large-caps (by design — net-net situations are rare)
- EPV tax and WACC are configurable via the settings drawer (gear icon in sidebar)
- Some tickers (especially BSE) may have missing balance-sheet fields

![](./screenshots/feature-2-stock-detail.png)

## 3. Fundamentals Data

**What it does:** Fetches 7 Yahoo Finance modules (price, summaryDetail, defaultKeyStatistics, financialData, assetProfile, balanceSheetHistory, incomeStatementHistory) and normalises them into a flat `Fundamentals` object. Cached in SQLite with 6h freshness for stock pages, 24h for screener.

**Where the code lives:**
- Yahoo client: `src/lib/yahoo/client.ts` → `yahooFundamentals()`
- Type definitions: `src/lib/yahoo/types.ts` → `Fundamentals` interface
- Cache layer: `src/app/api/yahoo/quote/route.ts` (6h) and `src/app/api/screener/route.ts` (24h)
- DB schema: `src/lib/db/schema.ts` → `snapshotCache` table

**How to test manually:**
```bash
curl http://localhost:3000/api/yahoo/quote?ticker=AAPL | jq '.trailingPE, .bookValuePerShare, .trailingEps'
```

**Known limitations:**
- Yahoo's `quoteSummary` endpoint requires a valid crumb token; the session manager bootstraps this but it can fail in EU regions
- Some fields (e.g., `totalCurrentAssets`) may be `undefined` for certain tickers

![](./screenshots/feature-3-fundamentals.png)

## 4. Watchlist

**What it does:** A persistent watchlist stored in SQLite. Each entry has: ticker, exchange (auto-detected from suffix), thesis (free text), target buy price, stop loss, and position size percentage. Supports add, update, and delete operations.

**Where the code lives:**
- API route: `src/app/api/watchlist/route.ts`
- Page: `src/app/watchlist/page.tsx`
- View component: `src/components/watchlist/watchlist-view.tsx`
- Stock-page toggle: `src/components/stock/watchlist-toggle.tsx`
- Seed API: `src/app/api/seed/route.ts`
- Seed script: `scripts/seed.ts`
- DB schema: `src/lib/db/schema.ts` → `watchlist` table

**How to test manually:**
1. Navigate to `http://localhost:3000/watchlist`
2. If empty, click "Load 5 sample items"
3. Verify 5 items appear with thesis, target, stop loss
4. Navigate to any stock page → click the star → verify it appears in watchlist
5. `curl http://localhost:3000/api/watchlist` → verify JSON with 5 items

**Known limitations:**
- No sorting/filtering in the watchlist UI (planned for v2)
- Thesis text is plain text — no markdown rendering

![](./screenshots/feature-4-watchlist.png)

## 5. Screener

**What it does:** Screens the 200-ticker universe (50 per exchange) against Graham-style value filters. Fetches fundamentals from cache (or Yahoo if stale), applies filters server-side, returns sorted results. Includes 4 presets: Defensive (Graham), Enterprising (Graham), Income, and Quality+Cheap. Filters are encoded in the URL for shareable links.

**Where the code lives:**
- API route: `src/app/api/screener/route.ts`
- Page: `src/app/screener/page.tsx`
- View component: `src/components/screener/screener-view.tsx`
- Universe: `src/lib/universe/index.ts`

**How to test manually:**
1. Navigate to `http://localhost:3000/screener`
2. Select exchange (US, ASX, BSE, NSE)
3. Click "Run Screener" with default filters → should return results
4. Apply Defensive preset (P/E ≤ 15, P/B ≤ 1.5, CR ≥ 2) → fewer results
5. Click a result row → navigates to stock detail

**Known limitations:**
- First run on an empty cache takes 30–60s as it fetches all 50 tickers
- Yahoo may 429 during bulk fetches; failed tickers return `null` and are skipped
- Only 5 filter dimensions — no EV/EBITDA, ROE, or earnings growth filters yet

![](./screenshots/feature-5-screener.png)

## 6. Portfolio

**What it does:** An append-only trade log (BUY/SELL) with FIFO cost-basis computation. Shows open positions with average cost, cost basis, realised P&L, and total fees. Supports add and delete operations.

**Where the code lives:**
- API route: `src/app/api/portfolio/route.ts`
- Page: `src/app/portfolio/page.tsx`
- View component: `src/components/portfolio/portfolio-view.tsx`
- FIFO engine: `src/lib/portfolio.ts`
- DB schema: `src/lib/db/schema.ts` → `portfolioTrades` table

**How to test manually:**
1. Navigate to `http://localhost:3000/portfolio`
2. Add a BUY trade: AAPL, 10 shares @ $175, fees $9.95
3. Verify position appears with correct cost basis ($1,759.95)
4. Add a SELL trade: AAPL, 5 shares @ $195
5. Verify: 5 shares remaining, realised P&L = 5 × ($195 − $175) = $100
6. `curl http://localhost:3000/api/portfolio` → verify trade JSON

**Known limitations:**
- Mixed currencies are converted to the user's base currency via Yahoo FX rates (24h cache). Accuracy depends on rate freshness.

**v1.3 additions:**
- CSV import/export: auto-detects Stake, CommSec, Interactive Brokers, Zerodha, GrahamScreener formats; falls back to manual column-mapping
- Multi-currency: base currency switcher (USD/AUD/INR/GBP/EUR) with FX-converted KPI cards
- Benchmark comparison chart: cost-basis-weighted return vs index (ASX200/SENSEX/NIFTY/S&P500)

![](./screenshots/feature-6-portfolio.png)

## 7. Price Alerts (v1.4)

**What it does:** Email-based price alerts evaluated hourly by Vercel Cron. Supports 4 condition types: target buy, stop loss, percentage up, percentage down. Emails sent via Resend with a dark-themed template matching the app.

**Where the code lives:**
- Page: `src/app/alerts/page.tsx`
- View component: `src/components/alerts/alerts-view.tsx`
- Modal component: `src/components/alerts/alert-modal.tsx`
- CRUD API: `src/app/api/alerts/route.ts` + `src/app/api/alerts/[id]/route.ts`
- Cron endpoint: `src/app/api/cron/check-alerts/route.ts`
- Email helper: `src/lib/email.ts`
- Test script: `scripts/test-email.ts`
- DB schema: `src/lib/db/schema.ts` → `alerts` table

**How to test manually:**
1. Navigate to `http://localhost:3000/alerts`
2. Click "+ New Alert" → fill in ticker, condition, threshold, email
3. Verify alert appears in the active table
4. Pause/edit/delete via action buttons
5. Run `npm run test-email` with `RESEND_API_KEY` and `TEST_EMAIL` env vars to verify email delivery

**Known limitations:**
- Vercel free tier runs crons once/day; Pro tier runs hourly as configured
- 24h debounce prevents re-firing within a day (by design)
- No auth — alerts are keyed by email, not user accounts (auth planned for v2)

## 8. Snapshot

**What it does:** Batch-fetches Yahoo fundamentals for the entire universe (or just watchlist tickers) and stores them in the `snapshot_cache` table. Powers the screener's 24h cache and the stock page's 6h cache. Available as both an API endpoint and a CLI script.

**Where the code lives:**
- API route: `src/app/api/snapshot/route.ts`
- CLI script: `scripts/snapshot.ts`
- Dashboard panel: `src/components/snapshot-panel.tsx`

**How to test manually:**
```bash
# Via CLI
npm run snapshot ASX

# Via API (while dev server is running)
curl -X POST -H "Content-Type: application/json" \
  -d '{"exchanges":["ASX"]}' \
  http://localhost:3000/api/snapshot

# Check cache status
curl http://localhost:3000/api/snapshot
```

**Known limitations:**
- Full 200-ticker snapshot takes 2–5 minutes
- Yahoo may 429 some tickers during bulk fetch — they'll be retried on next run
- No scheduling — must be triggered manually or via cron

![](./screenshots/feature-7-snapshot.png)

---

Last updated: 2026-05-10 by Claude Cowork
