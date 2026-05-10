/**
 * Yahoo's unauthenticated endpoints now sometimes require a session cookie ("A1") and a
 * "crumb" token. We bootstrap by hitting fc.yahoo.com (sets cookies) then
 * query2.finance.yahoo.com/v1/test/getcrumb (issues the crumb).
 *
 * We cache cookies + crumb in-process for ~30 min. On any 401/403/429 we drop the cache
 * and try once more.
 */

interface Session {
  cookie: string;
  crumb: string;
  fetchedAt: number;
}

const TTL = 1000 * 60 * 30;
let cached: Session | null = null;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

async function bootstrap(): Promise<Session> {
  // Step 1: hit fc.yahoo.com with a regular browser UA — Yahoo sets A1/A3 session cookies.
  const r1 = await fetch("https://fc.yahoo.com", {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "manual",
  }).catch(() => null);
  // r1 sometimes 4xx — that's fine; we just need the Set-Cookie header.
  let cookie = "";
  if (r1) {
    const sc = r1.headers.get("set-cookie") ?? "";
    cookie = sc
      .split(/,(?=[^ ]+=)/)
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
  }

  // Step 2: getcrumb. Some regions issue an EU consent challenge — in that case the
  // request returns HTML; we just give up and return an empty crumb. Calls without a
  // crumb still succeed for some endpoints (chart) and fail for others (quoteSummary).
  let crumb = "";
  if (cookie) {
    const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: {
        "User-Agent": UA,
        Cookie: cookie,
        Accept: "*/*",
      },
    }).catch(() => null);
    if (r2 && r2.ok) {
      const text = await r2.text();
      // Crumb is a short opaque string; if EU consent is required, response is HTML.
      if (text && text.length < 64 && !text.startsWith("<")) {
        crumb = text.trim();
      }
    }
  }

  return { cookie, crumb, fetchedAt: Date.now() };
}

export async function getSession(force = false): Promise<Session> {
  if (!force && cached && Date.now() - cached.fetchedAt < TTL) return cached;
  cached = await bootstrap();
  return cached;
}

export function invalidateSession() {
  cached = null;
}
