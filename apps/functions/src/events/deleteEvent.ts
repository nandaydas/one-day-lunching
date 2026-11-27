// ============================================================
// Nimantro — deleteEvent Cloud Function
// apps/functions/src/events/deleteEvent.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAdminFirestore, getAdminStorage } from "@nimantro/firebase/admin";
import { z } from "zod";
import { assertEventPermission, requireAuth } from "../lib/auth";

const DeleteEventSchema = z.object({
  eventId: z.string().min(1),
});

export const deleteEvent = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to delete an event.");

    const parsed = DeleteEventSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Valid eventId is required.");
    }

    const { eventId } = parsed.data;
    const db = getAdminFirestore();

    const { eventRef, isOwner } = await assertEventPermission(db, eventId, uid);
    if (!isOwner) {
      throw new HttpsError("permission-denied", "Only the event owner can delete this event.");
    }

    // Release any published slugs associated with this event
    const slugsSnap = await db
      .collection("slugs")
      .where("eventId", "==", eventId)
      .get();

    if (!slugsSnap.empty) {
      const batch = db.batch();
      for (const slugDoc of slugsSnap.docs) {
        batch.delete(slugDoc.ref);
      }
      await batch.commit();
    }

    // Cascade delete event document and all subcollections
    await db.recursiveDelete(eventRef);

    // Best-effort cleanup of uploaded assets if storage bucket is configured
    try {
      const bucket = getAdminStorage().bucket();
      await bucket.deleteFiles({ prefix: `events/${eventId}/` });
    } catch {
      // Ignore storage cleanup failures in environments without a configured bucket
    }

    return { deleted: true, eventId };
  }
);
