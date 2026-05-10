# Data Source — Yahoo Finance

## Endpoints Used

### 1. Ticker Search
```
GET https://query1.finance.yahoo.com/v1/finance/search?q={query}&quotesCount={limit}&newsCount=0
```
Returns matching equities. Filtered to `quoteType === "EQUITY"` client-side.

### 2. Price Chart
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={range}&interval={interval}&includePrePost=false
```
Ranges: `1mo`, `3mo`, `6mo`, `1y`, `5y`, `max`. Interval auto-selected: `1d` for ≤1Y, `1wk` for 5Y/max.

### 3. Quote Summary (Fundamentals)
```
GET https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules={modules}&crumb={crumb}
```
Modules requested: `price`, `summaryDetail`, `defaultKeyStatistics`, `financialData`, `assetProfile`, `balanceSheetHistory`, `incomeStatementHistory`.

**Requires crumb token** — bootstrapped via the session manager.

### 4. Session Bootstrap
```
GET https://fc.yahoo.com  → Set-Cookie header (A1/A3 cookies)
GET https://query2.finance.yahoo.com/v1/test/getcrumb  → crumb token (plain text)
```

## Ticker Suffix Table

| Exchange | Suffix | Example | Currency |
|---|---|---|---|
| ASX (Australia) | `.AX` | `CBA.AX` | AUD |
| BSE (India) | `.BO` | `RELIANCE.BO` | INR |
| NSE (India) | `.NS` | `INFY.NS` | INR |
| US (NYSE/NASDAQ) | none | `AAPL` | USD |

Exchange detection logic: `src/lib/utils.ts` → `exchangeFromTicker(ticker)`

## Rate-Limit Behaviour

Yahoo applies per-IP rate limits. Observed behaviour:

| Scenario | Typical threshold | Response |
|---|---|---|
| Individual page loads | Unlimited (practical) | 200 OK |
| Bulk screener (50 tickers) | ~6 concurrent | Occasional 429 |
| Full snapshot (200 tickers) | ~6 concurrent | 5–15% failure rate |
| Aggressive scraping | >20 concurrent | IP soft-ban (1–24h) |

**Mitigation in GrahamScreener:**
1. **Session retry:** On 401/403/429, the session manager (`src/lib/yahoo/session.ts`) invalidates the cached session and retries once with a fresh cookie + crumb.
2. **Sequential snapshot with backoff:** The CLI snapshot script (`scripts/snapshot.ts`) processes tickers one at a time with 1.5–2.5s random jitter between requests. On 429, it applies exponential backoff: 30s → 60s → 120s. After 3 consecutive 429s, it pauses for 5 minutes. This eliminates the IP soft-ban risk that the earlier 6-concurrent-worker approach caused.
3. **Screener concurrency:** The screener API route (`src/app/api/screener/route.ts`) still uses concurrent workers for its 50-ticker exchange screen, relying on the snapshot cache for most requests.
4. **Cache layer:** SQLite `snapshot_cache` prevents redundant fetches. Stock pages use 6h freshness; screener uses 24h.

## Cache TTLs

| Context | TTL | Where set |
|---|---|---|
| Yahoo session (cookie + crumb) | 30 min (in-process) | `src/lib/yahoo/session.ts` — `TTL = 1000 * 60 * 30` |
| Stock detail page (quote) | 6 hours | `src/app/api/yahoo/quote/route.ts` — `ageMs < 1000 * 60 * 60 * 6` |
| Screener (fundamentals) | 24 hours | `src/app/api/screener/route.ts` — `FRESH_MS = 1000 * 60 * 60 * 24` |
| Chart data | 5 min (HTTP Cache-Control) | `src/app/api/yahoo/chart/route.ts` — `s-maxage=300` |

## If Yahoo Breaks — Swap Plan

Yahoo's free endpoints have no SLA and can change without notice. Three alternatives ranked by suitability:

| Provider | Free tier | Coverage | Migration effort | Notes |
|---|---|---|---|---|
| **Financial Modeling Prep** (financialmodelingprep.com) | 250 req/day free | US, some intl | Medium — similar REST API, different JSON shape | Best free alternative. ASX/BSE coverage limited on free tier. |
| **EODHD** (eodhd.com) | 20 req/day free; $20/mo starter | ASX, BSE, NSE, US | Medium — bulk CSV endpoints available | Best international coverage. Paid tier is cheap. |
| **Alpha Vantage** (alphavantage.co) | 25 req/day free | US primarily | Low — simple REST API | Poor international coverage. Tight free limits. |

**Migration approach:** Replace `src/lib/yahoo/client.ts` functions (`yahooSearch`, `yahooChart`, `yahooFundamentals`) with provider-specific implementations. The rest of the app consumes the `Fundamentals` and `ChartResponse` interfaces unchanged.

## Terms of Service Warning

Yahoo Finance's free endpoints are intended for personal, non-commercial use. Key restrictions:

- Data cannot be redistributed, resold, or displayed commercially without a Yahoo Data licence
- Automated scraping at scale may violate Yahoo's TOS
- GrahamScreener is designed as a **personal, local tool** — not a SaaS product
- If deploying publicly, switch to a licenced data provider (EODHD or FMP paid tiers)

---

Last updated: 2026-05-10 by Claude Cowork
