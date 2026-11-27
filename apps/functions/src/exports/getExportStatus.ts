// ============================================================
// Nimantro — getExportStatus Cloud Function
// apps/functions/src/exports/getExportStatus.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import { z } from "zod";
import { requireAuth } from "../lib/auth";

const GetExportStatusSchema = z.object({
  exportId: z.string().min(1),
});

export const getExportStatus = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to check export status.");

    const parsed = GetExportStatusSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Valid exportId is required.");
    }

    const db = getAdminFirestore();
    const exportSnap = await db.collection("exports").doc(parsed.data.exportId).get();

    if (!exportSnap.exists) {
      throw new HttpsError("not-found", "Export job not found.");
    }

    const data = exportSnap.data() as Record<string, unknown>;
    if (data.userId !== uid) {
      throw new HttpsError("permission-denied", "You do not have access to this export job.");
    }

    return {
      id: exportSnap.id,
      eventId: data.eventId,
      invitationId: data.invitationId,
      versionId: data.versionId,
      format: data.format,
      status: data.status,
      downloadUrl: data.downloadUrl ?? null,
      errorCode: data.errorCode ?? null,
      createdAt: data.createdAt ?? null,
      completedAt: data.completedAt ?? null,
    };
  }
);
