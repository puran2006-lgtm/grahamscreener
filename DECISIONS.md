# DECISIONS

> **Note:** The product was renamed from ValueLens to GrahamScreener on 2026-05-09. Historical entries below retain the original name for accuracy.

This file records every non-obvious choice I made while building GrahamScreener (originally ValueLens) autonomously, so a future maintainer (or reviewer) can understand the *why* — not just the *what*.

## Data source

**Decision:** Yahoo Finance v8 chart + v10 quoteSummary unauthenticated endpoints.
**Why:** Free, no API key, supports all four required exchanges via suffixed tickers (`.AX`, `.BO`, `.NS`, none for US). The hard rule was no paid APIs.
**Trade-off:** Yahoo changes JSON shape occasionally and rate-limits per IP. We mitigate with cookie + crumb session bootstrapping and a SQLite snapshot cache.

## Cookie + crumb session

**Decision:** Bootstrap cookies via `fc.yahoo.com`, then fetch a crumb from `query2.finance.yahoo.com/v1/test/getcrumb`. Cache the pair in-process for 30 min; refresh on 401/403/429.
**Why:** Yahoo's `quoteSummary` started returning `Unauthorized` in late 2023 unless requests carry both an `A1`/`A3` cookie and a crumb. The chart endpoint mostly tolerates a missing crumb; quoteSummary doesn't.
**Trade-off:** EU consent regions return HTML on `getcrumb` — we detect and fall through (chart still works).

## Database

**Decision:** `better-sqlite3` + Drizzle ORM, file at `./data/valuelens.db`. Lazy singleton via a Proxy so the connection only opens on first DB access.
**Why:** Hard rule was no env vars and pure-local. SQLite + WAL is the right answer. The Proxy lazy-init avoids `SQLITE_BUSY` during Next.js's parallel "Collecting page data" phase, where multiple worker processes would otherwise race to open the file.
**Trade-off:** Drizzle's type inference adds a tiny runtime cost; unimportant here. Schema migrations are inline `CREATE TABLE IF NOT EXISTS` rather than drizzle-kit migrations — fine for a single-developer local app.

## Tables

- `watchlist` — one row per ticker; `targetBuyPrice`, `stopLoss`, `positionSizePct` all nullable so users can add a ticker before sizing it.
- `portfolio_trades` — append-only event log (BUY/SELL with qty, price, fees, date, notes). Positions are derived via FIFO matching at read time. No materialised positions table — keeps trade edits simple and avoids reconciliation bugs.
- `snapshot_cache` — keyed by ticker; stores the full Yahoo `Fundamentals` JSON + `fetchedAt`. Used by the stock page (1 h freshness) and screener (24 h).

## Cost basis: FIFO

**Decision:** First-In-First-Out. Sells consume the oldest open lots; realized P&L per trade = `qty × (sellPrice − lotCost)`.
**Why:** FIFO is the default in most jurisdictions for individual investors when not otherwise specified, and it's deterministic and easy to explain.
**Trade-off:** No support for tax-lot picking, average-cost accounting, or wash-sale handling. Out of scope for v1.

## Universe

**Decision:** Hand-picked 50 large-caps per exchange in `src/lib/universe/index.ts`. Liquid names only (BHP, CBA, Reliance, TCS, Apple, Berkshire, etc.).
**Why:** A static list is the simplest answer to the spec ("hardcode the lists; pick liquid large-caps"). It's also the most resilient — Yahoo's index-constituent endpoints are flaky.
**Trade-off:** Doesn't auto-update as index membership changes. Easy to swap names later.

## Benchmark indices

**Decision:** ASX → `^AXJO` (S&P/ASX 200), BSE → `^BSESN` (SENSEX), NSE → `^NSEI` (NIFTY 50), US → `^GSPC` (S&P 500).
**Why:** Index symbols are the most reliable on Yahoo (no dividend / split issues, deep history). Spec said "ASX200/SENSEX/S&P500 index ETF" — we use the indexes themselves rather than ETFs to avoid fund-specific tracking error and because Yahoo doesn't return cleanly-comparable adjusted-close on every region's flagship ETF.

