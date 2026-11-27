// ============================================================
// Nimantro — Events API Route
// apps/web/app/api/events/route.ts
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getAdminFirestore } from "@nimantro/firebase/admin";
import { templateToDesignDocument } from "@nimantro/invitation-engine";
import { CreateEventSchema, generateSlug, z } from "@nimantro/validation";
import { getServerUser } from "@/lib/server-auth";
import { BUNDLED_TEMPLATES, getTemplateById } from "@/lib/templates";
import { EXPERIENCE_OPTIONS } from "@/lib/experience";

const CreateEventPayloadSchema = CreateEventSchema.extend({
  templateId: z.string().optional(),
  experience: z.record(z.string().max(40)).optional(),
});

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const db = getAdminFirestore();
    const snap = await db
      .collection("events")
      .where("ownerId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const events = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to create an event." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateEventPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const {
      title,
      category,
      description,
      hostNames,
      startAt,
      endAt,
      timezone,
      language,
      visibility,
      venue,
      coverImageUrl,
      templateId,
      experience,
    } = parsed.data;

    const startDate = new Date(startAt);
    const endDate = endAt ? new Date(endAt) : null;
    if (endDate && endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { error: "Event end date must be after start date." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const activeSnap = await db
      .collection("events")
      .where("ownerId", "==", user.uid)
      .where("status", "in", ["draft", "published"])
      .count()
      .get();

    if (activeSnap.data().count >= 3) {
      const subSnap = await db.collection("subscriptionAccounts").doc(user.uid).get();
      const plan = (subSnap.data()?.plan as string | undefined) ?? "free";
      const maxEvents = plan === "event_business" ? 100 : plan === "event_pro" ? 15 : 3;
      if (activeSnap.data().count >= maxEvents) {
        return NextResponse.json(
          {
            error: `Plan limit reached: maximum ${maxEvents} active events. Archive an existing event first.`,
          },
          { status: 429 }
        );
      }
    }

    const template =
      (templateId ? getTemplateById(templateId) : undefined) ??
      BUNDLED_TEMPLATES.find((t) => t.eventCategories.includes(category)) ??
      BUNDLED_TEMPLATES[0];

    const baseSlug = generateSlug(title) || `event-${Date.now()}`;
    const defaultSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const designDocument = templateToDesignDocument(template, {
      language,
      ...(coverImageUrl ? { coverImageUrl } : {}),
      contentOverrides: {
        hero: {
          primaryNames: {
            bn: hostNames.join(" ও "),
            en: hostNames.join(" & "),
          },
          // empty → renderer formats the real event date instead of the template's sample date
          dateLabel: { bn: "", en: "" },
        },
        countdown: {
          targetDate: startAt.slice(0, 16),
        },
        ...(venue
          ? {
              venue: {
                venueName: { bn: venue.name, en: venue.name },
                address: { bn: venue.address, en: venue.address },
                ...(venue.mapsUrl ? { mapsUrl: venue.mapsUrl } : {}),
              },
            }
          : {}),
      },
    });
    // Host's opening/music/effect picks from the create form; unknown keys or values are dropped.
    const picks = Object.entries(experience ?? {}).filter(([k, v]) =>
      (EXPERIENCE_OPTIONS[k as keyof typeof EXPERIENCE_OPTIONS] as readonly string[] | undefined)?.includes(v)
    );
    if (picks.length) designDocument.metadata = Object.fromEntries(picks);

    const eventRef = db.collection("events").doc();
    const invitationRef = eventRef.collection("invitations").doc();
    const memberRef = eventRef.collection("members").doc(user.uid);

    await db.runTransaction(async (tx) => {
      tx.set(eventRef, {
        id: eventRef.id,
        ownerId: user.uid,
        title: title.trim(),
        category,
        description: description?.trim() ?? null,
        hostNames: hostNames.map((n) => n.trim()),
        startAt: startDate,
        endAt: endDate,
        timezone,
        language,
        visibility,
        venue: venue ?? null,
        coverImageUrl: coverImageUrl ?? null,
        status: "draft",
        invitationCount: 1,
        guestGroupCount: 0,
        invitedPersonCount: 0,
        confirmedPersonCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(memberRef, {
        uid: user.uid,
        role: "owner",
        permissions: [
          "manage_invitations",
          "manage_guests",
          "view_analytics",
          "manage_members",
        ],
        invitedBy: user.uid,
        joinedAt: FieldValue.serverTimestamp(),
      });

      tx.set(invitationRef, {
        id: invitationRef.id,
        eventId: eventRef.id,
        templateId: template.id,
        templateVersion: template.version,
        title: title.trim(),
        slug: defaultSlug,
        language,
        designDocument,
        visibility,
        passwordProtected: false,
        status: "draft",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json(
      { eventId: eventRef.id, invitationId: invitationRef.id },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create event.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
