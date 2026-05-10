# GrahamScreener — Start Here

## What is GrahamScreener?

GrahamScreener is a local-first, multi-exchange value-investing screener and portfolio tracker. It computes Graham Number, NCAV, Earnings Power Value, and the Graham Growth formula live from Yahoo Finance data, then renders a colour-coded margin-of-safety panel so you can see at a glance whether a stock is cheap, fair, or expensive.

**Who it's for:** Individual value investors who follow Benjamin Graham's principles and want a single dashboard covering ASX, BSE, NSE, and US equities — without paying for a Bloomberg terminal.

> Live at https://grahamscreener.com (coming soon)

**What it covers:**

| Feature | What it does |
|---|---|
| Stock detail | Live fundamentals + 4 valuation models + MoS bar chart |
| Screener | Filter 200 large-caps (50/exchange) by P/E, P/B, current ratio, D/E, yield |
| Watchlist | Track tickers with thesis, target buy, stop loss, position size |
| Portfolio | Record BUY/SELL trades, FIFO cost basis, realised + unrealised P&L |
| Snapshot | Batch-fetch fundamentals for the entire universe into SQLite cache |
| Search | Yahoo Finance ticker search across all exchanges |
| Charts | 1M–Max price charts with 52-week range overlay |
| Health | DB size, cache freshness, snapshot status per exchange |
| Docs | In-app documentation viewer at `/docs` with sidebar navigation |
| Demo mode | Offline-first mode using fixture data — no Yahoo calls needed |

## Run in 30 Seconds

```bash
git clone <repo-url> valuelens && cd valuelens
npm install
npm run dev
# Open http://localhost:3000
```

No API keys. No environment variables. No Docker. Just Node 18+ and npm.

### Demo Mode (offline, no Yahoo dependency)

```bash
npm run dev:demo
# All data served from /fixtures — works offline, never rate-limited
```

## Documentation Index

| Doc | Description |
|---|---|
| [01_SETUP.md](./01_SETUP.md) | Node requirements, install, DB init, reset, re-seed |
| [02_RUNNING.md](./02_RUNNING.md) | Dev mode, production build, snapshot CLI, keyboard shortcuts, URL map |
| [03_FEATURES.md](./03_FEATURES.md) | Per-feature deep-dive with file paths and manual test steps |
| [04_ARCHITECTURE.md](./04_ARCHITECTURE.md) | System diagram, folder structure, data flow, SQLite schema |
| [05_FORMULAS.md](./05_FORMULAS.md) | Every valuation formula with math, source, code path, worked example |
| [06_DATA_SOURCE.md](./06_DATA_SOURCE.md) | Yahoo endpoints, ticker suffixes, rate limits, cache TTLs, alternatives |
| [07_WATCHLIST_AND_PORTFOLIO.md](./07_WATCHLIST_AND_PORTFOLIO.md) | Adding positions, FIFO cost basis, benchmarks, backup |
| [08_SCREENER_GUIDE.md](./08_SCREENER_GUIDE.md) | 200-ticker universe, filter definitions, Graham presets |
| [09_TROUBLESHOOTING.md](./09_TROUBLESHOOTING.md) | Symptom → cause → fix table |
| [10_ROADMAP.md](./10_ROADMAP.md) | Prioritised next features with effort and API requirements |
| [11_CHANGELOG.md](./11_CHANGELOG.md) | Version history |

## Quick Troubleshooting

| Problem | Fix |
|---|---|
| `npm run dev` shows port in use | `lsof -ti:3000 \| xargs kill -9` then retry |
| Blank stock page, no data | Yahoo rate-limited you — wait 60s, refresh |
| `SQLITE_BUSY` on build | Delete `data/valuelens.db-shm` and `data/valuelens.db-wal`, retry |
| Build fails with type errors | Run `npm install` — likely missing deps after a pull |
| Charts show but valuations show "—" | Yahoo's `quoteSummary` requires a crumb; session may have expired — reload |

---

Last updated: 2026-05-09 by Claude Cowork
