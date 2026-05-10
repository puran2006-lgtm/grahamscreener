/**
 * Test Email Script — sends a sample price alert email.
 *
 * Usage:
 *   RESEND_API_KEY=re_xxx TEST_EMAIL=you@example.com npm run test-email
 *
 * For first-time setup (before DNS/DKIM), use Resend's onboarding address:
 *   RESEND_API_KEY=re_xxx ALERT_FROM_EMAIL=onboarding@resend.dev TEST_EMAIL=you@example.com npm run test-email
 */

import { sendPriceAlert } from "../src/lib/email";
import type { Alert } from "../src/lib/db/schema";

(async () => {
  const testEmail = process.env.TEST_EMAIL;
  if (!testEmail) {
    console.error("Set TEST_EMAIL env var (e.g. TEST_EMAIL=you@example.com)");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("Set RESEND_API_KEY env var (sign up at resend.com)");
    process.exit(1);
  }

  // Build a fake alert object
  const fakeAlert: Alert = {
    id: 0,
    userEmail: testEmail,
    ticker: "AAPL",
    exchange: "US",
    conditionType: "target_buy",
    threshold: 165,
    active: 1,
    lastFiredAt: null,
    lastCheckedAt: null,
    referencePrice: null,
    createdAt: Date.now(),
    notes: "Sample alert — testing email delivery.",
  };

  console.log(`Sending test alert email to ${testEmail}…`);
  const result = await sendPriceAlert(fakeAlert, 162.5);

  if (result.success) {
    console.log(`Email sent successfully. Resend ID: ${result.id}`);
  } else {
    console.error(`Email failed: ${result.error}`);
    process.exit(1);
  }
})();
