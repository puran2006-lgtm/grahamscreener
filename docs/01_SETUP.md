# Setup Guide

## Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| Node.js | 18.x | 22.x (LTS) |
| npm | 9.x | 10.x |
| Disk space | ~200 MB (node_modules + DB) | — |
| OS | macOS, Linux, Windows (WSL) | macOS |

No API keys or environment variables required. GrahamScreener uses unauthenticated Yahoo Finance endpoints.

## First-Time Install

```bash
cd valuelens
npm install
```

This installs all dependencies including the native `better-sqlite3` binary, which compiles from source via `node-gyp`. If compilation fails, ensure you have build tools installed:

- **macOS:** `xcode-select --install`
- **Ubuntu/Debian:** `sudo apt install build-essential python3`
- **Windows WSL:** `sudo apt install build-essential python3`

## Database Initialization

The database initialises automatically on first access. When any API route or page touches the database, `src/lib/db/index.ts` creates `data/valuelens.db` with WAL mode enabled and runs `CREATE TABLE IF NOT EXISTS` for all three tables.

No migration commands needed. No `drizzle-kit push` required.

### Seed Sample Data

To populate the watchlist with 5 sample tickers (CBA.AX, RELIANCE.BO, INFY.NS, AAPL, BRK-B):

```bash
npm run seed
```

Or via the API while the dev server is running:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or click "Load 5 sample items" on the empty watchlist page.

### Seed a Portfolio Trade

The seed script inserts one sample trade (AAPL BUY). To add more, use the portfolio UI or POST to `/api/portfolio`.

## How to Reset the Database

```bash
rm data/valuelens.db data/valuelens.db-shm data/valuelens.db-wal
npm run dev  # DB recreates on first request
npm run seed # Optional: re-seed sample data
```

## How to Re-Seed Sample Data

The seed is idempotent. Running `npm run seed` again updates existing rows rather than duplicating them. Each ticker is upserted by its unique key.

## Environment Variables

None. GrahamScreener is fully self-contained. All configuration is hardcoded:

| Setting | Value | Location |
|---|---|---|
| Database path | `./data/valuelens.db` | `src/lib/db/index.ts` |
| Yahoo session TTL | 30 minutes | `src/lib/yahoo/session.ts` |
| Snapshot cache TTL (stock page) | 6 hours | `src/app/api/yahoo/quote/route.ts` |
| Snapshot cache TTL (screener) | 24 hours | `src/app/api/screener/route.ts` |
| Concurrent Yahoo requests | 6 | `src/app/api/screener/route.ts` |

## Directory Structure After Install

```
valuelens/
├── data/
│   └── valuelens.db          # SQLite database (auto-created)
├── docs/                     # This documentation
├── node_modules/             # Dependencies
├── scripts/
│   ├── seed.ts               # Watchlist seeder
│   └── snapshot.ts           # CLI snapshot tool
├── src/                      # Application source
├── package.json
└── README.md
```

---

Last updated: 2026-05-09 by Claude Cowork
