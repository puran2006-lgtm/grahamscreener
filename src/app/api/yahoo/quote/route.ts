import { NextRequest, NextResponse } from "next/server";
import { yahooFundamentals } from "@/lib/yahoo/client";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
  const allowCache = req.nextUrl.searchParams.get("cache") !== "false";
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const db = await getDb();
  if (allowCache) {
    const cached = await db.select().from(schema.snapshotCache)
      .where(eq(schema.snapshotCache.ticker, ticker)).get();
    if (cached) {
      const ageMs = Date.now() - cached.fetchedAt;
      if (ageMs < 1000 * 60 * 60 * 6) {
        return NextResponse.json({
          cached: true,
          fetchedAt: cached.fetchedAt,
          ...JSON.parse(cached.payload),
        });
      }
    }
  }

  try {
    const f = await yahooFundamentals(ticker);
    await db.insert(schema.snapshotCache)
      .values({
        ticker,
        exchange: f.exchange,
        payload: JSON.stringify(f),
        fetchedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.snapshotCache.ticker,
        set: { payload: JSON.stringify(f), fetchedAt: Date.now(), exchange: f.exchange },
      })
      .run();
    return NextResponse.json({ cached: false, fetchedAt: Date.now(), ...f });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
