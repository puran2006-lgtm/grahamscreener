# Email Setup

GrahamScreener uses three custom email addresses on `grahamscreener.com`, routed via Cloudflare Email Routing and sent via Resend.

## Email Addresses

| Address | Direction | Purpose |
|---|---|---|
| `alerts@grahamscreener.com` | Outbound | Price alert notifications (sent via Resend) |
| `hello@grahamscreener.com` | Inbound | User support, general enquiries |
| `partnerships@grahamscreener.com` | Inbound + Outbound | Sponsor and partnership communication |

## Cloudflare Email Routing (Inbound)

Cloudflare Email Routing forwards incoming emails to your personal inbox at zero cost.

**Setup:** [Cloudflare Email Routing docs](https://developers.cloudflare.com/email-routing/)

1. Add `grahamscreener.com` to Cloudflare (if not already)
2. Go to **Email → Email Routing → Routes**
3. Create 3 routing rules:

| Catch address | Forward to |
|---|---|
| `hello@grahamscreener.com` | Your personal email |
| `partnerships@grahamscreener.com` | Your personal email |
| `alerts@grahamscreener.com` | Your personal email (optional — for monitoring bounces) |

Cloudflare automatically adds the required MX and TXT records to your DNS.

## Resend (Outbound)

Resend handles outbound transactional email (price alerts). See [Resend docs](https://resend.com/docs).

**Setup:**

1. Sign up at [resend.com](https://resend.com)
2. Go to **Domains → Add Domain** → enter `grahamscreener.com`
3. Resend provides 3 DNS records to add in Cloudflare:

| Type | Name | Value | Purpose |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGf...` | DKIM signing |
| TXT | `@` or `grahamscreener.com` | `v=spf1 include:amazonses.com ~all` | SPF |
| MX | `send.grahamscreener.com` | `feedback-smtp.us-east-1.amazonses.com` | Bounce handling |

4. Click **Verify** in Resend dashboard once records propagate (usually < 5 minutes)
5. Create an API key: **API Keys → Create API Key**
6. Set env vars:

```bash
RESEND_API_KEY=re_xxxxx
ALERT_FROM_EMAIL=alerts@grahamscreener.com
ALERT_REPLY_TO=hello@grahamscreener.com
```

**Quick start (no DNS):** Use `ALERT_FROM_EMAIL=onboarding@resend.dev` to send alerts from Resend's shared address. Works immediately, no DNS setup needed. Fine for testing and personal use.

## Gmail "Send mail as" (Optional)

To reply to `partnerships@grahamscreener.com` emails from Gmail:

1. In Gmail: **Settings → Accounts → Send mail as → Add another email address**
2. Enter `partnerships@grahamscreener.com`
3. For SMTP, use Resend's SMTP credentials:
   - Server: `smtp.resend.com`
   - Port: 465 (SSL)
   - Username: `resend`
   - Password: your Resend API key (`re_xxxxx`)
4. Gmail sends a verification email — check your forwarded inbox and click the link

This lets you compose and reply from `partnerships@grahamscreener.com` directly in Gmail.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RESEND_API_KEY` | — | Resend API key (required for alerts) |
| `ALERT_FROM_EMAIL` | `alerts@grahamscreener.com` | Sender address on alert emails |
| `ALERT_REPLY_TO` | `hello@grahamscreener.com` | Reply-To header on alert emails |

See `.env.example` in the project root for all env vars.

---

Last updated: 2026-05-10 by Claude Cowork