## Valuations

- **Graham Number** — needs positive EPS and BVPS, otherwise we render `—` and surface "Requires positive trailing EPS and book value per share" in the tooltip.
- **NCAV** — needs current assets, total liabilities, and share count. Rare for large-caps to be cheap on this metric, by design.
- **EPV** — Greenwald-style steady-state. We use a fixed 25% tax rate and 9% discount rate (a reasonable long-run equity premium for liquid large-caps). No reliable WACC is available unauthenticated.
- **Graham Growth** — `EPS × (8.5 + 2g) × 4.4 / Y`, with `g` capped at 15% and `Y = 4.5%` as an AAA-bond proxy. We default `g` to 5% when Yahoo's `earningsGrowth` is missing.

**Why fixed constants?** They're the conservative defaults Graham/Greenwald themselves recommend, and exposing them as user-tunable would explode the UI. Easy to lift to a settings panel later.

## Margin-of-safety colour scale

| MoS | Label | Colour |
|---|---|---|
| ≥ 30% | Wide MoS | green |
| ≥ 10% | Some MoS | light green |
| ≥ −10% | Around fair | amber |
| < −10% | Overvalued | red |

These thresholds are conservative and align with how Graham/Greenwald describe entry zones.

## UI / Design

**Decision:** Dark-mode default. Glassmorphism cards (`bg-card/40 backdrop-blur-xl ring-1`). Inter for body, ui-monospace for numbers. Sidebar nav on desktop, bottom nav on mobile.
**Why:** Spec called out Linear / Vercel / Stripe as references — they all share a low-saturation dark surface, generous whitespace, and monospaced numbers for tabular data.
**Trade-off:** Glass cards depend on `backdrop-blur-xl` — Safari < 16 won't render them as crisply. Acceptable.

## shadcn/ui

**Decision:** Hand-write the primitives (button, card, dialog, command, …) directly under `src/components/ui` rather than running the `shadcn` CLI.
**Why:** The CLI is interactive (asks about path/style/CSS-vars). Auto mode forbids interactive prompts. The primitives are MIT-licensed and shadcn explicitly recommends copy-pasting them.

## Theming

**Decision:** `next-themes` with `defaultTheme="dark"` and `enableSystem={false}`.
**Why:** Spec required dark by default with a light toggle. We avoid following the system theme so first-paint is deterministic and matches the marketing aesthetic.

## Command palette

**Decision:** `cmdk` inside a Radix dialog, keyed to `⌘K` / `Ctrl+K`. Inline ticker search on the dashboard uses the same Yahoo search endpoint but renders a custom popover (not the dialog) so power users can stay on the page.
**Why:** Two complementary entry points serve different mental models — global jump (palette) vs landing-page hero (inline).

## Keyboard shortcuts

`g` then `{d, s, w, p}` for go-to navigation. The shell ignores presses inside inputs/textareas to avoid stealing typing. ⌘K toggles the palette globally.

## Loading + empty states

Every async surface has either skeletons or `<EmptyState>` with a bespoke SVG illustration and a CTA. The watchlist empty state offers a one-click "Load 5 sample items" button that wires through `/api/seed`.

## Concurrency

**Decision:** 6 parallel Yahoo requests when populating the snapshot cache.
**Why:** Yahoo seems to tolerate this comfortably; pushing to 12 starts to draw 429s. Worth tuning per-deployment if needed.

## Build hygiene

- All API routes are `runtime = "nodejs"` and `dynamic = "force-dynamic"` — they touch SQLite and live HTTP, neither of which can be statically prerendered.
- `maxDuration = 60` (or 120 for full snapshot) to give serverless adapters headroom.
- The DB Proxy fix surfaced because Next.js spawns multiple page-data workers; without it, build fails with `SQLITE_BUSY`.

