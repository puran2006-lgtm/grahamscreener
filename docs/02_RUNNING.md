# Running GrahamScreener

## Dev Mode

```bash
npm run dev
```

Opens at `http://localhost:3000` with hot-reload. All API routes and pages are available immediately.

## Production Build

```bash
npm run build   # Compiles Next.js (takes ~60–90s)
npm start        # Serves production build on port 3000
```

To use a custom port:

```bash
npx next start -p 8080
```

## Snapshot CLI

Batch-fetch fundamentals for the entire 200-ticker universe (or a subset) into the SQLite cache:

```bash
npm run snapshot                          # All 4 exchanges (200 tickers)
npm run snapshot ASX                      # ASX only (50 tickers)
npm run snapshot ASX US                   # ASX + US (100 tickers)
npm run snapshot -- --limit 20            # First 20 tickers only
npm run snapshot -- --tickers AAPL,CBA.AX # Specific tickers
npm run snapshot -- --watchlist-only       # Only watchlist tickers (~5)
```

Progress prints as `.` (success) or `x` (failed) per ticker, with a summary line every 10 tickers showing counts and elapsed time. A full 200-ticker run takes 6–10 minutes due to built-in rate-limit protection.

**Rate-limit handling:** Requests are processed sequentially (no parallelism) with 1.5–2.5s random jitter between each. On a 429 response, the script backs off exponentially (30s → 60s → 120s). After 3 consecutive 429s, it pauses for 5 minutes before resuming.

The snapshot cache is used by the screener (24h freshness) and stock detail page (6h freshness) to avoid hitting Yahoo on every page load.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | Open command palette (global ticker search + page jump) |
| `g` then `d` | Go to Dashboard |
| `g` then `s` | Go to Screener |
| `g` then `w` | Go to Watchlist |
| `g` then `p` | Go to Portfolio |
| `g` then `a` | Go to Alerts |

The `g` prefix is a Vim-style two-key sequence — press `g`, then press the target key within 700ms. These shortcuts are disabled when focus is inside an input or textarea.

## URL Map

| URL | Page | Description |
|---|---|---|
| `/` | Dashboard | Hero search, feature cards, formula overview, snapshot panel |
| `/stock/[ticker]` | Stock Detail | Price chart, fundamentals table, 4 valuation cards, MoS bar |
| `/screener` | Screener | Exchange picker, Graham filters, sortable results table |
| `/watchlist` | Watchlist | All watched tickers with thesis, targets, actions |
| `/portfolio` | Portfolio | Trade log, FIFO positions, P&L summary |
| `/alerts` | Alerts | Price alert management (create, pause, delete) |
| `/health` | Health | DB size, cache freshness, snapshot status per exchange |

### API Routes

| Route | Method | Description |
|---|---|---|
| `/api/yahoo/search?q=CBA` | GET | Search tickers via Yahoo Finance |
| `/api/yahoo/quote?ticker=CBA.AX` | GET | Fetch fundamentals (cached 6h) |
| `/api/yahoo/chart?ticker=CBA.AX&range=1y` | GET | Price chart data |
| `/api/watchlist` | GET | List all watchlist items |
| `/api/watchlist` | POST | Add/update a watchlist item |
| `/api/watchlist?ticker=CBA.AX` | DELETE | Remove from watchlist |
| `/api/portfolio` | GET | List all trades |
| `/api/portfolio` | POST | Record a trade |
| `/api/portfolio?id=1` | DELETE | Delete a trade |
| `/api/screener` | GET | Get the ticker universe |
| `/api/screener` | POST | Run screener with filters |
| `/api/snapshot` | GET | Snapshot cache status |
| `/api/snapshot` | POST | Trigger snapshot refresh |
| `/api/seed` | POST | Seed watchlist with 5 samples |
| `/api/health` | GET | System health: DB size, cache stats, snapshot status |
| `/api/settings` | GET | Current valuation settings + defaults |
| `/api/settings` | PUT | Update valuation settings (WACC, tax, yield) |
| `/api/fx` | GET | FX rates for portfolio currency conversion |
| `/api/fx` | PUT | Update base currency preference |
| `/api/portfolio/import` | POST | Bulk-import trades from CSV |
| `/api/alerts` | GET | List all alerts |
| `/api/alerts` | POST | Create a new alert |
| `/api/alerts/[id]` | PATCH | Update an alert (pause, edit) |
| `/api/alerts/[id]` | DELETE | Delete an alert |
| `/api/cron/check-alerts` | GET | Cron: evaluate active alerts, send emails |

## Test Email CLI

Send a sample price alert email to verify your Resend setup:

```bash
RESEND_API_KEY=re_xxxxx ALERT_FROM_EMAIL=onboarding@resend.dev TEST_EMAIL=you@gmail.com npm run test-email
```

## Environment Variables (Alerts)

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes (for alerts) | Resend API key |
| `ALERT_FROM_EMAIL` | No | Sender address (default: `alerts@grahamscreener.com`) |
| `CRON_SECRET` | Yes (for cron) | Vercel cron auth token |
| `TEST_EMAIL` | No | Your email for `npm run test-email` |

---

Last updated: 2026-05-10 by Claude Cowork
