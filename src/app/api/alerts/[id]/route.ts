import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  conditionType: z.enum(["target_buy", "stop_loss", "pct_change_up", "pct_change_down"]).optional(),
  threshold: z.number().positive().optional(),
  active: z.number().min(0).max(1).optional(),
  referencePrice: z.number().positive().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  userEmail: z.string().email().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.select().from(schema.alerts)
    .where(eq(schema.alerts.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const v = parsed.data;
  if (v.conditionType !== undefined) updates.conditionType = v.conditionType;
  if (v.threshold !== undefined) updates.threshold = v.threshold;
  if (v.active !== undefined) updates.active = v.active;
  if (v.referencePrice !== undefined) updates.referencePrice = v.referencePrice;
  if (v.notes !== undefined) updates.notes = v.notes;
  if (v.userEmail !== undefined) updates.userEmail = v.userEmail;

  if (Object.keys(updates).length > 0) {
    await db.update(schema.alerts)
      .set(updates)
      .where(eq(schema.alerts.id, id))
      .run();
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const db = await getDb();
  await db.delete(schema.alerts).where(eq(schema.alerts.id, id)).run();
  return NextResponse.json({ ok: true });
}
