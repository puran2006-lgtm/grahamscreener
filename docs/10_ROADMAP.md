# Roadmap

Features ranked by effort × value. Marked with API requirements.

## Priority 1 — High Value, Low Effort

| Feature | Effort | Value | Paid API? | Description |
|---|---|---|---|---|
| CSV import/export for portfolio | 1 day | High | No | Import trades from a CSV (broker export). Export trades + positions as CSV. Use `papaparse` (already in typical Next.js ecosystem). |
| Configurable WACC / tax / AAA yield | 0.5 day | Medium | No | Settings drawer to override the fixed constants (9% WACC, 25% tax, 4.5% Y) used in EPV and Graham Growth. |
| Screener preset URLs | 0.5 day | Medium | No | Encode filter state in URL query params so presets can be shared or bookmarked. |
| Unrealised P&L in portfolio | 1 day | High | No | Fetch current price for each open position and compute unrealised gain/loss vs FIFO cost basis. |
| Dark/light chart colours | 0.5 day | Low | No | Recharts colours currently don't adapt to light mode. Fix theme-aware stroke and fill. |

## Priority 2 — High Value, Medium Effort

| Feature | Effort | Value | Paid API? | Description |
|---|---|---|---|---|
| Multi-currency portfolio (AUD/INR/USD) | 2–3 days | High | No (Yahoo FX) | Convert all positions to a base currency using Yahoo's `AUDUSD=X` FX pairs. Requires daily FX snapshot. |
| Email price alerts | 2 days | High | No (free SMTP) | Trigger email when a watchlist ticker hits target buy or stop loss. Requires a cron job + SMTP config (Resend free tier or Gmail SMTP). |
| Benchmark comparison chart | 2 days | High | No | Overlay portfolio return vs benchmark index on the portfolio page. Yahoo chart data for `^GSPC`, `^AXJO`, etc. is free. |
| Earnings calendar overlay | 1–2 days | Medium | **Yes** (FMP $30/mo) | Show upcoming earnings dates on the stock chart. Yahoo doesn't expose this reliably; Financial Modeling Prep does. |
| Vercel deploy with Turso | 2 days | Medium | **Yes** (Turso free tier) | Replace `better-sqlite3` with `@libsql/client` for edge deployment. Turso free tier = 9GB storage. |

## Priority 3 — Medium Value, Medium-High Effort

| Feature | Effort | Value | Paid API? | Description |
|---|---|---|---|---|
| Telegram bot for watchlist alerts | 2–3 days | Medium | No | Send Telegram messages when price crosses target/stop. Requires a Telegram bot token (free) + polling/cron. |
| Insider trading data | 3 days | Medium | **Yes** (FMP or SEC EDGAR) | Show insider buys/sells on the stock page. SEC EDGAR is free but requires parsing; FMP provides clean JSON. |
| Valuation history chart | 3 days | Medium | No | Snapshot a daily row per ticker; chart intrinsic value vs price over time. Requires a cron job to run `npm run snapshot` daily. |
| Screener custom universe | 2 days | Medium | No | Let users add/remove tickers from the screener universe via UI. Currently hardcoded in `src/lib/universe/index.ts`. |
| Portfolio benchmark vs alpha | 2 days | Medium | No | Compute portfolio alpha (excess return vs benchmark) and Sharpe ratio. |

## Priority 4 — Aspirational

| Feature | Effort | Value | Paid API? | Description |
|---|---|---|---|---|
| Backtesting engine | 1–2 weeks | High | No | Test buy/sell rules against historical data. Requires daily price history (Yahoo chart endpoint, 5Y/Max range). |
| Multi-user auth | 1 week | Medium | No | NextAuth.js with Google OAuth. Separate DBs per user. |
| Mobile app (React Native) | 2–3 weeks | Medium | No | Share the valuation logic; native UI for watchlist alerts. |
| AI thesis generator | 2 days | Medium | **Yes** (Claude API) | Generate an investment thesis for any ticker using fundamentals + sector context. |

## API Cost Summary

| Provider | Free Tier | Paid | What it unlocks |
|---|---|---|---|
| Yahoo Finance | Unlimited (personal use) | N/A | Everything in v1 |
| Financial Modeling Prep | 250 req/day | $30/mo | Earnings calendar, insider trading, financial statements |
| EODHD | 20 req/day | $20/mo | Better international coverage, bulk data |
| Turso | 9 GB, 500M rows read | $29/mo | Edge-deployed SQLite for Vercel |
| Resend | 100 emails/day | $20/mo | Email alerts |
| Claude API | Pay-per-token | ~$0.01/thesis | AI thesis generation |

---

Last updated: 2026-05-09 by Claude Cowork
