import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, saveSettings, DEFAULTS } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  wacc: z.number().min(0.01).max(0.5).optional(),
  taxRate: z.number().min(0).max(0.6).optional(),
  aaaYield: z.number().min(0.5).max(15).optional(),
  baseMultiplier: z.number().min(1).max(30).optional(),
  growthCap: z.number().min(1).max(50).optional(),
});

/** GET /api/settings — return current valuation settings + defaults. */
export async function GET() {
  const current = await getSettings();
  return NextResponse.json({ settings: current, defaults: DEFAULTS });
}

/** PUT /api/settings — update valuation settings. */
export async function PUT(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const current = await getSettings();
  const updated = { ...current, ...parsed.data };
  await saveSettings(updated);
  return NextResponse.json({ settings: updated });
}
