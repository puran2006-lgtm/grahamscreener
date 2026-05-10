import { NextRequest, NextResponse } from "next/server";
import { yahooSearch } from "@/lib/yahoo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = await yahooSearch(q, 12);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, results: [] },
      { status: 502 }
    );
  }
}