## What I deliberately skipped

- **Auth / multi-user.** Hard rule said no signup. Single-user local app.
- **Live websocket pricing.** Yahoo doesn't expose a free WS feed; polling on demand is fine.
- **Currency conversion.** Each ticker stays in its native currency; the portfolio's KPIs (cost basis, market value, P&L) are summed naively in mixed currencies. A correct implementation would convert via a daily FX snapshot — out of scope for v1, but flagged here.
- **Backtesting.** Out of scope; the benchmark chart compares forward from earliest buy.
- **Drizzle migrations.** `CREATE TABLE IF NOT EXISTS` covers the same ground at this scale.

## What I'd tackle next

1. Currency normalisation in the portfolio (single base currency, FX from Yahoo).
2. CSV import for trades.
3. Per-ticker valuation history (snapshot a row per day to chart the drift).
4. Configurable WACC/tax/AAA-yield in a settings drawer.
5. Save & share screener presets via a URL parameter.

---

## Cowork Fixes (2026-05-09)

### Screener preset enhancement

**Change:** Added "Enterprising (Graham)" preset to the screener alongside the existing Defensive preset. Also tightened the Defensive preset to include `maxDebtToEquity: 1`.

**Why:** Graham's *Intelligent Investor* Ch. 14 (Defensive) and Ch. 15 (Enterprising) define two distinct investor profiles with different thresholds. The Enterprising preset uses stricter values: P/E ≤ 10, P/B ≤ 1.2, Current Ratio ≥ 1.5, D/E ≤ 0.5.

### Health page

**Change:** Added `/health` page and `/api/health` route showing DB size, table row counts, cache freshness breakdown, and snapshot-per-exchange status.

**Why:** Operational visibility. When Yahoo starts rate-limiting or the cache goes stale, the health page surfaces it immediately rather than requiring manual SQLite inspection.

### Documentation suite

**Change:** Created 12 markdown files in `/docs` covering every aspect of the application: setup, running, features, architecture, formulas, data sources, watchlist/portfolio guide, screener guide, troubleshooting, roadmap, and changelog.

**Why:** The codebase had excellent inline comments and a thorough DECISIONS.md, but no user-facing documentation. The docs make it possible for someone new to understand, run, and extend ValueLens without reading source code.

### Docs index page (skipped)

**Decision:** Did not implement a `/docs` in-app page with rendered markdown.

**Why:** Would require adding `react-markdown` + `remark-gfm` as dependencies and creating a sidebar renderer — significant complexity for marginal value when the markdown files are perfectly readable in any editor or GitHub. The `00_START_HERE.md` file serves as an effective entry point with a linked table of contents.

---

## Cowork v1.2 Changes (2026-05-09)

### In-app docs viewer (reverses "skipped" decision above)

**Decision:** Added `/docs` index page and `/docs/[slug]` dynamic routes with react-markdown + remark-gfm + rehype-highlight.

**Why:** Reconsidered after v1.1 — having docs viewable inside the app alongside the tools they describe is worth the 3 extra deps. The DocRenderer component uses scoped CSS with One Dark-style syntax highlighting that matches the ValueLens dark theme. Non-numbered docs (like AUDIT_LOG) render without sidebar nav.

### Demo mode

**Decision:** `DEMO_MODE=true` env var switches Yahoo client to serve fixture JSON from `/fixtures`. Fixture data ships with the repo. `npm run dev:demo` is a convenience script.

**Why:** Three problems solved at once: (1) Yahoo rate-limits block development loops; (2) offline/airplane development is impossible without it; (3) reviewers and contributors can evaluate the app without network access. The demo module (`src/lib/demo.ts`) intercepts at the Yahoo client level, so all downstream code (valuations, screener filters, chart rendering) runs identically. No mock boundaries deeper in the stack.

