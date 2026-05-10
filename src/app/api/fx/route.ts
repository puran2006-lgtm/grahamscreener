import { NextRequest, NextResponse } from "next/server";
import { getPortfolioFxRates } from "@/lib/fx";
import { getBaseCurrency, saveBaseCurrency, BASE_CURRENCIES } from "@/lib/settings";
import type { BaseCurrency } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/fx?currencies=USD,AUD,INR
 * Returns FX rates to convert each source currency into the user's base currency.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("currencies") ?? "";
  const sources = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const baseCurrency = await getBaseCurrency();
  const rates = await getPortfolioFxRates(sources.length > 0 ? sources : ["USD"], baseCurrency);

  return NextResponse.json({ baseCurrency, rates });
}

/**
 * PUT /api/fx — update base currency.
 * Body: { baseCurrency: "AUD" }
 */
export async function PUT(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const bc = json?.baseCurrency as string;
  if (!bc || !BASE_CURRENCIES.includes(bc as BaseCurrency)) {
    return NextResponse.json(
      { error: `Invalid currency. Must be one of: ${BASE_CURRENCIES.join(", ")}` },
      { status: 400 }
    );
  }
  await saveBaseCurrency(bc as BaseCurrency);
  return NextResponse.json({ baseCurrency: bc });
}
