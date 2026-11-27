// ============================================================
// Nimantro — Single Event API Route
// apps/web/app/api/events/[eventId]/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "@nimantro/firebase/admin";
import { UpdateEventSchema, z } from "@nimantro/validation";
import { assertServerEventPermission, getServerUser } from "@/lib/server-auth";

const PatchEventSchema = UpdateEventSchema.extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { eventId } = await context.params;
  const authCheck = await assertServerEventPermission(eventId, user.uid);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await request.json();
  const parsed = PatchEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (parsed.data.startAt) updates.startAt = new Date(parsed.data.startAt);
  if (parsed.data.endAt) updates.endAt = new Date(parsed.data.endAt);

  await authCheck.eventRef.update(updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { eventId } = await context.params;
  const authCheck = await assertServerEventPermission(eventId, user.uid);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }
  if (!authCheck.isOwner) {
    return NextResponse.json(
      { error: "Only the event owner can delete an event." },
      { status: 403 }
    );
  }

  const { db, eventRef } = authCheck;
  const slugsSnap = await db.collection("slugs").where("eventId", "==", eventId).get();
  if (!slugsSnap.empty) {
    const batch = db.batch();
    for (const d of slugsSnap.docs) batch.delete(d.ref);
    await batch.commit();
  }

  await db.recursiveDelete(eventRef);
  return NextResponse.json({ deleted: true, eventId });
}