### Documentation accuracy audit

**Decision:** Created `docs/AUDIT_LOG_v1.2.md` documenting 22 cross-reference checks between docs and source code.

**Why:** v1.1 docs were written from source inspection but never verified against a running build. The audit caught 6 omissions (all related to the Health page/route not being reflected) and confirmed 100% accuracy on formulas, tickers, schema, and cache TTLs.

---

## Rebrand 2026-05-09 — ValueLens to GrahamScreener

**Decision:** Renamed the product from "ValueLens" to "GrahamScreener" across all user-facing strings, metadata, and documentation.

**Why:** Domain availability — `grahamscreener.com` was registered (Cloudflare, auto-renews May 2027). The name directly communicates the core audience (Graham-style value investors) and function (screener), which is stronger for SEO and word-of-mouth than the generic "ValueLens".

**Scope:**
- All page titles, metadata (`<title>`, `<meta description>`)
- Sidebar brand name and tagline in `app-shell.tsx`
- Docs viewer heading in `docs/page.tsx`
- `package.json` and `package-lock.json` name field
- All `/docs/*.md` product name references
- `README.md` hero section + description

**Intentionally NOT changed:**
- Folder name (`/valuelens`) — stays as-is per decision
- SQLite database filename (`valuelens.db`) — renaming later if needed
- Import paths and module aliases
- Historical entries in DECISIONS.md, CHANGELOG.md, COWORK_REPORT*.md, TEST_RESULTS.md, AUDIT_LOG_v1.2.md — these retain original names with a rebrand note prepended

---

## Cowork v1.3 Changes (2026-05-09)

### CSV import/export

**Decision:** Used `papaparse` for CSV parsing/generation. Auto-detect 5 broker formats by header patterns; fall back to manual column-mapping UI when unknown.

**Why:** Users already have trades in broker CSVs. Requiring manual entry is a friction barrier. The 5 supported brokers (Stake, CommSec, Interactive Brokers, Zerodha, GrahamScreener round-trip) cover the 4 exchanges the app targets. Manual mapping handles everything else.

**Trade-off:** Broker CSV formats vary even within the same broker over time. The header-pattern detection is best-effort. The fallback column-mapping UI handles edge cases.

### Configurable valuation constants

**Decision:** Stored as JSON in a `settings` SQLite table. Settings drawer in sidebar with gear icon. EPV and Graham Growth functions accept an optional `ValuationSettings` parameter, defaulting to hardcoded Graham/Greenwald values.

**Why:** The original hardcoded constants (WACC 9%, tax 25%, AAA yield 4.5%) are conservative defaults but not universally appropriate. An Indian investor might use different tax/discount rates. Making them configurable doesn't add UI complexity because the drawer is hidden behind a gear icon.

**Trade-off:** Settings are global — not per-ticker or per-exchange. That's a deliberate simplification; per-exchange WACC would be more correct but the UI complexity isn't worth it for v1.3.

### Screener preset URLs

**Decision:** Encode screener filters as URL query params (`ex`, `pe`, `pb`, `cr`, `de`, `dy`). Shallow-route on filter change. "Share link" button copies the full URL to clipboard.

**Why:** Makes screens shareable and bookmarkable. Short param names keep URLs clean. Shallow routing (replaceState) avoids server round-trips.

### Multi-currency portfolio

**Decision:** Base currency setting persisted in `settings` table. FX rates fetched from Yahoo Finance chart endpoint (e.g. `AUDUSD=X`) with 24h SQLite cache and hardcoded fallback rates. KPI cards show values converted to base currency.

**Why:** The portfolio inherently spans 4 currencies (USD, AUD, INR, plus whatever else). Showing naive sums across currencies is misleading. Converting to a single base currency gives a true portfolio-level view.

**Trade-off:** FX conversion is applied to KPIs only — individual position rows still show native currency. A future version could add an inline conversion column. Fallback rates are approximate (May 2026 values) and will drift over time; the 24h Yahoo cache is the primary source.

