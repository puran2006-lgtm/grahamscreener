# Deploying GrahamScreener to Vercel + Turso

GrahamScreener uses `@libsql/client` as its database driver — the same driver works both locally (SQLite file) and in production (Turso hosted libSQL). For cloud deployment, use **Turso** as the database and **Vercel** as the host.

## Prerequisites

- A Vercel account (free tier works)
- A Turso account (free tier: 500 DBs, 9 GB storage)
- The Turso CLI installed: `curl -sSfL https://get.tur.so/install.sh | bash`
- A GitHub repo with the GrahamScreener code pushed

## Step 1 — Create a Turso Database

```bash
# Log in
turso auth login

# Create a database in the Sydney region (closest to ASX data)
turso db create grahamscreener --location syd

# Get the connection URL
turso db show grahamscreener --url
# → libsql://grahamscreener-yourname.turso.io

# Create an auth token
turso db tokens create grahamscreener
# → eyJhbGciOi...
```

Save both values — you'll need them in Step 3.

## Step 2 — Initialize the Turso Schema

The app creates tables automatically on first connection (via `CREATE TABLE IF NOT EXISTS`). No manual schema setup is needed. The tables are:

| Table | Purpose |
|---|---|
| `watchlist` | Saved tickers with thesis, targets |
| `portfolio_trades` | Append-only trade log (BUY/SELL) |
| `snapshot_cache` | Yahoo fundamentals cache (24h TTL) |
| `settings` | User preferences (valuation constants, base currency) |
| `alerts` | Price alert definitions with condition, threshold, email |

**First-time production deploy:** after the initial Vercel deploy, seed the watchlist with sample data by running:

```bash
TURSO_DATABASE_URL=libsql://grahamscreener-yourname.turso.io \
TURSO_AUTH_TOKEN=eyJhbGciOi... \
npm run seed
```

This populates the watchlist with 5 sample tickers (CBA.AX, RELIANCE.BO, INFY.NS, AAPL, BRK-B). Optional but recommended for verifying the deployment works end-to-end.

## Step 3 — Deploy to Vercel

### Option A: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add environment variables:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://grahamscreener-yourname.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOi...` |
| `CRON_SECRET` | Random string for cron auth (generate with `openssl rand -hex 32`) |
| `RESEND_API_KEY` | Resend API key (sign up at resend.com — free 100/day) |
| `ALERT_FROM_EMAIL` | `onboarding@resend.dev` (or `alerts@grahamscreener.com` after DNS setup) |

5. Deploy

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link the project
vercel link

# Add secrets
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add CRON_SECRET
vercel env add RESEND_API_KEY
vercel env add ALERT_FROM_EMAIL

# Deploy
vercel --prod
```

## Step 4 — Verify

1. Visit your deployment URL
2. Check `/health` — should show DB connected, tables created
3. Run a screener search to confirm Yahoo Finance calls work
4. Add a watchlist item to confirm DB writes

## Architecture Notes

### How the DB driver works

GrahamScreener uses a **single async driver** (`@libsql/client` + `drizzle-orm/libsql`) for both local and production:

- **Local development:** connects to `file:./data/valuelens.db` (standard SQLite file, zero config, no env vars needed). This is the default.
- **Vercel + Turso:** When `TURSO_DATABASE_URL` is set, the same driver connects to Turso over HTTPS with auth token. The Drizzle ORM schema and all application code are identical — only the connection URL changes.

All database calls throughout the application are fully async (`await`). The driver detection happens in `src/lib/db/index.ts` via the `getDb()` function, which checks for the `TURSO_DATABASE_URL` environment variable.

### Region selection

`vercel.json` is set to `syd1` (Sydney) to minimise latency to ASX data. Change to your preferred region:

| Region | Code | Best for |
|---|---|---|
| Sydney | `syd1` | ASX-focused users |
| Mumbai | `bom1` | BSE/NSE-focused users |
| US East | `iad1` | US market-focused users |
| London | `lhr1` | European users |

Update both `vercel.json` `"regions"` and the Turso `--location` flag to match.

### Rate limits

Yahoo Finance rate-limits per IP. On Vercel, your functions share Vercel's IP pool. If you get 429 errors:

1. Run `npm run snapshot` locally to pre-populate the cache
2. Export the SQLite DB and import into Turso (see below)
3. Rely on the 24h cache — the app won't re-fetch within the TTL

### Migrating local data to Turso

If you have existing local data (watchlist items, trades, cached snapshots) that you want to move to production:

```bash
# Option 1: Full dump and restore
# Export local DB to SQL
sqlite3 data/valuelens.db .dump > dump.sql

