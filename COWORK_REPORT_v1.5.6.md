# Cowork Report — v1.5.6

**Date:** 2026-05-10
**Scope:** Fix Yahoo 429 in alert check endpoint — cache-first pricing

## Problem

The `/api/cron/check-alerts` endpoint called `yahooFundamentals()` directly for every active alert. Vercel's serverless functions run on shared IP pools that Yahoo rate-limits aggressively (HTTP 429). This caused alert checks to silently fail — prices returned null, no emails were sent, and the only evidence was buried in GitHub Actions logs.

## Solution

Implemented cache-first pricing strategy:

1. **Primary:** Read from `snapshot_cache` table (populated by daily/weekly GitHub Actions snapshot workflows running on GitHub's IP pool)
2. **Fallback:** Call `yahooFundamentals()` only if cache is missing or stale (>25 hours)
3. **Graceful degradation:** If both fail, skip the individual alert — don't crash the batch

## Changes

| File | Change |
|---|---|
| `src/app/api/cron/check-alerts/route.ts` | Cache-first pricing with 25h staleness window, `priceSource` diagnostics, graceful skip on double failure |
| `docs/13_ALERTS.md` | Updated "How It Works" and "Cron Frequency" to describe cache-first approach |
| `docs/11_CHANGELOG.md` | Added v1.5.6 entry |
| `DECISIONS.md` | Added "Why cache-first pricing in alert checker" decision record |

## Verification

- `tsc --noEmit` — zero errors
- No new dependencies added
- No schema changes required (`snapshot_cache` table already exists)

## Design Notes

- **25h staleness window** (vs 24h snapshot interval) provides a 1-hour buffer so slightly delayed snapshot runs don't invalidate the cache
- **`priceSource` in diagnostics** makes it trivial to verify in GitHub Actions logs whether prices came from cache or Yahoo
- **No Yahoo calls in common case** — with daily watchlist snapshots running at 8am AEST, cache is always fresh when the hourly alert check runs
