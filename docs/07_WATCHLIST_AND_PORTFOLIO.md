# Watchlist and Portfolio Guide

## Watchlist

### Adding a Ticker

**Via UI:** Navigate to any stock page (e.g., `/stock/AAPL`) and click the star icon. Or use the watchlist page's add form.

**Via API:**
```bash
curl -X POST http://localhost:3000/api/watchlist \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "CBA.AX",
    "thesis": "Big Four bank with best cost-to-income ratio",
    "targetBuyPrice": 95,
    "stopLoss": 80,
    "positionSizePct": 6
  }'
```

### Field Descriptions

| Field | Type | Required | Description |
|---|---|---|---|
| `ticker` | string | Yes | Yahoo Finance ticker with exchange suffix (e.g., `CBA.AX`, `AAPL`) |
| `thesis` | string | No | Your investment thesis — why you're watching this stock |
| `targetBuyPrice` | number | No | The price at which you'd consider buying |
| `stopLoss` | number | No | The price at which you'd exit to limit losses |
| `positionSizePct` | number | No | Target portfolio allocation (0–100%) |

All optional fields default to `null`. The exchange is auto-detected from the ticker suffix.

### Removing a Ticker

**Via UI:** Click the delete button on the watchlist page, or click the star icon on the stock page to untoggle.

**Via API:**
```bash
curl -X DELETE "http://localhost:3000/api/watchlist?ticker=CBA.AX"
```

### Updating a Ticker

POST to the same endpoint with the same ticker — it upserts (updates if exists, inserts if new).

## Portfolio

### Recording a Trade

**Via UI:** Navigate to `/portfolio` and use the trade entry form.

**Via API:**
```bash
curl -X POST http://localhost:3000/api/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "side": "BUY",
    "quantity": 10,
    "price": 175.50,
    "fees": 9.95,
    "tradeDate": 1704067200000,
    "notes": "Initial position — value entry"
  }'
```

### Field Descriptions

| Field | Type | Required | Description |
|---|---|---|---|
| `ticker` | string | Yes | Yahoo Finance ticker |
| `side` | `"BUY"` or `"SELL"` | Yes | Trade direction |
| `quantity` | number | Yes | Number of shares (must be positive) |
| `price` | number | Yes | Price per share (must be positive) |
| `fees` | number | No | Brokerage/commission fees (default 0) |
| `tradeDate` | number | Yes | Unix milliseconds timestamp of the trade date |
| `notes` | string | No | Free-text notes about the trade |

## FIFO Cost-Basis Explanation

GrahamScreener uses First-In-First-Out (FIFO) accounting. When you sell shares, the oldest purchased lots are consumed first.

**Code path:** `src/lib/portfolio.ts` → `buildPositionsFIFO(trades)`

### Worked Example

| # | Date | Side | Qty | Price | Fees |
|---|---|---|---|---|---|
| 1 | 2024-01-01 | BUY | 10 | $100 | $10 |
| 2 | 2024-03-15 | BUY | 5 | $120 | $5 |
| 3 | 2024-06-01 | SELL | 8 | $140 | $8 |

**After Trade 3 (SELL 8 @ $140):**

FIFO consumes the oldest lots first:
- Lot 1: 10 shares @ $100 → sell 8 of these
- Realised P&L = 8 × ($140 − $100) = **$320**

**Remaining open lots:**
- 2 shares from Lot 1 @ $100
- 5 shares from Lot 2 @ $120

**Position summary:**
- Shares held: 7
- Cost basis: (2 × $100) + (5 × $120) = $800
- Average cost: $800 / 7 = $114.29
- Realised P&L: $320
- Total fees: $10 + $5 + $8 = $23

### What FIFO Does Not Handle

- **Tax-lot picking:** Cannot select specific lots to sell (e.g., highest-cost first for tax optimisation)
- **Average-cost method:** Some jurisdictions allow averaging; GrahamScreener uses FIFO only
- **Wash-sale rules:** No tracking of 30-day wash-sale windows (US IRS requirement)
- **Currency conversion:** Mixed-currency positions are summed in their native currencies

## Benchmark Comparison

Each exchange maps to a benchmark index for relative performance:

| Exchange | Benchmark | Ticker | Why |
|---|---|---|---|
| ASX | S&P/ASX 200 | `^AXJO` | Broadest liquid Australian index |
| BSE | BSE SENSEX | `^BSESN` | India's flagship 30-stock index |
| NSE | NIFTY 50 | `^NSEI` | India's broadest large-cap index |
| US | S&P 500 | `^GSPC` | Standard US large-cap benchmark |

**Code path:** `src/lib/universe/index.ts` → `BENCHMARK` constant

Note: Benchmark comparison charting is planned for v2. Currently the benchmarks are defined but not rendered in the portfolio UI.

## Exporting / Backing Up the SQLite File

The entire database is a single file: `data/valuelens.db`.

**To back up:**
```bash
cp data/valuelens.db data/valuelens-backup-$(date +%Y%m%d).db
```

**To export trades as JSON:**
```bash
curl http://localhost:3000/api/portfolio | python3 -m json.tool > trades.json
```

**To export watchlist as JSON:**
```bash
curl http://localhost:3000/api/watchlist | python3 -m json.tool > watchlist.json
```

**To inspect with sqlite3 CLI:**
```bash
sqlite3 data/valuelens.db
.tables
SELECT * FROM watchlist;
SELECT * FROM portfolio_trades;
.quit
```

---

Last updated: 2026-05-09 by Claude Cowork
