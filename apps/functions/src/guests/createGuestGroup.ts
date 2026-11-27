// ============================================================
// Nimantro — createGuestGroup Cloud Function
// apps/functions/src/guests/createGuestGroup.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import {
  AddGuestMemberSchema,
  CreateGuestGroupSchema,
  z,
} from "@nimantro/validation";
import { assertEventPermission, requireAuth } from "../lib/auth";
import { getUserPlanLimits } from "../lib/plans";

const CreateGuestGroupRequestSchema = CreateGuestGroupSchema.extend({
  eventId: z.string().min(1),
  members: z.array(AddGuestMemberSchema).max(50).optional(),
});

export const createGuestGroup = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to manage guests.");

    const parsed = CreateGuestGroupRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((i) => i.message).join("; ")
      );
    }

    const {
      eventId,
      groupName,
      primaryContactName,
      phone,
      email,
      invitedAdults,
      invitedChildren,
      notes,
      members,
    } = parsed.data;

    const db = getAdminFirestore();
    const { eventRef, event } = await assertEventPermission(
      db,
      eventId,
      uid,
      "manage_guests"
    );

    const ownerId = String(event.ownerId ?? uid);
    const [groupsCountSnap, limits] = await Promise.all([
      eventRef.collection("guestGroups").count().get(),
      getUserPlanLimits(db, ownerId),
    ]);

    if (groupsCountSnap.data().count >= limits.maxGuestGroups) {
      throw new HttpsError(
        "resource-exhausted",
        `Guest group limit reached (${limits.maxGuestGroups}) for your current plan.`
      );
    }

    const groupRef = eventRef.collection("guestGroups").doc();

    await db.runTransaction(async (tx) => {
      tx.set(groupRef, {
        id: groupRef.id,
        eventId,
        groupName: groupName.trim(),
        primaryContactName: primaryContactName.trim(),
        ...(phone?.trim() ? { phone: phone.trim() } : {}),
        ...(email?.trim() ? { email: email.trim().toLowerCase() } : {}),
        invitedAdults,
        invitedChildren,
        status: "draft",
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (members && members.length > 0) {
        for (const member of members) {
          const guestRef = eventRef.collection("guests").doc();
          tx.set(guestRef, {
            id: guestRef.id,
            groupId: groupRef.id,
            eventId,
            fullName: member.fullName.trim(),
            type: member.type,
            ...(member.phone?.trim() ? { phone: member.phone.trim() } : {}),
            invitationStatus: "pending",
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      tx.update(eventRef, {
        guestGroupCount: FieldValue.increment(1),
        invitedPersonCount: FieldValue.increment(invitedAdults + invitedChildren),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { groupId: groupRef.id };
  }
);
