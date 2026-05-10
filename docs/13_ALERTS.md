# Price Alerts

## Overview

GrahamScreener sends email alerts when a stock hits a price condition you define. Alerts are evaluated hourly by a GitHub Actions workflow and delivered via [Resend](https://resend.com).

## Condition Types

| Type | Trigger | Example |
|---|---|---|
| **Target Buy** | Price drops to or below threshold | AAPL at $165 — alert fires when price ≤ $165 |
| **Stop Loss** | Price drops to or below threshold | CBA.AX at $80 — alert fires when price ≤ $80 |
| **% Change Up** | Price rises by X% from reference price | RELIANCE.BO reference $2,500, threshold 10% — fires at ≥ $2,750 |
| **% Change Down** | Price drops by X% from reference price | INFY.NS reference $1,400, threshold 15% — fires at ≤ $1,190 |

For percentage-based alerts, you set a **reference price** at creation time. The alert evaluates against `reference_price × (1 ± threshold/100)`.

## How It Works

1. **You create an alert** via the `/alerts` page — specify ticker, condition, threshold, and your email.
2. **GitHub Actions runs hourly** (`0 */1 * * *`) — calls `GET /api/cron/check-alerts` on the live site with a `Bearer CRON_SECRET` header.
3. **The endpoint evaluates each active alert** against the current price (fetched from Yahoo, with snapshot cache fallback).
4. **If triggered**, an email is sent via Resend and `last_fired_at` is updated.
5. **24h debounce** — once an alert fires, it won't fire again for 24 hours. This prevents spam during sustained price moves (e.g., a stock hovering around your stop loss for several days).

## Cron Frequency

Alerts are checked **once per hour** via GitHub Actions (`check-alerts.yml`). This balances timeliness with Yahoo rate-limit constraints. The endpoint processes alerts sequentially with 500ms pauses between tickers to avoid 429 responses.

GitHub Actions has no cron frequency limits on public repos, so hourly execution works on any plan.

### Migrating to Vercel Pro

If you upgrade to Vercel Pro ($20/mo), you can use Vercel's native cron instead of GitHub Actions:

1. Add the cron block back to `vercel.json`:
   ```json
   "crons": [{ "path": "/api/cron/check-alerts", "schedule": "0 */1 * * *" }]
   ```
2. Disable the GitHub Actions workflow: Actions tab → "Hourly Alert Check" → "..." → "Disable workflow"
3. Deploy — Vercel Pro runs the cron natively with lower latency

## Resend Email Provider

GrahamScreener uses [Resend](https://resend.com) for transactional email.

**Free tier:** 100 emails/day, 3,000/month. Sufficient for a personal tool with dozens of alerts.

**When to upgrade:** If you have > 100 alerts that could fire on the same day, or if you're running a multi-user deployment. Resend's $20/mo plan covers 50,000 emails/month.

## Email Setup

### Quick start (no DNS required)

Use Resend's built-in onboarding address:

```bash
RESEND_API_KEY=re_xxxxx
ALERT_FROM_EMAIL=onboarding@resend.dev
```

Emails will come from `onboarding@resend.dev` — fine for personal use.

### Custom from-address (recommended for production)

1. Sign up at [resend.com](https://resend.com) and add your domain (e.g., `grahamscreener.com`).
2. Add the DNS records Resend provides (DKIM, SPF, MX).
3. Set env vars:

```bash
RESEND_API_KEY=re_xxxxx
ALERT_FROM_EMAIL=alerts@grahamscreener.com
```

### Testing

```bash
RESEND_API_KEY=re_xxxxx ALERT_FROM_EMAIL=onboarding@resend.dev TEST_EMAIL=you@gmail.com npm run test-email
```

This sends a sample alert email (AAPL target buy at $165, current price $162.50) to verify your Resend setup works.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `RESEND_API_KEY` | Yes (for alerts) | — | Resend API key (starts with `re_`) |
| `ALERT_FROM_EMAIL` | No | `alerts@grahamscreener.com` | Sender address (needs DNS setup unless using `onboarding@resend.dev`) |
| `CRON_SECRET` | Yes (for cron) | — | Vercel cron auth token |
| `TEST_EMAIL` | No | — | Your email for `npm run test-email` |

## Privacy

Emails are stored only in the `alerts` table — one row per alert with the recipient address. No email logs are kept beyond Resend's standard retention. Alerts can be paused or deleted at any time from the `/alerts` page.

## Database Schema

```sql
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  ticker TEXT NOT NULL,
  exchange TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('target_buy', 'stop_loss', 'pct_change_up', 'pct_change_down')),
  threshold REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_fired_at INTEGER,
  last_checked_at INTEGER,
  reference_price REAL,
  created_at INTEGER NOT NULL,
  notes TEXT
);
```

---

Last updated: 2026-05-10 by Claude Cowork
