import { Resend } from "resend";
import type { Alert } from "@/lib/db/schema";

const CONDITION_LABELS: Record<string, string> = {
  target_buy: "Target Buy Price Reached",
  stop_loss: "Stop Loss Triggered",
  pct_change_up: "Price Up by %",
  pct_change_down: "Price Down by %",
};

/**
 * Build a dark-themed HTML email for a triggered price alert.
 */
function buildAlertHtml(alert: Alert, currentPrice: number): string {
  const conditionLabel = CONDITION_LABELS[alert.conditionType] ?? alert.conditionType;
  const thresholdDisplay =
    alert.conditionType === "pct_change_up" || alert.conditionType === "pct_change_down"
      ? `${alert.threshold}%`
      : `$${alert.threshold.toFixed(2)}`;
  const stockUrl = `https://grahamscreener.com/stock/${encodeURIComponent(alert.ticker)}`;
  const alertsUrl = "https://grahamscreener.com/alerts";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Inter',system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;border:1px solid #27272a;">

<!-- Header -->
<tr><td style="padding:24px 32px 16px;border-bottom:1px solid #27272a;">
  <span style="font-size:14px;font-weight:600;color:#a1a1aa;letter-spacing:0.05em;text-transform:uppercase;">GrahamScreener Alert</span>
</td></tr>

<!-- Body -->
<tr><td style="padding:24px 32px;">
  <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#fafafa;">${alert.ticker}</h1>
  <p style="margin:0 0 20px;font-size:13px;color:#71717a;">${alert.exchange}</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td style="padding:12px 16px;background:#27272a;border-radius:8px 8px 0 0;border-bottom:1px solid #3f3f46;">
        <span style="font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">Condition</span><br>
        <span style="font-size:15px;font-weight:600;color:#fafafa;">${conditionLabel}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;background:#27272a;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:50%;">
              <span style="font-size:12px;color:#a1a1aa;">Threshold</span><br>
              <span style="font-size:15px;font-weight:600;color:#fafafa;">${thresholdDisplay}</span>
            </td>
            <td style="width:50%;">
              <span style="font-size:12px;color:#a1a1aa;">Current Price</span><br>
              <span style="font-size:15px;font-weight:600;color:#22c55e;">$${currentPrice.toFixed(2)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;background:#27272a;border-radius:0 0 8px 8px;border-top:1px solid #3f3f46;">
        ${alert.notes ? `<span style="font-size:12px;color:#a1a1aa;">Notes</span><br><span style="font-size:13px;color:#d4d4d8;">${alert.notes}</span>` : ""}
      </td>
    </tr>
  </table>

  <a href="${stockUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">View ${alert.ticker} Details</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px 24px;border-top:1px solid #27272a;">
  <p style="margin:0 0 4px;font-size:12px;color:#71717a;">
    <a href="${alertsUrl}" style="color:#3b82f6;text-decoration:none;">Manage your alerts</a>
  </p>
  <p style="margin:0;font-size:11px;color:#52525b;">
    You're receiving this because you set up a price alert on GrahamScreener.
    To stop these emails, pause or delete the alert.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Send a price alert email via Resend.
 * Requires RESEND_API_KEY env var.
 */
export async function sendPriceAlert(
  alert: Alert,
  currentPrice: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const fromAddress =
    process.env.ALERT_FROM_EMAIL ?? "alerts@grahamscreener.com";
  const replyTo =
    process.env.ALERT_REPLY_TO ?? "hello@grahamscreener.com";

  const conditionLabel = CONDITION_LABELS[alert.conditionType] ?? alert.conditionType;
  const subject = `${alert.ticker}: ${conditionLabel} — $${currentPrice.toFixed(2)}`;

  try {
    console.log(`[email] Sending via Resend: from=${fromAddress}, to=${alert.userEmail}, subject=${subject}`);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `GrahamScreener <${fromAddress}>`,
      replyTo,
      to: [alert.userEmail],
      subject,
      html: buildAlertHtml(alert, currentPrice),
    });

    if (error) {
      console.error(`[email] Resend error:`, JSON.stringify(error));
      return { success: false, error: error.message };
    }
    console.log(`[email] Resend success: id=${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error(`[email] Resend exception:`, (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
