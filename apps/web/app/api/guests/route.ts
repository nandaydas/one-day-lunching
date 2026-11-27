// ============================================================
// Nimantro — Guest Groups API Route (Single & Bulk CSV Import)
// apps/web/app/api/guests/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "@nimantro/firebase/admin";
import {
  AddGuestMemberSchema,
  CreateGuestGroupSchema,
  z,
} from "@nimantro/validation";
import { assertServerEventPermission, getServerUser } from "@/lib/server-auth";

const SingleOrBatchSchema = z.object({
  eventId: z.string().min(1),
  groups: z
    .array(
      CreateGuestGroupSchema.extend({
        members: z.array(AddGuestMemberSchema).max(50).optional(),
      })
    )
    .min(1)
    .max(200),
});

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SingleOrBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { eventId, groups } = parsed.data;
  const authCheck = await assertServerEventPermission(
    eventId,
    user.uid,
    "manage_guests"
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { db, eventRef } = authCheck;
  const createdIds: string[] = [];

  await db.runTransaction(async (tx) => {
    let addedPeople = 0;

    for (const item of groups) {
      const groupRef = eventRef.collection("guestGroups").doc();
      createdIds.push(groupRef.id);
      addedPeople += item.invitedAdults + item.invitedChildren;

      tx.set(groupRef, {
        id: groupRef.id,
        eventId,
        groupName: item.groupName.trim(),
        primaryContactName: item.primaryContactName.trim(),
        ...(item.phone?.trim() ? { phone: item.phone.trim() } : {}),
        ...(item.email?.trim() ? { email: item.email.trim().toLowerCase() } : {}),
        invitedAdults: item.invitedAdults,
        invitedChildren: item.invitedChildren,
        status: "draft",
        ...(item.notes?.trim() ? { notes: item.notes.trim() } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (item.members && item.members.length > 0) {
        for (const m of item.members) {
          const guestRef = eventRef.collection("guests").doc();
          tx.set(guestRef, {
            id: guestRef.id,
            groupId: groupRef.id,
            eventId,
            fullName: m.fullName.trim(),
            type: m.type,
            ...(m.phone?.trim() ? { phone: m.phone.trim() } : {}),
            invitationStatus: "pending",
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    tx.update(eventRef, {
      guestGroupCount: FieldValue.increment(groups.length),
      invitedPersonCount: FieldValue.increment(addedPeople),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return NextResponse.json({ createdIds }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim();
  const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
  if (!eventId || !groupId) {
    return NextResponse.json(
      { error: "eventId and groupId are required." },
      { status: 400 }
    );
  }

  const authCheck = await assertServerEventPermission(
    eventId,
    user.uid,
    "manage_guests"
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { db, eventRef } = authCheck;
  const groupRef = eventRef.collection("guestGroups").doc(groupId);
  const [groupSnap, guestsSnap, giSnap] = await Promise.all([
    groupRef.get(),
    eventRef.collection("guests").where("groupId", "==", groupId).get(),
    eventRef.collection("guestInvitations").where("groupId", "==", groupId).get(),
  ]);

  if (!groupSnap.exists) {
    return NextResponse.json({ error: "Guest group not found." }, { status: 404 });
  }

  const gData = groupSnap.data() as Record<string, unknown>;
  const removedPeople =
    Number(gData.invitedAdults ?? 0) + Number(gData.invitedChildren ?? 0);

  await db.runTransaction(async (tx) => {
    tx.delete(groupRef);
    for (const d of guestsSnap.docs) tx.delete(d.ref);
    for (const d of giSnap.docs) tx.delete(d.ref);
    tx.update(eventRef, {
      guestGroupCount: FieldValue.increment(-1),
      invitedPersonCount: FieldValue.increment(-removedPeople),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return NextResponse.json({ deleted: true });
}
