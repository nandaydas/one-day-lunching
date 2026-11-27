// ============================================================
// Nimantro — Public RSVP Submission API Route
// apps/web/app/api/rsvp/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getAdminFirestore } from "@nimantro/firebase/admin";
import { validateCapacityAllocation } from "@nimantro/guest-management";
import { SubmitRSVPSchema } from "@nimantro/validation";
import { sha256 } from "@/lib/server-crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = SubmitRSVPSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
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
  } = parsed.data;

  const db = getAdminFirestore();
  const tokenHash = sha256(token.trim());

  const giSnap = await db
    .collectionGroup("guestInvitations")
    .where("tokenHash", "==", tokenHash)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (giSnap.empty) {
    return NextResponse.json(
      { error: "Invalid or expired invitation link." },
      { status: 403 }
    );
  }

  const giDoc = giSnap.docs[0];
  const giData = giDoc.data();
  const eventId = String(giData.eventId ?? "");
  const groupId = String(giData.groupId ?? "");
  const guestInvitationId = String(giData.guestInvitationId ?? giData.id ?? giDoc.id);
  const allowedAdults = Number(giData.allowedAdults ?? 0);
  const allowedChildren = Number(giData.allowedChildren ?? 0);

  if (status === "accepted") {
    const capacity = validateCapacityAllocation(
      allowedAdults,
      allowedChildren,
      confirmedAdults,
      confirmedChildren
    );
    if (!capacity.valid) {
      return NextResponse.json(
        { error: capacity.reason ?? "Confirmed guests exceed authorised capacity." },
        { status: 400 }
      );
    }
  }

  const eventRef = db.collection("events").doc(eventId);
  const rsvpRef = eventRef.collection("rsvps").doc(guestInvitationId);
  const groupRef = eventRef.collection("guestGroups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const [existingRsvp, eventDoc, groupDoc] = await Promise.all([
      tx.get(rsvpRef),
      tx.get(eventRef),
      tx.get(groupRef),
    ]);

    if (!eventDoc.exists) {
      throw new Error("Event not found.");
    }

    const prevStatus = existingRsvp.exists ? existingRsvp.data()?.status : "pending";
    const prevAdults = existingRsvp.exists ? existingRsvp.data()?.confirmedAdults ?? 0 : 0;
    const prevChildren = existingRsvp.exists
      ? existingRsvp.data()?.confirmedChildren ?? 0
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
      respondedAt: existingRsvp.exists
        ? existingRsvp.data()?.respondedAt ?? FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (memberResponses && memberResponses.length > 0) {
      for (const mr of memberResponses) {
        tx.update(eventRef.collection("guests").doc(mr.guestId), {
          invitationStatus:
            status === "declined" ? "declined" : mr.attending ? "accepted" : "declined",
        });
      }
    }

    const delta =
      (status === "accepted" ? confirmedAdults + confirmedChildren : 0) -
      (prevStatus === "accepted" ? prevAdults + prevChildren : 0);

    if (delta !== 0) {
      tx.update(eventRef, {
        confirmedPersonCount: FieldValue.increment(delta),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.update(groupRef, {
      status: "responded",
      updatedAt: FieldValue.serverTimestamp(),
    });

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

  return NextResponse.json({
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
