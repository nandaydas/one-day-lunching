// ============================================================
// Nimantro — Cloud Functions Auth & Event Permission Helpers
// apps/functions/src/lib/auth.ts
// ============================================================

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";

export function requireAuth(request: CallableRequest<unknown>, message = "Authentication required."): string {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", message);
  }
  return request.auth.uid;
}

export async function assertEventPermission(
  db: Firestore,
  eventId: string,
  uid: string,
  requiredPermission?: string
) {
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }

  const event = eventSnap.data() as Record<string, unknown>;
  if (event.ownerId === uid) {
    return { eventRef, event, isOwner: true };
  }

  const memberSnap = await eventRef.collection("members").doc(uid).get();
  if (!memberSnap.exists) {
    throw new HttpsError("permission-denied", "You do not have access to this event.");
  }

  const member = memberSnap.data() as { permissions?: string[] } | undefined;
  const permissions = member?.permissions ?? [];
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    throw new HttpsError("permission-denied", `Missing required permission: ${requiredPermission}`);
  }

  return { eventRef, event, isOwner: false };
}
