// ============================================================
// Nimantro — Generate Guest Invitation Link API Route
// apps/web/app/api/guests/invite/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "@nimantro/firebase/admin";
import { z } from "@nimantro/validation";
import { assertServerEventPermission, getServerUser } from "@/lib/server-auth";
import { generateToken, sha256 } from "@/lib/server-crypto";

const GenerateInviteBodySchema = z.object({
  eventId: z.string().min(1),
  groupId: z.string().min(1),
  invitationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = GenerateInviteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "eventId, groupId, and invitationId are required." },
      { status: 400 }
    );
  }

  const { eventId, groupId, invitationId } = parsed.data;
  const authCheck = await assertServerEventPermission(
    eventId,
    user.uid,
    "manage_guests"
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { db, eventRef } = authCheck;
  const groupRef = eventRef.collection("guestGroups").doc(groupId);
  const invRef = eventRef.collection("invitations").doc(invitationId);

  const [groupSnap, invSnap, existingActive] = await Promise.all([
    groupRef.get(),
    invRef.get(),
    eventRef
      .collection("guestInvitations")
      .where("groupId", "==", groupId)
      .where("invitationId", "==", invitationId)
      .where("status", "==", "active")
      .get(),
  ]);

  if (!groupSnap.exists || !invSnap.exists) {
    return NextResponse.json(
      { error: "Guest group or invitation not found." },
      { status: 404 }
    );
  }

  const group = groupSnap.data() as Record<string, unknown>;
  const invitation = invSnap.data() as Record<string, unknown>;

  const rawToken = generateToken(24);
  const tokenHash = sha256(rawToken);
  const giRef = eventRef.collection("guestInvitations").doc();

  await db.runTransaction(async (tx) => {
    for (const d of existingActive.docs) {
      tx.update(d.ref, { status: "revoked" });
    }

    tx.set(giRef, {
      id: giRef.id,
      eventId,
      groupId,
      invitationId,
      tokenHash,
      allowedAdults: Number(group.invitedAdults ?? 1),
      allowedChildren: Number(group.invitedChildren ?? 0),
      status: "active",
      sentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    if (group.status === "draft") {
      tx.update(groupRef, {
        status: "invited",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  const slug = typeof invitation.slug === "string" ? invitation.slug : "";
  return NextResponse.json({
    guestInvitationId: giRef.id,
    token: rawToken,
    sharePath: slug ? `/i/${slug}?token=${rawToken}` : null,
  });
}
