// ============================================================
// Nimantro — Server Auth Verification Helpers
// apps/web/lib/server-auth.ts
// ============================================================

import { cookies } from "next/headers";
import { getAdminAuth, getAdminFirestore } from "@nimantro/firebase/admin";

export const SESSION_COOKIE_NAME = "__session";

export interface ServerUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export async function verifySessionToken(
  token: string
): Promise<ServerUser | null> {
  if (!token) return null;
  const auth = getAdminAuth();

  try {
    const decoded = await auth.verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      displayName: decoded.name ?? decoded.email?.split("@")[0] ?? "Nimantro Host",
      photoURL: decoded.picture,
    };
  } catch {
    // Fallback for emulator / direct ID tokens
    try {
      const decoded = await auth.verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name ?? decoded.email?.split("@")[0] ?? "Nimantro Host",
        photoURL: decoded.picture,
      };
    } catch {
      return null;
    }
  }
}

export async function getServerUser(): Promise<ServerUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  return verifySessionToken(session);
}

export async function assertServerEventPermission(
  eventId: string,
  uid: string,
  requiredPermission?: string
) {
  const db = getAdminFirestore();
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    return { ok: false as const, status: 404, error: "Event not found." };
  }

  const event = { id: eventSnap.id, ...eventSnap.data() } as Record<string, unknown>;
  if (event.ownerId === uid) {
    return { ok: true as const, db, eventRef, event, isOwner: true };
  }

  const memberSnap = await eventRef.collection("members").doc(uid).get();
  if (!memberSnap.exists) {
    return { ok: false as const, status: 403, error: "Access denied." };
  }

  const perms = (memberSnap.data()?.permissions as string[] | undefined) ?? [];
  if (requiredPermission && !perms.includes(requiredPermission)) {
    return { ok: false as const, status: 403, error: "Insufficient permissions." };
  }

  return { ok: true as const, db, eventRef, event, isOwner: false };
}
