// ============================================================
// Nimantro — getPublicInvitation Cloud Function
// apps/functions/src/invitations/getPublicInvitation.ts
// ============================================================

import { onRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import { sha256, verifyPassword } from "../lib/crypto";
import { sanitizePublicInvitationPayload } from "../lib/publicInvitation";

/**
 * Public HTTP endpoint to fetch a published invitation by slug (and optional guest token).
 *
 * GET /getPublicInvitation?slug=my-wedding&token=...
 * POST /getPublicInvitation { slug, token?, password? }
 */
export const getPublicInvitation = onRequest(
  { region: "asia-south1", cors: true },
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<
      string,
      unknown
    >;

    const slug =
      typeof req.query.slug === "string"
        ? req.query.slug.trim()
        : typeof body.slug === "string"
        ? body.slug.trim()
        : "";

    const token =
      typeof req.query.token === "string"
        ? req.query.token.trim()
        : typeof body.token === "string"
        ? body.token.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : typeof req.headers["x-invitation-password"] === "string"
        ? req.headers["x-invitation-password"]
        : "";

    if (!slug) {
      res.status(400).json({ error: "Invitation slug is required." });
      return;
    }

    const db = getAdminFirestore();
    const slugSnap = await db.collection("slugs").doc(slug).get();

    if (!slugSnap.exists) {
      res.status(404).json({ error: "Invitation not found." });
      return;
    }

    const slugDoc = slugSnap.data() as Record<string, unknown>;
    if (slugDoc.status !== "active") {
      res.status(404).json({ error: "This invitation is currently unavailable." });
      return;
    }

    if (typeof slugDoc.passwordHash === "string" && slugDoc.passwordHash) {
      if (!password || !verifyPassword(password, slugDoc.passwordHash)) {
        res.status(401).json({
          error: "Password required to view this invitation.",
          passwordRequired: true,
        });
        return;
      }
    }

    const eventId = String(slugDoc.eventId ?? "");
    const versionId = String(slugDoc.versionId ?? "");
    const eventRef = db.collection("events").doc(eventId);

    const [eventSnap, versionSnap, sessionsSnap] = await Promise.all([
      eventRef.get(),
      eventRef.collection("invitationVersions").doc(versionId).get(),
      eventRef.collection("sessions").orderBy("startAt", "asc").get(),
    ]);

    if (!eventSnap.exists || !versionSnap.exists) {
      res.status(404).json({ error: "Published invitation snapshot not found." });
      return;
    }

    let guestContext: {
      group: Record<string, unknown>;
      guests: Record<string, unknown>[];
      guestInvitation: Record<string, unknown>;
      existingRsvp?: Record<string, unknown> | null;
    } | null = null;

    if (token) {
      const tokenHash = sha256(token);
      const giSnap = await eventRef
        .collection("guestInvitations")
        .where("tokenHash", "==", tokenHash)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (!giSnap.empty) {
        const giDoc = giSnap.docs[0];
        const giData = { id: giDoc.id, ...giDoc.data() } as Record<string, unknown>;
        const groupId = String(giData.groupId ?? "");

        const [groupSnap, guestsSnap, rsvpSnap] = await Promise.all([
          eventRef.collection("guestGroups").doc(groupId).get(),
          eventRef.collection("guests").where("groupId", "==", groupId).get(),
          eventRef.collection("rsvps").doc(giDoc.id).get(),
        ]);

        if (groupSnap.exists) {
          guestContext = {
            group: { id: groupSnap.id, ...groupSnap.data() },
            guests: guestsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            guestInvitation: giData,
            existingRsvp: rsvpSnap.exists ? { id: rsvpSnap.id, ...rsvpSnap.data() } : null,
          };

          if (!giData.viewedAt) {
            await giDoc.ref.update({ viewedAt: FieldValue.serverTimestamp() });
          }
        }
      }
    }

    if (slugDoc.visibility === "private" && !guestContext) {
      res.status(403).json({
        error: "This private invitation requires a valid personal guest link.",
      });
      return;
    }

    const payload = sanitizePublicInvitationPayload({
      event: { id: eventSnap.id, ...eventSnap.data() },
      slugDoc,
      versionDoc: { id: versionSnap.id, ...versionSnap.data() },
      sessions: sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      guestContext,
    });

    res.status(200).json(payload);
  }
);
