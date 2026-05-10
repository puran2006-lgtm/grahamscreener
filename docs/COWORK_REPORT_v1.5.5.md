# COWORK REPORT — v1.5.5: Alert Email Diagnostics

**Date:** 2026-05-10
**Issue:** Alert emails never reaching Resend — zero sends shown at https://resend.com/emails despite HTTP 200 from `/api/cron/check-alerts`

---

## Root Cause Analysis

The check-alerts endpoint was a **diagnostic black box**:

1. **No logging in the response body** — GitHub Actions only captures the JSON response, not server stderr. The original response `{ checked: 0, triggered: 0, failed: 0 }` gave no indication whether alerts existed in the DB, whether Yahoo price fetches succeeded, or whether Resend was ever called.

2. **Silent early return** — `if (activeAlerts.length === 0)` returned immediately with no indication that zero alerts were found vs. some other failure.

3. **Error swallowing** — `console.error` calls in catch blocks were invisible to the GitHub Actions workflow since it only reads the response body.

4. **No env var validation** — if `RESEND_API_KEY` was missing in production, `sendPriceAlert` returned `{ success: false, error: "..." }` but this was only logged to stderr, not in the response.

The actual email sending code (`src/lib/email.ts`) is correct. The condition logic is correct (AAPL at ~$200 with threshold $9999 would fire for `target_buy`). The most likely failure point is one of: alerts not in DB, Yahoo API error caught silently, or env vars not loaded.

## Changes Made

### 1. `/api/cron/check-alerts/route.ts` — Full diagnostics
- Response now includes: `checked`, `triggered`, `sent`, `failed`, `environment` (env var status), `log[]` (trace), `details[]` (per-alert breakdown)
- Each alert logs: ticker, current price, condition evaluation, debounce check, email send result with Resend ID or error
- All diagnostic info is in the JSON body so GitHub Actions captures it

### 2. `/api/debug/alerts/route.ts` — TEMPORARY debug endpoint
- GET returns all alerts in DB + environment variable status
- **DELETE THIS FILE after confirming emails work**

### 3. `src/lib/email.ts` — Resend logging
- Added `console.log`/`console.error` before and after `resend.emails.send()` call

---

## Next Steps — Run These Commands

### 1. Push changes
```bash
git add . && git commit -m "v1.5.5 — alert email diagnostics + debug endpoint" && git push origin main
```

### 2. Wait for auto-deploy (~3 min)
```bash
gh run watch
```

### 3. Check debug endpoint
Open in browser:
```
https://grahamscreener.com/api/debug/alerts
```

This will show:
- How many alerts are in DB (should be 1+ if the test alert saved)
- Whether env vars are loaded in production
- Full alert details

**If `count: 0`** → the test alert didn't save. Create a new one via the UI and check again.

**If `hasResendKey: false`** → the env var isn't reaching the deployed function. Check Vercel dashboard → Settings → Environment Variables.

### 4. Trigger alert check manually
```bash
gh workflow run check-alerts.yml
sleep 30
gh run view $(gh run list --workflow=check-alerts.yml --limit 1 --json databaseId --jq '.[0].databaseId') --log | grep -A 20 "checked\|triggered\|sent\|Found.*alert"
```

The response JSON now includes full diagnostics. Look for:
- `"Found N active alert(s) in DB"` — confirms DB connection
- `"AAPL price = X"` — confirms Yahoo fetch worked
- `"target_buy: X <= 9999 → true"` — confirms condition evaluated
- `"Resend result: success=true"` — confirms email sent

### 5. Check Resend dashboard
```
https://resend.com/emails
```
- **Delivered** → working!
- **Failed** → check the error (usually domain verification or rate limit)
- **Still nothing** → the diagnostic log will show exactly where it stopped

### 6. Clean up (after confirming emails work)
```bash
rm src/app/api/debug/alerts/route.ts
git add . && git commit -m "remove debug endpoint" && git push
```

---

## Files Changed

| File | Change |
|---|---|
| `src/app/api/cron/check-alerts/route.ts` | Full diagnostic logging + detailed response |
| `src/app/api/debug/alerts/route.ts` | NEW — temporary debug endpoint |
| `src/lib/email.ts` | Added Resend request/response logging |
| `docs/11_CHANGELOG.md` | v1.5.5 entry |
| `DECISIONS.md` | Decision record for diagnostic approach |
| `docs/COWORK_REPORT_v1.5.5.md` | This file |
