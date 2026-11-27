// ============================================================
// Nimantro — generateGuestInvitation Cloud Function
// apps/functions/src/guests/generateGuestInvitation.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import { z } from "zod";
import { assertEventPermission, requireAuth } from "../lib/auth";
import { generateSecureToken, sha256 } from "../lib/crypto";

const GenerateGuestInvitationSchema = z.object({
  eventId: z.string().min(1),
  groupId: z.string().min(1),
  invitationId: z.string().min(1),
});

export const generateGuestInvitation = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to generate guest invitation links.");

    const parsed = GenerateGuestInvitationSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "eventId, groupId, and invitationId are required.");
    }

    const { eventId, groupId, invitationId } = parsed.data;
    const db = getAdminFirestore();

    const { eventRef } = await assertEventPermission(db, eventId, uid, "manage_guests");

    const groupRef = eventRef.collection("guestGroups").doc(groupId);
    const invitationRef = eventRef.collection("invitations").doc(invitationId);

    const [groupSnap, invitationSnap, existingLinksSnap] = await Promise.all([
      groupRef.get(),
      invitationRef.get(),
      eventRef
        .collection("guestInvitations")
        .where("groupId", "==", groupId)
        .where("invitationId", "==", invitationId)
        .where("status", "==", "active")
        .get(),
    ]);

    if (!groupSnap.exists) {
      throw new HttpsError("not-found", "Guest group not found.");
    }
    if (!invitationSnap.exists) {
      throw new HttpsError("not-found", "Invitation not found.");
    }

    const group = groupSnap.data() as Record<string, unknown>;
    const invitation = invitationSnap.data() as Record<string, unknown>;

    const rawToken = generateSecureToken(24);
    const tokenHash = sha256(rawToken);
    const guestInvitationRef = eventRef.collection("guestInvitations").doc();

    await db.runTransaction(async (tx) => {
      // Revoke any previous active tokens for this group + invitation pair
      for (const existing of existingLinksSnap.docs) {
        tx.update(existing.ref, { status: "revoked" });
      }

      tx.set(guestInvitationRef, {
        id: guestInvitationRef.id,
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
    return {
      guestInvitationId: guestInvitationRef.id,
      token: rawToken,
      sharePath: slug ? `/i/${slug}?token=${rawToken}` : null,
    };
  }
);
