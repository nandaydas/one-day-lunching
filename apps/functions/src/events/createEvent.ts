// ============================================================
// Nimantro — createEvent Cloud Function
// apps/functions/src/events/createEvent.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import { CreateEventSchema } from "@nimantro/validation";
import { requireAuth } from "../lib/auth";
import { getUserPlanLimits } from "../lib/plans";

export const createEvent = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to create an event.");

    const result = CreateEventSchema.safeParse(request.data);
    if (!result.success) {
      throw new HttpsError(
        "invalid-argument",
        result.error.issues.map((i) => i.message).join("; ")
      );
    }

    const {
      title,
      category,
      description,
      hostNames,
      startAt,
      endAt,
      timezone,
      language,
      visibility,
      venue,
      coverImageUrl,
    } = result.data;

    const startDate = new Date(startAt);
    const endDate = endAt ? new Date(endAt) : null;
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new HttpsError("invalid-argument", "Event end date must be after start date.");
    }

    const db = getAdminFirestore();

    const [userEventsSnap, limits] = await Promise.all([
      db
        .collection("events")
        .where("ownerId", "==", uid)
        .where("status", "in", ["draft", "published"])
        .count()
        .get(),
      getUserPlanLimits(db, uid),
    ]);

    const activeEventCount = userEventsSnap.data().count;
    if (activeEventCount >= limits.maxActiveEvents) {
      throw new HttpsError(
        "resource-exhausted",
        `Plan limit reached: maximum ${limits.maxActiveEvents} active events. Please archive an event first.`
      );
    }

    const eventRef = db.collection("events").doc();

    await db.runTransaction(async (tx) => {
      tx.set(eventRef, {
        id: eventRef.id,
        ownerId: uid,
        title: title.trim(),
        category,
        description: description?.trim() ?? null,
        hostNames: hostNames.map((n) => n.trim()),
        startAt: startDate,
        endAt: endDate,
        timezone,
        language,
        visibility,
        venue: venue ?? null,
        coverImageUrl: coverImageUrl ?? null,
        status: "draft",

        invitationCount: 0,
        guestGroupCount: 0,
        invitedPersonCount: 0,
        confirmedPersonCount: 0,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const memberRef = eventRef.collection("members").doc(uid);
      tx.set(memberRef, {
        uid,
        role: "owner",
        permissions: [
          "manage_invitations",
          "manage_guests",
          "view_analytics",
          "manage_members",
        ],
        invitedBy: uid,
        joinedAt: FieldValue.serverTimestamp(),
      });
    });

    return { eventId: eventRef.id };
  }
);