### Vercel + Turso deploy readiness

**Decision:** Added `@libsql/client` as a dependency and `vercel.json` with `syd1` region. Created detailed deploy docs. Kept `better-sqlite3` as the active driver — did NOT migrate all DB calls to async.

**Why:** A full async migration would touch 30+ call sites across API routes, server components, and utility modules. The risk of introducing bugs outweighs the benefit for v1.3. The current `better-sqlite3` driver works on Vercel's Node.js runtime. The `@libsql/client` dependency is installed and ready for when the async migration is needed (e.g. for edge runtime or embedded replicas).

### Chart CSS variables

**Decision:** Added `--chart-negative` and `--chart-benchmark` CSS variables to both light and dark themes. Replaced 4 hardcoded HSL values in price-chart.tsx and portfolio-view.tsx.

**Why:** The existing chart colours were hardcoded for dark mode. In light mode, the benchmark line (`hsl(220 90% 70%)`) was too bright and the negative red was slightly off. CSS variables let each theme define appropriate values.

---

## Cowork v1.3.1 Changes (2026-05-09)

### better-sqlite3 → @libsql/client async migration

**Decision:** Replaced `better-sqlite3` entirely with `@libsql/client` + `drizzle-orm/libsql`. All ~30 DB call sites converted to async. Removed both `better-sqlite3` and `@types/better-sqlite3` from dependencies.

**Why:** The v1.3 Vercel+Turso deploy readiness work installed `@libsql/client` but kept `better-sqlite3` as the active driver to avoid touching 30+ call sites. This created a false sense of deploy readiness — the app would crash on Turso because all DB operations were synchronous. Completing the migration makes the app actually deployable to Vercel+Turso with zero code changes.

**Approach:**
- Changed `src/lib/db/index.ts` from exporting a synchronous `db` Proxy to exporting an async `getDb()` factory function
- Local dev: `createClient({ url: 'file:./data/valuelens.db' })` — same SQLite file format, no migration needed
- Production: `createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN })`
- Schema init: libsql doesn't support multi-statement `exec()`, so each `CREATE TABLE` runs as a separate `client.execute()` call
- Every file importing `db` changed to `const db = await getDb()` then `await` on all `.all()`, `.get()`, `.run()` calls
- CLI scripts wrapped in async IIFE
- Settings utility functions (`getSettings`, `saveSettings`, `getBaseCurrency`, `saveBaseCurrency`) changed from sync to async

**Trade-off:** The `getDb()` pattern adds one `await` call per request handler. This is negligible overhead. The real cost was the migration effort (~30 call sites), but since all API routes were already `async` functions, the changes were mechanical — just adding `await`. The trickiest part was ensuring the Proxy-based lazy init was replaced with a proper async singleton pattern (Promise deduplication via `_initPromise`).

### CSV import transaction fix

**Decision:** CSV bulk import now uses `db.transaction(async (tx) => {...})` with the libsql driver for atomic multi-row inserts.

**Why:** In v1.3, the transaction was abandoned because Drizzle's `db.transaction()` API on better-sqlite3 returned a synchronous callable, which caused TS2349 errors. The code fell back to sequential inserts without atomicity. With drizzle-orm/libsql, `db.transaction(async (tx) => {...})` works correctly — the async callback receives a transaction-scoped client, and all inserts within it are atomic.

**Trade-off:** None. This is strictly an improvement — failed imports no longer leave partial data.

---

## Cowork v1.3.2 Fixes (2026-05-09)

### Lint cleanup — unused imports/variables

**Decision:** Removed `exportTradesToCsv` import from `csv-import-modal.tsx` and `useRouter`/`router` from `screener-view.tsx`.

