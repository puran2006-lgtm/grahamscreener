# Troubleshooting

## Quick Reference

| Symptom | Likely Cause | Fix |
|---|---|---|
| Port 3000 already in use | Another process on the port | `lsof -ti:3000 \| xargs kill -9` then retry `npm run dev` |
| `SQLITE_BUSY` during build | WAL lock contention from parallel Next.js workers | Delete `data/valuelens.db-shm` and `data/valuelens.db-wal`, then rebuild |
| `SQLITE_BUSY` at runtime | Concurrent writes from multiple tabs | Refresh the page — WAL mode handles most cases, but rapid writes can still collide |
| Build fails with type errors | Missing or outdated dependencies | Run `npm install` to ensure all packages are present |
| Build fails with `better-sqlite3` error | Native binary not compiled for this platform | Run `npm rebuild better-sqlite3` or delete `node_modules` and `npm install` |
| Blank stock page — no chart, no data | Yahoo rate-limited or session expired | Wait 60 seconds, then hard-refresh (Cmd+Shift+R). Check browser console for 429/502. |
| Valuations show "—" for all models | Yahoo's `quoteSummary` returned incomplete data | The stock may lack EPS, book value, or EBITDA. Check the fundamentals table — missing inputs mean the formula can't compute. |
| Charts load but fundamentals don't | Crumb token missing or invalid | The `quoteSummary` endpoint requires a crumb; `chart` does not. Reload the page to trigger a fresh session bootstrap. |
| Search returns 0 results | Yahoo search endpoint rate-limited | Wait 30 seconds and try again. If persistent, Yahoo may be blocking your IP temporarily. |
| Screener shows 0 results | Filters too strict, or cache is empty | Relax filters (try removing all except exchange). If cache is empty, run `npm run snapshot` first. |
| Screener takes >30 seconds | Cold cache — fetching 50 tickers from Yahoo | Normal on first run. Subsequent runs use the 24h cache and are instant. |
| `429 Too Many Requests` from Yahoo | IP rate-limited | Wait 1–5 minutes. Reduce snapshot concurrency if it happens consistently. |
| Empty watchlist after restart | Database was deleted or reset | Run `npm run seed` to re-populate with 5 sample tickers. |
| Database file not found | First run — DB not yet initialised | Start the dev server (`npm run dev`) and make any request — the DB auto-creates. |
| `ERR_MODULE_NOT_FOUND` on tsx scripts | `tsx` not installed | Run `npm install` — `tsx` is a devDependency. |
| Dark mode not working | Theme cookie not set | Click the sun/moon toggle in the top nav bar. Default is dark. |
| EU consent blocking Yahoo | Yahoo returns HTML instead of JSON | Known limitation. The session manager detects this and falls through. Chart data usually works; `quoteSummary` may not. Consider using a VPN or switching to a paid data provider. |
| `npm run snapshot` hangs | Network timeout or Yahoo blocking | Press Ctrl+C and retry. Check your internet connection. |
| Missing env vars error | None expected — but a wrapper tool might inject them | GrahamScreener uses zero environment variables (except optional `DEMO_MODE`). If you see env-related errors, check for proxy or corporate firewall interference. |

## Resetting Everything

```bash
# Nuclear reset — fresh start
rm -rf data/ .next/ node_modules/
npm install
npm run dev
# Visit http://localhost:3000 — DB recreates automatically
npm run seed  # Re-add sample data
```

## Checking Database Health

```bash
sqlite3 data/valuelens.db "
  SELECT 'watchlist', COUNT(*) FROM watchlist
  UNION ALL
  SELECT 'trades', COUNT(*) FROM portfolio_trades
  UNION ALL
  SELECT 'cache', COUNT(*) FROM snapshot_cache;
"
```

## Checking Yahoo Connectivity

```bash
# Test session bootstrap
curl -sI https://fc.yahoo.com | head -10

# Test search endpoint
curl -s "https://query1.finance.yahoo.com/v1/finance/search?q=AAPL&quotesCount=1" | head -1

# Test chart endpoint
curl -s "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d" | python3 -c "import sys,json; print(json.load(sys.stdin)['chart']['result'][0]['meta']['regularMarketPrice'])"
```

---

Last updated: 2026-05-09 by Claude Cowork