# Import into Turso (skip CREATE TABLE lines since app creates them)
turso db shell grahamscreener < dump.sql

# Option 2: Export specific tables only
sqlite3 data/valuelens.db ".dump watchlist" > watchlist.sql
sqlite3 data/valuelens.db ".dump portfolio_trades" > trades.sql
turso db shell grahamscreener < watchlist.sql
turso db shell grahamscreener < trades.sql
```

Note: The `.dump` output includes `CREATE TABLE` statements. Since the app creates tables on first connection via `CREATE TABLE IF NOT EXISTS`, duplicate creates are harmless. If you get `UNIQUE constraint` errors, it means the data already exists in Turso — use `INSERT OR REPLACE` mode or clear the target table first.

### Demo mode on Vercel

Set `DEMO_MODE=true` in Vercel env vars to serve fixture data instead of calling Yahoo. Useful for demos, testing, and avoiding rate limits.

## Costs

| Service | Free tier | Paid |
|---|---|---|
| Vercel | 100 GB bandwidth, 100 hr compute/mo | $20/mo Pro |
| Turso | 500 DBs, 9 GB, 500M row reads/mo | $29/mo Scaler |
| Yahoo Finance | Free (unauthenticated) | N/A |

GrahamScreener easily fits within both free tiers for personal use.

## GitHub Actions Setup

GrahamScreener uses GitHub Actions for automated deployment, scheduled snapshots, CI checks, and dependency updates. All workflows are free for public repositories (unlimited minutes).

### Required Repository Secrets

Add these in your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | How to get the value | What it's for |
|---|---|---|
| `VERCEL_TOKEN` | Visit [vercel.com/account/tokens](https://vercel.com/account/tokens) → "Create Token" → name it `grahamscreener-actions` → copy | Auto-deploy on push |
| `VERCEL_ORG_ID` | Run `cat .vercel/project.json` locally — copy the `orgId` value | Identify Vercel scope |
| `VERCEL_PROJECT_ID` | Run `cat .vercel/project.json` locally — copy the `projectId` value | Identify Vercel project |
| `TURSO_DATABASE_URL` | Run `turso db show grahamscreener --url` | Snapshot writes to production DB |
| `TURSO_AUTH_TOKEN` | Run `turso db tokens create grahamscreener` | Snapshot auth |

### Step-by-step

1. **Get Vercel secrets:**
   ```bash
   # Create a token at https://vercel.com/account/tokens
   # Then get org and project IDs:
   cat .vercel/project.json
   # Output includes "orgId" and "projectId"
   ```

2. **Get Turso secrets:**
   ```bash
   turso db show grahamscreener --url
   # → libsql://grahamscreener-yourname.turso.io

   turso db tokens create grahamscreener
   # → eyJhbGciOi...
   ```

3. **Add all 5 secrets in GitHub:**
   - Go to [github.com/puran2006-lgtm/grahamscreener/settings/secrets/actions](https://github.com/puran2006-lgtm/grahamscreener/settings/secrets/actions)
   - Click "New repository secret" for each of the 5 secrets above

4. **Push to trigger:** `git push origin main` fires the deploy workflow automatically.

See [`docs/14_AUTOMATION.md`](./14_AUTOMATION.md) for full workflow documentation.

---

Last updated: 2026-05-10 by Claude Cowork (v1.5.0 — GitHub Actions automation)
