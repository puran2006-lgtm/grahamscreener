# GrahamScreener

Graham-discipline value screener for ASX, BSE, NSE, and US equities.

Premium dark-mode UI, all data sourced live (and free) from Yahoo Finance, with a local SQLite store for your watchlist, portfolio, and a fundamentals snapshot cache.

> Live at https://grahamscreener.com
>
> No API keys, no signup, no env vars. `npm run dev` — done.

## Documentation

**Start here:** [`docs/00_START_HERE.md`](./docs/00_START_HERE.md) — one-page overview, quick-start, and links to all docs.

The `/docs` folder contains comprehensive documentation covering setup, features, architecture, valuation formulas, data sources, troubleshooting, and roadmap. See the [doc index](./docs/00_START_HERE.md#documentation-index) for the full list.

## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
npm run dev:demo     # offline mode — fixture data, no Yahoo calls
npm run seed         # optional: load 5 sample watchlist items
npm run snapshot     # optional: cache the 200-ticker universe (slow, hits Yahoo)
```

The SQLite database is auto-created at `data/valuelens.db` on first request — no migration step.

## Features

| # | Feature | Notes |
|---|---|---|
| 1 | Ticker search | Debounced, multi-exchange. Inline (dashboard) and global `Cmd+K` palette. |
| 2 | Stock detail | 1M–Max price chart, fundamentals table, four valuation models with formula tooltips. |
| 3 | Margin-of-safety panel | Current price vs Graham Number / NCAV / EPV / Graham Growth, colour-coded bar visual. |
| 4 | Watchlist | SQLite-backed: thesis, target buy, stop-loss, position-size %. |
| 5 | Screener | P/E, P/B, Current Ratio, D/E, Div Yield across 200 large-caps. Defensive + Enterprising presets. |
| 6 | Portfolio | FIFO cost-basis. Realised P&L tracking. |
| 7 | Snapshot | Batch-cache fundamentals via CLI or dashboard button. |
| 8 | Health page | DB size, cache freshness, snapshot status per exchange. |
| 9 | In-app docs | Rendered markdown at `/docs` with sidebar nav and syntax highlighting. |
| 10 | Demo mode | `npm run dev:demo` — fixture data, works offline. |

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui primitives, better-sqlite3 + Drizzle ORM, Recharts, Zod, next-themes, cmdk.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | Command palette / global search |
| `g` then `d` | Dashboard |
| `g` then `s` | Screener |
| `g` then `w` | Watchlist |
| `g` then `p` | Portfolio |

## Valuation Formulas

| Model | Formula |
|---|---|
| Graham Number | `sqrt(22.5 * EPS * BVPS)` |
| NCAV / share | `(Current Assets - Total Liabilities) / Shares` |
| EPV / share | `(EBITDA * (1 - tax)) / WACC / Shares` (tax 25%, WACC 9%) |
| Graham Growth | `EPS * (8.5 + 2g) * 4.4 / Y` (g capped at 15%, Y = 4.5%) |

Full formula documentation with worked examples: [`docs/05_FORMULAS.md`](./docs/05_FORMULAS.md).

## Project Layout

```
src/
  app/                 # Next.js routes
    api/               # Route handlers (yahoo, watchlist, portfolio, screener, snapshot, seed, health)
    stock/[ticker]/    # Stock detail page
    screener/          # Screener page
    watchlist/         # Watchlist page
    portfolio/         # Portfolio page
    health/            # System health page
    docs/              # In-app documentation viewer
  components/          # React components (ui/, layout/, charts/, stock/, docs/, etc.)
  lib/
    db/                # Drizzle schema + lazy SQLite singleton
    yahoo/             # Client (search, chart, quoteSummary) + cookie/crumb session
    valuation/         # The four formulas
    universe/          # 50 tickers per exchange + benchmark mapping
    demo.ts            # Demo mode fixture loader
    portfolio.ts       # FIFO cost-basis matcher
data/valuelens.db      # Auto-created
fixtures/              # Demo mode fixture JSON files (quote + chart data)
scripts/               # CLI tools (seed.ts, snapshot.ts)
docs/                  # Full documentation suite (13 files)
```

## Design Decisions

See [`DECISIONS.md`](./DECISIONS.md) for the full set of architectural choices and trade-offs.

## Data Source

Yahoo Finance (free, unauthenticated). See [`docs/06_DATA_SOURCE.md`](./docs/06_DATA_SOURCE.md) for endpoints, rate limits, cache TTLs, and alternative provider options.