**Why:** Both were dead code left over from v1.3 development. `exportTradesToCsv` was imported into the modal but export is handled by the parent `portfolio-view.tsx`. `useRouter` was imported for the screener's URL sync but `window.history.replaceState` was used instead (shallow routing without triggering React re-renders). ESLint's `no-unused-vars` rule flagged both, blocking `npm run build`.


## v1.3.3 — Seed script: trade insertion was missing

**Decision:** Added an idempotent `SEED_TRADES` block to `scripts/seed.ts` that inserts one sample AAPL BUY (10 @ $150 on 2026-05-01).

**Why this was a real bug:** The original seed script only populated `watchlist`. During v1.x development, sample trades were entered into the local SQLite via the Portfolio UI's `Log a trade` form, which made it look like seed had inserted them — but it never had. On a fresh Turso production DB, `npm run seed` would print `Seeded watchlist: 5 inserted, 0 updated` and exit success while leaving `portfolio_trades` empty, with no log line to indicate the omission.

**How idempotency works:** The natural key for a seed trade is `(ticker, side, tradeDate)` — a trade is a unique event in time, so re-running cannot create a second row for the same event. We use a fixed UTC date (`Date.UTC(2026, 4, 1)`) rather than `Date.now()` so the lookup is deterministic across runs. On match, we refresh `quantity`/`price`/`fees`/`notes` in place rather than skipping, so a typo in the seed constant is correctable by re-running.

**How this avoids future silent failures:** The script now logs `Inserting trade: …`, then either `Trade inserted, id=N` or `Trade already existed (id=N); refreshed in place`, and any thrown error is caught, logged with stack, and re-thrown so the process exits non-zero. A future seed-time DB error against Turso will be loud, not silent.

**Trade-off:** The seeded trade's `tradeDate` is a hard-coded constant. If the constant is bumped in code, the next run will insert a *new* row (because the natural key includes `tradeDate`) rather than updating the old one. This is intentional — bumping the date represents a different event. Manual cleanup is one DELETE if a maintainer wants to drop the historical row.

---

## v1.3.4 — Snapshot script rewrite for rate-limit resilience

**Decision:** Rewrote `scripts/snapshot.ts` from a 6-concurrent-worker model to fully sequential processing with jitter and exponential backoff.

**Why:** The original snapshot script fired 6 parallel requests at Yahoo. On a full 200-ticker run, this reliably triggered 429 rate-limit responses within the first 30–50 tickers, causing 5–15% failure rates and risking a per-IP soft-ban (1–24h). The new approach trades speed for reliability: sequential requests with 1.5–2.5s random jitter, exponential backoff on 429 (30s → 60s → 120s), and a 5-minute cooldown after 3 consecutive 429s.

**CLI flags added:**
- `--limit N` — process only the first N tickers (useful for testing)
- `--tickers AAPL,CBA.AX` — snapshot specific tickers only
- `--watchlist-only` — snapshot only tickers in the watchlist table (~5 rows after seed)

**Why these flags:** The full 200-ticker run now takes 6–10 minutes. During development and CI, you rarely need all 200. `--watchlist-only` is the fastest path (~5 tickers, ~15 seconds) for verifying the pipeline works end-to-end. `--tickers` supports ad-hoc debugging of specific Yahoo responses. `--limit` lets you test backoff behaviour without waiting for the full run.

**Trade-off:** A full snapshot now takes 6–10 minutes instead of 2–5 minutes. This is acceptable because snapshots are infrequent (once per day or on-demand) and the failure rate drops from 5–15% to near zero.

---

## Cowork v1.4 — Email Price Alerts via Vercel Cron

### Why Resend for email

