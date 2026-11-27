// ============================================================
// Nimantro — createExportJob Cloud Function
// apps/functions/src/exports/createExportJob.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import { CreateExportJobSchema, z } from "@nimantro/validation";
import { assertEventPermission, requireAuth } from "../lib/auth";

const CreateExportRequestSchema = CreateExportJobSchema.extend({
  eventId: z.string().min(1),
});

export const createExportJob = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to export invitations.");

    const parsed = CreateExportRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((i) => i.message).join("; ")
      );
    }

    const { eventId, invitationId, versionId, format, pageSize } = parsed.data;
    const db = getAdminFirestore();

    const { eventRef } = await assertEventPermission(
      db,
      eventId,
      uid,
      "manage_invitations"
    );

    const [invSnap, verSnap] = await Promise.all([
      eventRef.collection("invitations").doc(invitationId).get(),
      eventRef.collection("invitationVersions").doc(versionId).get(),
    ]);

    if (!invSnap.exists) {
      throw new HttpsError("not-found", "Invitation not found.");
    }
    if (!verSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Publish the invitation before exporting a snapshot."
      );
    }

    const exportRef = db.collection("exports").doc();
    await exportRef.set({
      id: exportRef.id,
      userId: uid,
      eventId,
      invitationId,
      versionId,
      format,
      pageSize: pageSize ?? "a4",
      status: "queued",
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      exportId: exportRef.id,
      status: "queued",
    };
  }
);
