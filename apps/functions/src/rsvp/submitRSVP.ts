// ============================================================
// Nimantro — submitRSVP Cloud Function
// apps/functions/src/rsvp/submitRSVP.ts
// ============================================================

import { onRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@nimantro/firebase/admin";
import { SubmitRSVPSchema } from "@nimantro/validation";
import { sha256 } from "../lib/crypto";

/**
 * Public HTTPS endpoint — no authentication required.
 * Guests submit via their unique token link.
 *
 * POST /submitRSVP
 * Body: SubmitRSVPRequest
 */
export const submitRSVP = onRequest(
  { region: "asia-south1", cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const result = SubmitRSVPSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid request",
        details: result.error.issues.map((i) => i.message),
      });
      return;
    }

    const {
      token,
      status,
      confirmedAdults = 0,
      confirmedChildren = 0,
      memberResponses,
      mealPreference,
      specialRequirements,
      message,
    } = result.data;

    const db = getAdminFirestore();
    const tokenHash = sha256(token);

    const guestInvitationsSnap = await db
      .collectionGroup("guestInvitations")
      .where("tokenHash", "==", tokenHash)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (guestInvitationsSnap.empty) {
      res.status(403).json({ error: "Invalid or expired invitation token." });
      return;
    }

    const guestInvitationDoc = guestInvitationsSnap.docs[0];
    const guestInvitation = guestInvitationDoc.data();

    const eventId = String(guestInvitation.eventId ?? "");
    const groupId = String(guestInvitation.groupId ?? "");
    const guestInvitationId = String(
      guestInvitation.guestInvitationId ?? guestInvitation.id ?? guestInvitationDoc.id
    );
    const allowedAdults = Number(guestInvitation.allowedAdults ?? 0);
    const allowedChildren = Number(guestInvitation.allowedChildren ?? 0);

    if (status === "accepted") {
      if (confirmedAdults > allowedAdults || confirmedChildren > allowedChildren) {
        res.status(400).json({
          error: "Confirmed guests exceed authorised capacity.",
          allowedAdults,
          allowedChildren,
        });
        return;
      }
    }

    const eventRef = db.collection("events").doc(eventId);
    const rsvpRef = eventRef.collection("rsvps").doc(guestInvitationId);
    const groupRef = eventRef.collection("guestGroups").doc(groupId);

    await db.runTransaction(async (tx) => {
      const [existingRSVP, eventDoc, groupDoc] = await Promise.all([
        tx.get(rsvpRef),
        tx.get(eventRef),
        tx.get(groupRef),
      ]);

      if (!eventDoc.exists) {
        throw new Error("Event not found.");
      }

      const prevStatus = existingRSVP.exists
        ? existingRSVP.data()?.status
        : "pending";
      const prevAdults = existingRSVP.exists
        ? existingRSVP.data()?.confirmedAdults ?? 0
        : 0;
      const prevChildren = existingRSVP.exists
        ? existingRSVP.data()?.confirmedChildren ?? 0
        : 0;

      tx.set(rsvpRef, {
        id: rsvpRef.id,
        eventId,
        groupId,
        guestInvitationId,
        status,
        confirmedAdults: status === "accepted" ? confirmedAdults : 0,
        confirmedChildren: status === "accepted" ? confirmedChildren : 0,
        memberResponses: memberResponses ?? null,
        mealPreference: mealPreference ?? null,
        specialRequirements: specialRequirements ?? null,
        message: message ?? null,
        respondedAt: existingRSVP.exists
          ? existingRSVP.data()?.respondedAt ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (memberResponses && memberResponses.length > 0) {
        for (const mr of memberResponses) {
          const guestRef = eventRef.collection("guests").doc(mr.guestId);
          tx.update(guestRef, {
            invitationStatus:
              status === "declined"
                ? "declined"
                : mr.attending
                ? "accepted"
                : "declined",
          });
        }
      }

      const confirmedDelta =
        (status === "accepted" ? confirmedAdults + confirmedChildren : 0) -
        (prevStatus === "accepted" ? prevAdults + prevChildren : 0);

      if (confirmedDelta !== 0) {
        tx.update(eventRef, {
          confirmedPersonCount: FieldValue.increment(confirmedDelta),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.update(groupRef, {
        status: "responded",
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (!guestInvitation.viewedAt) {
        tx.update(guestInvitationDoc.ref, {
          viewedAt: FieldValue.serverTimestamp(),
        });
      }

      const ownerId = eventDoc.data()?.ownerId as string | undefined;
      if (ownerId) {
        const groupName =
          (groupDoc.exists ? (groupDoc.data()?.groupName as string | undefined) : undefined) ??
          "A guest household";
        const notifRef = db.collection("notifications").doc();
        tx.set(notifRef, {
          id: notifRef.id,
          userId: ownerId,
          type: "rsvp_received",
          title: `RSVP received from ${groupName}`,
          body:
            status === "accepted"
              ? `${groupName} confirmed ${confirmedAdults + confirmedChildren} guest(s).`
              : `${groupName} responded: ${status}.`,
          read: false,
          data: { eventId, groupId, status },
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    res.status(200).json({
      success: true,
      status,
      message:
        status === "accepted"
          ? "Thank you! Your attendance is confirmed."
          : status === "declined"
          ? "Thank you for letting us know."
          : "Thank you! Your response has been recorded.",
    });
  }
);