**Decision:** Used [Resend](https://resend.com) as the transactional email provider.

**Why:** Free tier (100/day, 3K/month) is more than sufficient for a personal tool. Resend is Vercel-native (same team, optimised for Next.js), has a clean SDK (`new Resend(apiKey).emails.send()`), and supports custom DKIM/SPF for domain-branded sends. No other provider combines all three at free tier.

**Alternatives considered:**
- SendGrid — heavier SDK, requires more config, free tier requires identity verification
- Postmark — excellent deliverability but no free tier
- AWS SES — cheapest at scale but complex setup, overkill for a personal tool

### Why hourly cron (not real-time)

**Decision:** Alerts are evaluated once per hour via Vercel Cron (`0 */1 * * *`).

**Why:** The core constraint is Yahoo rate-limits. Each alert evaluation requires fetching a current price from Yahoo. With dozens of alerts, real-time evaluation (e.g. every minute) would burn through Yahoo's rate budget and risk IP soft-bans. Hourly is a pragmatic balance — users get timely alerts without stressing the data source. For a personal value-investing tool, hourly granularity is more than sufficient (these aren't day-trading signals).

**Trade-off:** On Vercel's free tier, cron runs once/day, not hourly. Hourly requires Vercel Pro ($20/mo). This is acceptable — a user serious enough about alerts is likely already on Pro for other reasons (custom domain, faster builds, etc.).

### Why 24h debounce

**Decision:** Once an alert fires, it won't fire again for 24 hours.

**Why:** Prevents alert spam during sustained price moves. Without debounce, a stock hovering around a stop loss would trigger an email every hour for days. The 24h window is long enough to suppress noise but short enough that if the price recovers and then re-crosses the threshold, the user gets notified again.

### Schema: denormalized email per alert (no auth)

**Decision:** The `alerts` table stores `user_email` on each row rather than referencing a users table.

**Why:** The app has no auth system (hard rule: no signup). Denormalizing the email means alerts work immediately without building an account system. When auth is added (planned for v2), the schema can be migrated to a foreign key on a users table, and existing alerts can be linked by email.

**Trade-off:** If a user changes their email, they need to update each alert individually. Acceptable for a personal tool with typically 5–20 alerts.

### Why dark-themed HTML email (not React Email)

**Decision:** Built the alert email template as a raw HTML string in `src/lib/email.ts` rather than using `@react-email/components`.

**Why:** React Email adds 3 dependencies (`@react-email/components`, `@react-email/render`, plus their transitive deps) and requires a JSX-to-HTML render step. For a single email template with mostly static content, raw HTML is simpler, has zero runtime deps, and is easier to debug. The template uses inline styles and table layout for maximum email client compatibility.

**Trade-off:** Adding more email templates (welcome, digest, etc.) would benefit from React Email's component model. If the app grows to 3+ templates, migrating to React Email would be worth the dependency cost.

---

## v1.5 — GitHub Actions Automation

### Why GitHub Actions instead of Vercel's native Git integration

**Decision:** Use GitHub Actions workflows for deployment instead of Vercel's built-in GitHub integration.

**Why:** Vercel's native Git integration deploys on push but skips the type-check and lint steps — a broken type-check still deploys. GitHub Actions lets us chain `tsc --noEmit` → `npm run lint` → `npm run build` → `vercel deploy`, so a failing type-check blocks the deploy. It also gives us scheduled jobs (snapshot cron), CI checks on PRs, and full control over retry logic and failure notifications. Free for public repos (unlimited minutes).

**Trade-off:** Slightly more complex setup (5 repository secrets vs zero config). Worth it for the quality gate and scheduled automation.

### Why daily watchlist + weekly full snapshot

**Decision:** Run watchlist-only snapshot daily at 8am AEST; full 200-ticker universe weekly on Sunday night.

**Why:** Watchlist tickers (5–20) are the ones the user actively monitors — fresh data matters most here. The full universe is used by the screener, which tolerates slightly stale data (the 24h cache TTL handles intra-week freshness). Running 200 tickers daily would hit Yahoo rate limits and waste GitHub Actions minutes. Weekly full + daily watchlist balances freshness against rate-limit risk.

