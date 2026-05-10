# GitHub Actions Automation

GrahamScreener runs 4 GitHub Actions workflows for automated deployment, cache freshness, CI quality gates, and dependency management.

## Workflows

### 1. Deploy to Vercel (`deploy.yml`)

**Triggers:** Push to `main`, manual dispatch.

Runs the full pipeline: type-check → build → deploy to production via Vercel CLI. The production URL is printed in the GitHub Actions job summary after each successful deploy.

**Schedule (AEST):** Fires on every push to main — no fixed schedule.

### 2. Daily Watchlist Snapshot (`snapshot-watchlist.yml`)

**Triggers:** Cron schedule, manual dispatch.

Fetches fresh Yahoo Finance fundamentals for all tickers in your watchlist and writes them to the production Turso database. This keeps the screener and stock detail pages showing recent data without hitting Yahoo on every page load.

**Schedule (AEST):** 8:00 AM daily (10:00 PM UTC). Runs before ASX market open so morning checks show fresh data.

**Retry policy:** If the first attempt fails (Yahoo rate-limit, network error), waits 5 minutes and retries once. If both attempts fail, a GitHub Issue is automatically opened with the label `automation-failure`.

### 3. Weekly Full Snapshot (`snapshot-full.yml`)

**Triggers:** Cron schedule, manual dispatch.

Same as the daily snapshot but covers the full 200-ticker universe across all 4 exchanges (ASX, BSE, NSE, US). Takes 7–10 minutes due to sequential processing with rate-limit jitter.

**Schedule (AEST):** 2:00 AM Monday (4:00 PM UTC Sunday). Runs during a quiet period to avoid competing with weekday Yahoo traffic.

**Retry policy:** Same as daily — retry once after 5 minutes, open issue on double failure.

### 4. CI Checks (`ci.yml`)

**Triggers:** Pull requests to `main`, pushes to any branch except `main`.

Runs lint → type-check → build to catch issues before they reach the deploy workflow. Protects `main` from broken code.

**Schedule (AEST):** No fixed schedule — fires on every PR and non-main push.

### 5. Hourly Alert Check (`check-alerts.yml`)

**Triggers:** Cron schedule (hourly), manual dispatch.

Calls the live `GET /api/cron/check-alerts` endpoint with `CRON_SECRET` auth. The endpoint evaluates all active price alerts against current prices and sends email via Resend when triggered. This was migrated from Vercel Cron because Vercel Hobby (free tier) limits crons to daily — GitHub Actions has no frequency limits on public repos.

**Schedule (AEST):** Every hour, on the hour.

**Failure handling:** Opens a GitHub Issue with the response body if the curl fails (HTTP error). Yahoo 429s are handled inside the API (returns 200 with `failed` count), so rate-limit issues don't trigger false workflow failures.

**Required secret:** `CRON_SECRET` (same value as in Vercel env vars).

### 6. Dependabot (`dependabot.yml`)

**Triggers:** Weekly scan on Mondays (8:00 AM ACST for npm).

Checks for npm dependency updates and GitHub Actions version bumps. Patch updates are grouped into one PR, minor updates into another. **Major version bumps are ignored** — they require manual review since they routinely introduce breaking changes (e.g., Next 14→16, React 18→19, Tailwind 3→4).

All PRs are auto-assigned to `puran2006-lgtm` and labelled `dependencies` (GitHub Actions PRs also get `github-actions`).

**PR limits:** 5 open npm PRs, 3 open GitHub Actions PRs at any time.

### How to manually upgrade a major version

When you're ready to adopt a major version bump:

```bash
# 1. Check what's available
npm outdated

# 2. Install the new major version
npm install next@latest react@latest react-dom@latest

# 3. Test locally
npm run lint
npx tsc --noEmit
npm run build
npm run dev  # manual smoke test

# 4. Fix any breaking changes, then commit
git add .
git commit -m "chore(deps): upgrade next to v16, react to v19"
git push origin main
```

Always read the migration guide for the package before upgrading. Major versions often require code changes.

## How To

### Manually trigger a workflow

1. Go to the [Actions tab](https://github.com/puran2006-lgtm/grahamscreener/actions)
2. Click the workflow name in the left sidebar
3. Click the **"Run workflow"** button (top right)
4. Select the branch (usually `main`) and click **"Run workflow"**

### Debug a failed run

1. Go to the [Actions tab](https://github.com/puran2006-lgtm/grahamscreener/actions)
2. Click the failed run (red X icon)
3. Click the failed job name
4. Expand the failed step — the error message and full output are visible

### Temporarily disable a workflow

1. Go to the [Actions tab](https://github.com/puran2006-lgtm/grahamscreener/actions)
2. Click the workflow name in the left sidebar
3. Click the **"..."** menu (top right)
4. Click **"Disable workflow"**
5. Re-enable the same way when ready

### Re-enable a disabled workflow

Same steps as above — the menu option changes to **"Enable workflow"** when disabled.

## Estimated GitHub Actions Usage

All workflows run on `ubuntu-latest` and are free for public repositories (unlimited minutes).

| Workflow | Frequency | Estimated minutes/run | Monthly total |
|---|---|---|---|
| Deploy | ~10 pushes/month | 3–5 min | ~40 min |
| Daily watchlist | 30/month | 1–2 min | ~45 min |
| Weekly full | 4/month | 8–12 min | ~40 min |
| Hourly alerts | 720/month | <1 min | ~30 min |
| CI checks | ~15 PRs/month | 2–4 min | ~45 min |
| **Total** | | | **~200 min/month** |

Well within GitHub's free tier for public repos (unlimited). Even for private repos, the 2,000 min/month free allowance is more than sufficient.

---

Last updated: 2026-05-10 by Claude Cowork
