// ============================================================
// Nimantro — Create Export Job API Route
// apps/web/app/api/exports/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "@nimantro/firebase/admin";
import { CreateExportJobSchema, z } from "@nimantro/validation";
import { assertServerEventPermission, getServerUser } from "@/lib/server-auth";

const ExportRequestSchema = CreateExportJobSchema.extend({
  eventId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ExportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { eventId, invitationId, versionId, format, pageSize } = parsed.data;
  const authCheck = await assertServerEventPermission(
    eventId,
    user.uid,
    "manage_invitations"
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { db, eventRef } = authCheck;
  const [invSnap, verSnap] = await Promise.all([
    eventRef.collection("invitations").doc(invitationId).get(),
    eventRef.collection("invitationVersions").doc(versionId).get(),
  ]);

  if (!invSnap.exists || !verSnap.exists) {
    return NextResponse.json(
      { error: "Publish the invitation first before creating an export." },
      { status: 400 }
    );
  }

  const exportRef = db.collection("exports").doc();
  await exportRef.set({
    id: exportRef.id,
    userId: user.uid,
    eventId,
    invitationId,
    versionId,
    format,
    pageSize: pageSize ?? "a4",
    status: "queued",
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ exportId: exportRef.id, status: "queued" }, { status: 201 });
}