**Trade-off:** Screener data can be up to 7 days stale between Sunday runs. Acceptable for value investing (fundamentals don't change daily). User can manually trigger a full snapshot anytime via the Actions tab.

### Why MIT license

**Decision:** MIT license for the open-source repository.

**Why:** Most permissive widely-used OSS license. Allows commercial use, modification, and redistribution with only the requirement to preserve the license text. Common for developer tools and screeners. Doesn't require derivative works to be open-source (unlike GPL). The copyright uses the GitHub handle (`puran2006-lgtm`) rather than real name for privacy.

### Why grouped Dependabot updates

**Decision:** Group patch and minor dependency updates into a single PR; major versions get individual PRs.

**Why:** Ungrouped Dependabot creates one PR per package update — a project with 30+ dependencies can generate 10+ PRs per week. Grouping patch/minor into one PR reduces noise while still catching breaking changes (major bumps) individually. GitHub Actions versions are also tracked to keep workflow action pinning current.

---

## v1.4.1 — Lint Fix Patch

### Why remove TickerSearch import instead of wiring it into the alert modal

**Decision:** Removed the unused `TickerSearch` import from `alert-modal.tsx` rather than integrating ticker autocomplete into the modal.

**Why:** The existing `TickerSearch` component calls `router.push()` on selection — it's designed for page navigation, not form-field population. Wiring it into the modal would require adding an `onSelect` callback prop, suppressing the router.push, and handling the selected ticker as form state. That's a feature enhancement, not a lint fix. The plain `<Input>` works correctly for ticker entry. Autocomplete in the alert modal is deferred to a future release.

### Why remove eq import from alerts route

**Decision:** Removed unused `eq` import from `drizzle-orm` in `src/app/api/alerts/route.ts`.

**Why:** The GET endpoint fetches all alerts (no WHERE clause), and POST uses `.insert()`. Neither uses `eq()`. The import was likely carried over from a template or earlier draft. Removing it is the correct fix — no filtering logic is missing.

---

## v1.5.2 — Vercel Cron → GitHub Actions Migration

### Why move hourly alert checks from Vercel Cron to GitHub Actions

**Decision:** Removed the `crons` array from `vercel.json` and created `.github/workflows/check-alerts.yml` to call the same `/api/cron/check-alerts` endpoint hourly.

**Why:** Vercel Hobby (free tier) limits cron jobs to daily execution. The hourly `0 */1 * * *` schedule was blocking deploy with the error "Hobby accounts are limited to daily cron jobs." GitHub Actions has no cron frequency limits on public repos, so hourly execution works without upgrading to Vercel Pro. The endpoint code is unchanged — only the caller changed from Vercel's cron infrastructure to a GitHub Actions curl. This is consistent with the existing snapshot workflows, which also use GitHub Actions to hit the production Turso database.

**Trade-off:** GitHub Actions cron can be delayed by up to 15 minutes during high-load periods. For value investing alerts (not HFT), this latency is acceptable. Upgrading to Vercel Pro ($20/mo) restores native cron with sub-second scheduling — migration path documented in `docs/13_ALERTS.md`.

---

## v1.5.3 — Tame Dependabot Major Version Bumps

### Why ignore all major version bumps in Dependabot

**Decision:** Added `ignore: [{ dependency-name: "*", update-types: ["version-update:semver-major"] }]` to both npm and github-actions ecosystems in `.github/dependabot.yml`.

**Why:** Dependabot opened 9 PRs proposing major version bumps (Next 14→16, React 18→19, Tailwind 3→4, ESLint 8→10, TypeScript 5→6, @types/node 20→25, plus GitHub Actions majors). All failed CI because major bumps routinely introduce breaking changes — Tailwind v4 is a complete paradigm shift, React 19 changes the rendering model, Next 16 drops APIs we use. Auto-PRing these creates noise without value. Patch and minor updates remain auto-grouped weekly (safe, non-breaking by semver convention). Major upgrades are done manually when the ecosystem stabilises and migration guides are available.
