# Cowork Report — v1.5.7

**Date:** 2026-05-11
**Scope:** Temporary seed-cache endpoint for end-to-end alert email verification

## Problem

Yahoo is rate-limiting both Vercel and GitHub Actions IPs today (HTTP 429). The cache-first code from v1.5.6 works correctly but has no data — snapshots can't populate `snapshot_cache` because Yahoo blocks them too. Need a way to inject a test price manually to verify the full email pipeline.

## Solution

Added `POST /api/debug/seed-cache` — upserts AAPL at $200.50 into `snapshot_cache`. No auth (matches existing `/api/debug/alerts` pattern — both temporary). Delete after confirming emails work.

## Changes

| File | Change |
|---|---|
| `src/app/api/debug/seed-cache/route.ts` | New POST endpoint — upserts AAPL test price into snapshot_cache |
| `docs/11_CHANGELOG.md` | Added v1.5.7 entry |

## Verification

- `tsc --noEmit` — zero errors

## Your Next Steps

Run these 5 commands in order:

### 1. Push the seed endpoint

```bash
cd ~/Desktop/Claude\ Code/valuelens
git add . && git commit -m "v1.5.7 — temp seed-cache endpoint" && git push origin main
```

### 2. Wait 3 min for Vercel deploy

```bash
sleep 180
```

### 3. Seed AAPL cache

```bash
curl -X POST https://grahamscreener.com/api/debug/seed-cache
```

Expected response:
```json
{"success":true,"message":"AAPL seeded at $200.50","inserted":{"ticker":"AAPL","exchange":"US","fetchedAt":...}}
```

### 4. Trigger alert check

```bash
gh workflow run check-alerts.yml && sleep 30 && gh run view $(gh run list --workflow=check-alerts.yml --limit 1 --json databaseId --jq '.[0].databaseId') --log | grep "log\|details" | tail -10
```

Expected output in log:
- `AAPL cache HIT — price=$200.50, age=Xm`
- `target_buy: 200.5 <= 100 → false` (or true if your AAPL alert threshold is ≥ $200.50)
- If triggered: `Sending email...` → `Resend success: id=re_...`

**Note:** The seeded demo alert (from `npm run seed`) has AAPL target buy at $100. Since $200.50 > $100, the condition `price <= threshold` is FALSE and the alert won't fire. To test email delivery, either:
- Edit the alert on `/alerts` to set threshold to $250 (so $200.50 ≤ $250 triggers it), OR
- Change the seed price in the endpoint to $90 and re-push

### 5. Verify email arrived

- **Resend dashboard:** https://resend.com/emails — should show 1 delivered
- **Gmail:** puran.2006@gmail.com — check inbox + spam

### 6. Clean up — remove both debug endpoints

```bash
rm src/app/api/debug/alerts/route.ts
rm src/app/api/debug/seed-cache/route.ts
rmdir src/app/api/debug/alerts src/app/api/debug/seed-cache src/app/api/debug 2>/dev/null
git add . && git commit -m "remove debug endpoints" && git push origin main
```
