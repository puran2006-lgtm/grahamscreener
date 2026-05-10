import { NextRequest, NextResponse } from "next/server";
import { yahooChart } from "@/lib/yahoo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
  const range = (req.nextUrl.searchParams.get("range") ?? "1y") as
    | "1y"
    | "5y"
    | "max"
    | "1mo"
    | "3mo"
    | "6mo";
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
  try {
    const interval = range === "5y" || range === "max" ? "1wk" : "1d";
    const data = await yahooChart(ticker, range, interval);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
