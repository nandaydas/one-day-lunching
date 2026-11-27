// ============================================================
// Nimantro — publishInvitation Cloud Function
// apps/functions/src/invitations/publishInvitation.ts
// ============================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import {
  InvitationDesignDocumentSchema,
  PublishInvitationSchema,
  z,
} from "@nimantro/validation";
import { assertEventPermission, requireAuth } from "../lib/auth";
import { hashPassword } from "../lib/crypto";

const PublishRequestSchema = PublishInvitationSchema.extend({
  eventId: z.string().min(1),
});

export const publishInvitation = onCall(
  { region: "asia-south1", enforceAppCheck: false },
  async (request) => {
    const uid = requireAuth(request, "Sign in to publish an invitation.");

    const parsed = PublishRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((i) => i.message).join("; ")
      );
    }

    const { eventId, invitationId, slug, visibility, passwordProtected, password } =
      parsed.data;

    const db = getAdminFirestore();
    const { eventRef, event } = await assertEventPermission(
      db,
      eventId,
      uid,
      "manage_invitations"
    );

    const invitationRef = eventRef.collection("invitations").doc(invitationId);
    const slugRef = db.collection("slugs").doc(slug);

    const result = await db.runTransaction(async (tx) => {
      const [invSnap, targetSlugSnap, existingVersionsSnap] = await Promise.all([
        tx.get(invitationRef),
        tx.get(slugRef),
        tx.get(
          eventRef
            .collection("invitationVersions")
            .where("invitationId", "==", invitationId)
            .orderBy("version", "desc")
            .limit(1)
        ),
      ]);

      if (!invSnap.exists) {
        throw new HttpsError("not-found", "Invitation not found.");
      }

      const invitationData = invSnap.data() as Record<string, unknown>;

      if (targetSlugSnap.exists) {
        const slugOwnerData = targetSlugSnap.data() as Record<string, unknown>;
        if (slugOwnerData.invitationId !== invitationId) {
          throw new HttpsError(
            "already-exists",
            "This invitation URL slug is already taken. Please choose another."
          );
        }
      }

      const designCheck = InvitationDesignDocumentSchema.safeParse(
        invitationData.designDocument
      );
      if (!designCheck.success) {
        throw new HttpsError(
          "failed-precondition",
          "Invitation design document is incomplete or invalid."
        );
      }

      const existingPasswordHash = targetSlugSnap.exists
        ? (targetSlugSnap.data()?.passwordHash as string | undefined)
        : undefined;

      let passwordHash: string | null = null;
      if (passwordProtected) {
        if (password) {
          passwordHash = hashPassword(password);
        } else if (existingPasswordHash) {
          passwordHash = existingPasswordHash;
        } else {
          throw new HttpsError(
            "invalid-argument",
            "A password is required when password protection is enabled."
          );
        }
      }

      // Release previous slug if the host changed the slug
      const previousSlug =
        typeof invitationData.slug === "string" ? invitationData.slug : null;
      if (previousSlug && previousSlug !== slug) {
        const oldSlugRef = db.collection("slugs").doc(previousSlug);
        const oldSlugSnap = await tx.get(oldSlugRef);
        if (oldSlugSnap.exists && oldSlugSnap.data()?.invitationId === invitationId) {
          tx.delete(oldSlugRef);
        }
      }

      const latestVersion = existingVersionsSnap.empty
        ? 0
        : Number(existingVersionsSnap.docs[0].data().version ?? 0);
      const nextVersion = latestVersion + 1;

      const versionRef = eventRef.collection("invitationVersions").doc();
      tx.set(versionRef, {
        id: versionRef.id,
        invitationId,
        eventId,
        version: nextVersion,
        templateId: invitationData.templateId,
        templateVersion: invitationData.templateVersion ?? 1,
        designDocument: invitationData.designDocument,
        publishedBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(invitationRef, {
        slug,
        visibility,
        passwordProtected: Boolean(passwordProtected),
        publishedVersionId: versionRef.id,
        status: "published",
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (event.status === "draft") {
        tx.update(eventRef, {
          status: "published",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(slugRef, {
        slug,
        eventId,
        invitationId,
        versionId: versionRef.id,
        ownerId: event.ownerId,
        visibility,
        ...(passwordHash ? { passwordHash } : {}),
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        slug,
        versionId: versionRef.id,
        version: nextVersion,
        url: `/i/${slug}`,
      };
    });

    return result;
  }
);
