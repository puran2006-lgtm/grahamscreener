# Changelog

> **Note:** The product was renamed from ValueLens to GrahamScreener on 2026-05-09. Historical entries below retain the original name for accuracy.

All notable changes to GrahamScreener are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.5.9] - 2026-05-11

### Changed
- **Production alert emails now send from `alerts@grahamscreener.com`** — Resend domain verification completed for `grahamscreener.com`. Updated `ALERT_FROM_EMAIL` Vercel env var from `onboarding@resend.dev` (sandbox) to `alerts@grahamscreener.com`. Emails now deliver to any recipient, not just the Resend account owner.
- **Alert emails verified end-to-end in production** — confirmed delivery to `puran.2006@gmail.com` from `alerts@grahamscreener.com` (Resend ID: `8f97003a-59d1-42c6-9de2-c936698af9b2`). Production cron workflow (Hourly Alert Check #22) ran successfully.

### Removed
- **`/api/debug/test-email` endpoint** — temporary endpoint for direct Resend email testing. No longer needed after domain verification.
- **`/api/debug/alerts` endpoint** — temporary endpoint for dumping all alerts + cache + environment status. No longer needed.
- **`/api/debug/seed-cache` endpoint** — temporary endpoint for seeding snapshot_cache with test data. No longer needed.

## [1.5.8] - 2026-05-11

### Fixed
- **Alert emails now deliver successfully** — diagnosed and resolved end-to-end email delivery failure. Root cause: Resend sandbox mode (`onboarding@resend.dev`) restricts recipients to the account owner's email only. Verified email pipeline works (Resend ID: `90656969-782d-4be9-a865-cee6b3b72766`). Production fix requires verifying `grahamscreener.com` domain on Resend and switching `ALERT_FROM_EMAIL` to `alerts@grahamscreener.com`.
- **`/api/cron/check-alerts` now supports `?testPrice=N` query param** — bypasses cache and Yahoo entirely, useful for testing alert condition evaluation without live market data

### Added
- **`/api/debug/test-email` endpoint** (TEMPORARY) — directly tests Resend email delivery for AAPL alert, bypassing cache/Yahoo/condition logic. Delete after domain verification.

### Changed
- **`/api/debug/seed-cache` endpoint** updated — now also updates alert threshold and email, clears debounce, and reads back both rows to verify Turso persistence

## [1.5.7] - 2026-05-11

### Added
- **`/api/debug/seed-cache` endpoint** (TEMPORARY) — POST endpoint that upserts a test AAPL price ($200.50) into `snapshot_cache` for end-to-end alert email verification. Delete after confirming emails work.

## [1.5.6] - 2026-05-10

### Changed
- **Alert checker now uses cache-first pricing** — `/api/cron/check-alerts` reads from `snapshot_cache` table (populated by GitHub Actions snapshots) instead of calling Yahoo directly. Yahoo is only used as a fallback when cache is missing or stale (>25 hours). If both fail, the individual alert is skipped without crashing the batch.
- Added `priceSource` field to alert diagnostics — logs and JSON response now show whether price came from `cache`, `yahoo`, or `none`

### Fixed
- **Yahoo 429 errors on Vercel** — Vercel's shared IP pool triggers Yahoo rate-limits. Cache-first approach eliminates Yahoo calls in the common case (daily snapshot keeps cache <25h old)

## [1.5.5] - 2026-05-10

### Fixed
- **Alert emails never reaching Resend** — added comprehensive diagnostics to `/api/cron/check-alerts` so the JSON response body (captured by GitHub Actions) now includes: active alert count, per-alert price fetch + condition evaluation + email send result, environment variable status, and a full trace log
- **Silent failures invisible** — `sendPriceAlert` now logs Resend request/response details to console

### Added
- **`/api/debug/alerts` endpoint** (TEMPORARY) — returns all alerts in DB + environment variable status for production debugging. Delete after confirming emails work.
- Diagnostic `details[]` array in check-alerts response showing per-alert: ticker, current price, condition result, debounce status, email send outcome

## [1.5.4] - 2026-05-10

### Added
- **Reply-To header** on alert emails — replies go to `hello@grahamscreener.com` instead of the no-reply alerts address
- **Footer** in app layout with copyright, email link, and GitHub link
- **`/about` page** with product description, founder note, contact emails, and open-source links
- **Contact section** in README with `hello@` and `partnerships@` addresses
- `.env.example` with all environment variables documented
- `docs/16_EMAIL_SETUP.md` — Cloudflare Email Routing + Resend setup guide with DKIM/SPF records and Gmail "Send mail as" instructions

### Changed
- `ALERT_REPLY_TO` env var added to alert email code (default: `hello@grahamscreener.com`)
- Updated env var tables in `docs/12_DEPLOY.md` and `docs/13_ALERTS.md`

## [1.5.3] - 2026-05-10

### Changed
- **Dependabot now ignores all major version bumps** — `ignore: [{ dependency-name: "*", update-types: ["version-update:semver-major"] }]` added to both npm and github-actions ecosystems. Patch and minor updates remain auto-grouped weekly. Major upgrades require manual `npm install <pkg>@latest` after reading the migration guide.
- Separated npm patches and minors into distinct Dependabot groups
- Added `github-actions` label to Actions dependency PRs
- Added PR limits: 5 npm, 3 Actions
- Added ACST-aware schedule (`08:00 Australia/Adelaide`)

## [1.5.2] - 2026-05-10

### Changed
- **Migrated hourly alert checks from Vercel Cron to GitHub Actions** — Vercel Hobby (free tier) limits crons to daily, blocking deploy. New `check-alerts.yml` workflow calls the same `/api/cron/check-alerts` endpoint hourly with no frequency limits on public repos.
- Removed `crons` array from `vercel.json`
- Added Vercel Pro migration path to `docs/13_ALERTS.md`
- Added alert check workflow to `docs/14_AUTOMATION.md` usage table

## [1.4.1] - 2026-05-10

### Fixed
- Removed unused `eq` import from `drizzle-orm` in `src/app/api/alerts/route.ts` (lint error: `@typescript-eslint/no-unused-vars`)
- Removed unused `TickerSearch` import in `src/components/alerts/alert-modal.tsx` (lint error: `@typescript-eslint/no-unused-vars`). The existing `TickerSearch` component navigates on selection and lacks an `onSelect` callback, making it incompatible with the modal's form-field pattern. Ticker autocomplete in the alert modal is deferred to a future release.

## [1.5.0] - 2026-05-10

### Added
- **GitHub Actions auto-deploy** — push to `main` triggers type-check → build → deploy to Vercel via CLI (`deploy.yml`)
- **Daily watchlist snapshot** — cron at 8am AEST fetches fresh Yahoo data for watchlist tickers into production Turso (`snapshot-watchlist.yml`)
- **Weekly full universe snapshot** — cron Sunday 2am AEST refreshes all 200 tickers (`snapshot-full.yml`)
- **CI checks on PRs** — lint, type-check, and build run on every pull request and non-main branch push (`ci.yml`)
- **Dependabot** — weekly npm + GitHub Actions dependency updates, grouped patch/minor PRs, auto-assigned (`dependabot.yml`)
- **LICENSE** file (MIT, copyright puran2006-lgtm)
- README status badges: deploy, license, live site, GitHub stars
- `docs/14_AUTOMATION.md` — full GitHub Actions documentation
- GitHub Actions secrets setup guide in `docs/12_DEPLOY.md`
- Automatic GitHub Issue creation on snapshot workflow failure (label: `automation-failure`)
- Retry-once policy on snapshot workflows (5-min wait between attempts)

## [1.4.0] - 2026-05-10

### Added
- **Email price alerts** — set target buy, stop loss, or percentage-change alerts on any ticker; evaluated hourly by Vercel Cron and delivered via Resend
- `alerts` table in SQLite schema with 4 condition types, 24h debounce, and reference price for percentage alerts
- `/alerts` page with active/paused/recently-triggered sections, create/edit modal, pause/resume/delete actions
- CRUD API routes: `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/[id]`
- Cron endpoint `GET /api/cron/check-alerts` — evaluates all active alerts against live Yahoo prices, sends email on trigger
- `src/lib/email.ts` — Resend email helper with dark-themed HTML template
- `scripts/test-email.ts` — CLI script to verify Resend setup (`npm run test-email`)
- Demo alert seeded by `npm run seed` (AAPL target buy at $100)
- Vercel Cron schedule in `vercel.json` (`0 */1 * * *` — hourly)
- `/alerts` link in sidebar nav + `g a` keyboard shortcut
- `resend` dependency (^4.8.0)
- `docs/13_ALERTS.md` — complete alerts documentation

### Changed
- Sidebar nav expanded to 5 items (added Alerts with Bell icon)
- Mobile bottom nav changed from 4-col to 5-col grid
- `vercel.json` updated with cron config and maxDuration for check-alerts route

## [1.3.4] - 2026-05-10

### Changed
- Snapshot CLI (`scripts/snapshot.ts`) rewritten for Yahoo rate-limit resilience: sequential processing (no parallel workers), 1.5–2.5s random jitter between requests, exponential backoff on 429 (30s → 60s → 120s), 5-minute pause after 3 consecutive 429s
- Added CLI flags: `--limit N` (cap ticker count), `--tickers AAPL,CBA.AX` (specific tickers), `--watchlist-only` (snapshot only watchlist tickers)
- Progress logging every 10 tickers with success/fail counts and elapsed time
- End-of-run summary groups failed tickers by exchange
- Updated `docs/02_RUNNING.md` with new CLI flags and rate-limit behaviour
- Updated `docs/06_DATA_SOURCE.md` to reflect sequential processing replacing 6-concurrent-worker approach

## [1.3.3] - 2026-05-10

### Fixed
- `scripts/seed.ts` now seeds an idempotent sample trade (1 AAPL BUY, 10 @ $150 on 2026-05-01) into `portfolio_trades`. Previously, the seed only populated `watchlist`; against a fresh production Turso database this surfaced as "0 rows in `portfolio_trades`" after a successful seed because there was no insert code. Locally the bug was masked because the Portfolio UI was used to manually `Log a trade` during development, which wrote to the local SQLite file.
- Idempotency is keyed on `(ticker, side, tradeDate)` — a re-run reports `0 inserted, 1 updated` and never duplicates the row.
- Added explicit per-trade logging (`Inserting trade: …` / `Trade inserted, id=…` / `Trade already existed (id=…); refreshed in place`) and full-stack error reporting on failure, so any future Turso insert miss won't be silent.

## [1.3.2] - 2026-05-09

### Fixed
- Removed unused `exportTradesToCsv` import in `csv-import-modal.tsx` (lint error blocking build)
- Removed unused `router` variable and `useRouter` import in `screener-view.tsx` (lint error blocking build)

## [1.3.1] - 2026-05-09

### Changed
- **BREAKING:** Replaced `better-sqlite3` (synchronous) with `@libsql/client` (async) as the sole database driver
- All ~30 DB call sites converted from synchronous to async (`await`)
- Database access changed from direct `db` export to `getDb()` async factory function
- CLI scripts (`seed.ts`, `snapshot.ts`) wrapped in async IIFE
- CSV bulk import now uses proper `db.transaction(async (tx) => {...})` for atomic inserts
- `getSettings()`, `saveSettings()`, `getBaseCurrency()`, `saveBaseCurrency()` are now async functions returning Promises
- Deploy docs updated to reflect single-driver architecture and include seed/migration instructions

### Removed
- `better-sqlite3` dependency (was `^12.9.0`)
- `@types/better-sqlite3` dev dependency (was `^7.6.13`)
- Synchronous `db` Proxy export from `src/lib/db/index.ts`

### Fixed
- Portfolio CSV import now uses proper libsql transaction for atomicity (previously abandoned transactions due to Drizzle/better-sqlite3 API mismatch)

## [1.3.0] - 2026-05-09

### Added
- CSV portfolio import/export with auto-detection for 5 broker formats (GrahamScreener, Stake, CommSec, Interactive Brokers, Zerodha) and manual column-mapping fallback
- `papaparse` dependency for CSV parsing and generation
- Bulk import API endpoint (`POST /api/portfolio/import`) with validation
- Sample CSV template at `/public/sample-template.csv`
- Configurable valuation settings: WACC, tax rate, AAA bond yield, base multiplier, growth cap
- Settings table in SQLite schema for persisting user preferences
- Settings API (`GET/PUT /api/settings`) and settings drawer UI with gear icon in sidebar
- Screener preset URLs: filters encoded in URL query params, shallow routing, "Share link" button
- Multi-currency portfolio: base currency selector (USD/AUD/INR/GBP/EUR), FX rate fetching from Yahoo with 24h cache, hardcoded fallback rates, converted KPI values
- FX API endpoint (`GET/PUT /api/fx`) for rate fetching and base currency switching
- FX fixture data for demo mode (`fixtures/fx-rates.json`)
- `@libsql/client` dependency (Turso compatibility — ready for async migration)
- `vercel.json` with `syd1` region for Vercel deployment
- `/docs/12_DEPLOY.md` — complete Turso + Vercel deployment guide

### Changed
- `epvPerShare()` and `grahamGrowth()` now accept optional `ValuationSettings` override parameter
- `computeValuations()` passes settings through to EPV and Graham Growth formulas
- Stock detail page reads valuation settings from DB before computing valuations
- Chart colours now use CSS variables (`--chart-negative`, `--chart-benchmark`) for theme-aware rendering
- Portfolio KPI cards display values in user's selected base currency
- Screener page wrapped in `<Suspense>` boundary for `useSearchParams()` compatibility

### Fixed
- Benchmark chart line used hardcoded `hsl(220 90% 70%)` — now uses `--chart-benchmark` CSS variable
- Price chart negative colour used hardcoded `hsl(0 80% 60%)` — now uses `--chart-negative` CSS variable

## [1.2.1] - 2026-05-09

### Changed
- Rebranded from ValueLens to GrahamScreener following registration of grahamscreener.com
- All user-facing strings, page titles, metadata, and documentation updated
- `package.json` name field changed to `grahamscreener`
- Tagline updated to "Graham-discipline value screener for ASX, BSE, NSE, and US equities"
- Project folder structure and database filename unchanged
- Historical decision/changelog/report entries preserved with rebrand note prepended

## [1.2.0] - 2026-05-09

### Added
- In-app documentation viewer at `/docs` with sidebar navigation, prev/next links, and markdown rendering via react-markdown + remark-gfm + rehype-highlight
- `DocRenderer` client component (`src/components/docs/doc-renderer.tsx`) with syntax highlighting and dark-theme styling
- Demo mode: `npm run dev:demo` serves fixture data from `/fixtures` — no Yahoo Finance dependency
- 32 fixture JSON files covering 5 seeded tickers (full quote + chart) plus screener data for 4 exchanges
- `src/lib/demo.ts` utility module: `isDemoMode()`, `demoQuote()`, `demoChart()`, `demoSearch()`, `demoUniverse()`
- Demo banner component showing amber notification when demo mode is active
- "Docs" link in sidebar navigation (near Health)
- Documentation accuracy audit: 22 checks performed, 6 fixes applied (all related to Health page/route)
- `docs/AUDIT_LOG_v1.2.md` — full audit trail with methodology and results

### Changed
- Yahoo client (`src/lib/yahoo/client.ts`) now checks `isDemoMode()` before making network calls
- Screener API route serves fixture data when in demo mode
- Health API route includes `demoMode` flag in response
- Updated `00_START_HERE.md` with docs viewer and demo mode entries
- Updated `04_ARCHITECTURE.md` with health route in folder structure and diagram

### Fixed
- Added missing `/api/health` to API routes table in `02_RUNNING.md`
- Added missing `/health` to URL map in `02_RUNNING.md`
- Added missing `health/route.ts` and `health/page.tsx` to folder tree in `04_ARCHITECTURE.md`

## [1.1.0] - 2026-05-09

### Added
- Complete documentation suite: 12 files in `/docs` covering setup, features, architecture, formulas, data sources, screener guide, troubleshooting, and roadmap
- `docs/00_START_HERE.md` — single entry point with quick-start and doc index
- `docs/05_FORMULAS.md` — every valuation formula with math, source, code path, and worked examples
- `docs/06_DATA_SOURCE.md` — Yahoo endpoints, rate limits, cache TTLs, and 3 alternative data providers
- `docs/08_SCREENER_GUIDE.md` — full 200-ticker universe table with names and sectors, plus Graham preset definitions
- `docs/09_TROUBLESHOOTING.md` — 20+ symptom/cause/fix entries
- `docs/10_ROADMAP.md` — prioritised feature backlog with effort estimates and API cost analysis
- Defensive Investor and Enterprising Investor screener presets (Graham Ch. 14 & 15 thresholds)
- `TEST_RESULTS.md` — smoke test results from Cowork verification pass
- `COWORK_REPORT.md` — full session report

### Changed
- Updated `README.md` to point to `/docs/00_START_HERE.md` as canonical entry point
- Appended "Cowork Fixes" section to `DECISIONS.md`

### Fixed
- Documented WAL checkpoint requirement for clean DB state after build

## [1.0.0] - 2026-05-09

### Added
- Multi-exchange value-investing screener covering ASX, BSE, NSE, and US equities
- Stock detail page with live Yahoo Finance data, price charts (1M–Max), and fundamentals table
- Four valuation models: Graham Number, NCAV per share, EPV per share, Graham Growth formula
- Margin-of-safety bar chart comparing current price to each intrinsic value estimate
- Colour-coded MoS indicators (green/amber/red) with Graham-aligned thresholds
- Watchlist with thesis, target buy price, stop loss, and position size fields
- Portfolio trade log with FIFO cost-basis computation and realised P&L tracking
- Screener with 5 Graham-style filters across 200 large-caps (50 per exchange)
- Three screener presets: Defensive (Graham), Income, Quality + Cheap
- Snapshot system for batch-fetching fundamentals into SQLite cache
- CLI tools: `npm run seed` (watchlist seeder), `npm run snapshot` (batch fundamentals fetch)
- Command palette (Cmd+K) with global ticker search and page navigation
- Keyboard shortcuts: `g d/s/w/p` for Dashboard/Screener/Watchlist/Portfolio
- Yahoo Finance session manager with cookie + crumb bootstrap and retry logic
- SQLite database with WAL mode via better-sqlite3 + Drizzle ORM
- Dark mode default with light mode toggle (next-themes)
- Glassmorphism UI inspired by Linear/Vercel/Stripe
- Responsive layout: sidebar nav on desktop, bottom nav on mobile
- Empty states with SVG illustrations and seed CTAs
- Zero environment variables — fully self-contained local app

---

Last updated: 2026-05-10 by Claude Cowork
