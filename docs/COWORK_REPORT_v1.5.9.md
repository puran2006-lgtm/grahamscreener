# Cowork Report — v1.5.9

**Date:** 2026-05-11
**Scope:** Production alert emails + debug endpoint cleanup

## Problem

Alert emails were stuck in Resend's sandbox mode — they could only be sent to the Resend account owner's email (`hello@grahamscreener.com`), not to the actual user (`puran.2006@gmail.com`). Three temporary debug endpoints created during v1.5.5–v1.5.8 diagnosis needed removal.

## Root Cause

Resend requires domain verification before sending to arbitrary recipients. The `ALERT_FROM_EMAIL` env var was set to `onboarding@resend.dev` (sandbox sender). After domain verification of `grahamscreener.com` on Resend (DKIM + SPF DNS records added in Cloudflare), emails can be sent from `alerts@grahamscreener.com` to any recipient.

## Solution

1. Updated `ALERT_FROM_EMAIL` on Vercel from `onboarding@resend.dev` to `alerts@grahamscreener.com`
2. Removed sandbox recipient override in `test-email` endpoint (was hardcoding `hello@grahamscreener.com`)
3. Deployed, verified email delivery to `puran.2006@gmail.com`
4. Verified production cron workflow (Hourly Alert Check #22) ran successfully
5. Deleted all 3 debug endpoints: `test-email`, `alerts`, `seed-cache`

## Changes

| File | Change |
|---|---|
| Vercel env vars | `ALERT_FROM_EMAIL` changed to `alerts@grahamscreener.com` |
| `src/app/api/debug/test-email/route.ts` | Removed sandbox override, then deleted entirely |
| `src/app/api/debug/alerts/route.ts` | Deleted |
| `src/app/api/debug/seed-cache/route.ts` | Deleted |
| `docs/11_CHANGELOG.md` | Added v1.5.8 + v1.5.9 entries |

## Verification

- Email delivered to `puran.2006@gmail.com` from `alerts@grahamscreener.com` (Resend ID: `8f97003a-59d1-42c6-9de2-c936698af9b2`)
- Production cron workflow Hourly Alert Check #22 completed successfully (HTTP 200, 12s)
- Deploy #19 (post-deletion) completed green in 2m 22s
- All debug endpoints removed from codebase (3 commits to main)

## Known Limitations

- **testPrice query param not on remote**: `check-alerts/route.ts` has `?testPrice=N` support locally but not pushed to GitHub. CodeMirror's insertText handler failed for the 264-line file. Dev convenience feature only.
- **Turso write inconsistency**: Writes via the (now-deleted) seed-cache endpoint appeared to succeed locally but were not visible across Vercel function invocations.
- **Yahoo 429 from CI IPs**: Both Vercel and GitHub Actions IPs continue to be rate-limited by Yahoo Finance. Cache-first pricing (v1.5.6) mitigates this.

## Architecture — Final Alert Pipeline

The production alert email pipeline is now fully operational:

1. **GitHub Actions** (daily-watchlist-snapshot) populates `snapshot_cache` in Turso
2. **GitHub Actions** (hourly-alert-check) calls `/api/cron/check-alerts`
3. **check-alerts** reads cache (Yahoo fallback), evaluates conditions, 24h debounce
4. **Resend** sends from `alerts@grahamscreener.com` with Reply-To `hello@grahamscreener.com`
5. **Recipient** any email address stored in alert row
