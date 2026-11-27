// ============================================================
// Nimantro — getEventAnalytics Cloud Function
// apps/functions/src/analytics/getEventAnalytics.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import type {
  CheckInDocument,
  GuestGroupDocument,
  RSVPDocument,
} from "@nimantro/types";
import { z } from "zod";
import { assertEventPermission, requireAuth } from "../lib/auth";
import { computeEventAnalytics } from "../lib/analytics";

const AnalyticsRequestSchema = z.object({
  eventId: z.string().min(1),
});

export const getEventAnalytics = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to view event analytics.");

    const parsed = AnalyticsRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Valid eventId is required.");
    }

    const { eventId } = parsed.data;
    const db = getAdminFirestore();

    const { eventRef } = await assertEventPermission(db, eventId, uid, "view_analytics");

    const [groupsSnap, rsvpsSnap, checkInsSnap] = await Promise.all([
      eventRef.collection("guestGroups").get(),
      eventRef.collection("rsvps").get(),
      eventRef.collection("checkIns").get(),
    ]);

    const groups = groupsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as GuestGroupDocument
    );
    const rsvps = rsvpsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as RSVPDocument
    );
    const checkIns = checkInsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as CheckInDocument
    );

    const summary = computeEventAnalytics(eventId, groups, rsvps, checkIns);

    return {
      summary,
      recentRsvps: rsvps
        .slice()
        .sort((a, b) => {
          const aSec =
            typeof a.updatedAt === "object" && a.updatedAt && "seconds" in a.updatedAt
              ? a.updatedAt.seconds
              : 0;
          const bSec =
            typeof b.updatedAt === "object" && b.updatedAt && "seconds" in b.updatedAt
              ? b.updatedAt.seconds
              : 0;
          return bSec - aSec;
        })
        .slice(0, 10),
    };
  }
);
