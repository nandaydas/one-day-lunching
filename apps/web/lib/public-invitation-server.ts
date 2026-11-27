// ============================================================
// Nimantro — Server Loader for Public Invitations
// apps/web/lib/public-invitation-server.ts
// ============================================================

import { FieldValue, getAdminFirestore } from "@nimantro/firebase/admin";
import type { InvitationDesignDocument, EventVenue } from "@nimantro/types";
import { canUserShareOrPrintInvitation } from "./invitation-permissions";
import { sha256, verifyPassword } from "./server-crypto";

export interface PublicInvitationPayload {
  event: {
    id: string;
    title: string;
    category: string;
    description: string | null;
    hostNames: string[];
    startAt: string | null;
    endAt: string | null;
    timezone: string;
    language: string;
    venue: EventVenue | null;
    coverImageUrl: string | null;
  };
  invitation: {
    id: string;
    slug: string;
    versionId: string;
    version: number;
    language: string;
    visibility: string;
    passwordProtected: boolean;
    designDocument: InvitationDesignDocument;
  };
  sessions: {
    id: string;
    title: string;
    description: string | null;
    startAt: string | null;
    endAt: string | null;
    venue: { name: string; address: string } | null;
    allowRSVP: boolean;
  }[];
  viewer: {
    canShareAndPrint: boolean;
  };
  guestContext: {
    group: {
      id: string;
      groupName: string;
      primaryContactName: string;
      invitedAdults: number;
      invitedChildren: number;
      status: string;
    };
    guests: {
      id: string;
      fullName: string;
      type: "adult" | "child";
      invitationStatus: string;
    }[];
    guestInvitation: {
      id: string;
      allowedAdults: number;
      allowedChildren: number;
      status: string;
    };
    existingRsvp: {
      status: "pending" | "accepted" | "declined" | "maybe";
      confirmedAdults: number;
      confirmedChildren: number;
      memberResponses?: { guestId: string; attending: boolean }[] | null;
      mealPreference?: string | null;
      specialRequirements?: string | null;
      message?: string | null;
    } | null;
  } | null;
}

export type PublicInvitationLoadResult =
  | { status: "ok"; data: PublicInvitationPayload }
  | { status: "password_required"; title?: string }
  | { status: "private_token_required" }
  | { status: "not_found" };

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return null;
}

export async function loadPublicInvitationBySlug(
  slug: string,
  options?: { token?: string; password?: string; viewerUid?: string | null }
): Promise<PublicInvitationLoadResult> {
  const db = getAdminFirestore();
  const slugSnap = await db.collection("slugs").doc(slug).get();

  if (!slugSnap.exists) {
    return { status: "not_found" };
  }

  const slugDoc = slugSnap.data() as Record<string, unknown>;
  if (slugDoc.status !== "active") {
    return { status: "not_found" };
  }

  if (typeof slugDoc.passwordHash === "string" && slugDoc.passwordHash) {
    if (!options?.password || !verifyPassword(options.password, slugDoc.passwordHash)) {
      return { status: "password_required" };
    }
  }

  const eventId = String(slugDoc.eventId ?? "");
  const versionId = String(slugDoc.versionId ?? "");
  const eventRef = db.collection("events").doc(eventId);

  const [eventSnap, versionSnap, sessionsSnap, viewerMemberSnap] = await Promise.all([
    eventRef.get(),
    eventRef.collection("invitationVersions").doc(versionId).get(),
    eventRef.collection("sessions").orderBy("startAt", "asc").get(),
    options?.viewerUid
      ? eventRef.collection("members").doc(options.viewerUid).get()
      : Promise.resolve(null),
  ]);

  if (!eventSnap.exists || !versionSnap.exists) {
    return { status: "not_found" };
  }

  const eventData = eventSnap.data() as Record<string, unknown>;
  const canShareAndPrint = canUserShareOrPrintInvitation({
    ownerId: eventData.ownerId,
    viewerUid: options?.viewerUid,
    member: viewerMemberSnap?.exists
      ? (viewerMemberSnap.data() as Record<string, unknown>)
      : null,
  });
  const versionData = versionSnap.data() as Record<string, unknown>;
  const designDocument = versionData.designDocument as InvitationDesignDocument;

  let guestContext: PublicInvitationPayload["guestContext"] = null;

  if (options?.token) {
    const tokenHash = sha256(options.token.trim());
    const giSnap = await eventRef
      .collection("guestInvitations")
      .where("tokenHash", "==", tokenHash)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!giSnap.empty) {
      const giDoc = giSnap.docs[0];
      const giData = giDoc.data() as Record<string, unknown>;
      const groupId = String(giData.groupId ?? "");

      const [groupSnap, guestsSnap, rsvpSnap] = await Promise.all([
        eventRef.collection("guestGroups").doc(groupId).get(),
        eventRef.collection("guests").where("groupId", "==", groupId).get(),
        eventRef.collection("rsvps").doc(giDoc.id).get(),
      ]);

      if (groupSnap.exists) {
        const gData = groupSnap.data() as Record<string, unknown>;
        const rData = rsvpSnap.exists
          ? (rsvpSnap.data() as Record<string, unknown>)
          : null;

        guestContext = {
          group: {
            id: groupSnap.id,
            groupName: String(gData.groupName ?? ""),
            primaryContactName: String(gData.primaryContactName ?? ""),
            invitedAdults: Number(gData.invitedAdults ?? 0),
            invitedChildren: Number(gData.invitedChildren ?? 0),
            status: String(gData.status ?? "invited"),
          },
          guests: guestsSnap.docs.map((d) => {
            const gd = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              fullName: String(gd.fullName ?? ""),
              type: gd.type === "child" ? "child" : "adult",
              invitationStatus: String(gd.invitationStatus ?? "pending"),
            };
          }),
          guestInvitation: {
            id: giDoc.id,
            allowedAdults: Number(giData.allowedAdults ?? 0),
            allowedChildren: Number(giData.allowedChildren ?? 0),
            status: String(giData.status ?? "active"),
          },
          existingRsvp: rData
            ? {
                status:
                  (rData.status as "pending" | "accepted" | "declined" | "maybe") ??
                  "pending",
                confirmedAdults: Number(rData.confirmedAdults ?? 0),
                confirmedChildren: Number(rData.confirmedChildren ?? 0),
                memberResponses: Array.isArray(rData.memberResponses)
                  ? (rData.memberResponses as { guestId: string; attending: boolean }[])
                  : null,
                mealPreference:
                  typeof rData.mealPreference === "string" ? rData.mealPreference : null,
                specialRequirements:
                  typeof rData.specialRequirements === "string"
                    ? rData.specialRequirements
                    : null,
                message: typeof rData.message === "string" ? rData.message : null,
              }
            : null,
        };

        if (!giData.viewedAt) {
          await giDoc.ref.update({ viewedAt: FieldValue.serverTimestamp() });
        }
      }
    }
  }

  if (slugDoc.visibility === "private" && !guestContext && !canShareAndPrint) {
    return { status: "private_token_required" };
  }

  return {
    status: "ok",
    data: {
      event: {
        id: eventSnap.id,
        title: String(eventData.title ?? ""),
        category: String(eventData.category ?? "other"),
        description:
          typeof eventData.description === "string" ? eventData.description : null,
        hostNames: Array.isArray(eventData.hostNames)
          ? eventData.hostNames.map(String)
          : [],
        startAt: toIso(eventData.startAt),
        endAt: toIso(eventData.endAt),
        timezone: String(eventData.timezone ?? "Asia/Kolkata"),
        language: String(eventData.language ?? designDocument.language ?? "both"),
        venue: (eventData.venue as EventVenue | null) ?? null,
        coverImageUrl:
          typeof eventData.coverImageUrl === "string" ? eventData.coverImageUrl : null,
      },
      invitation: {
        id: String(slugDoc.invitationId ?? versionData.invitationId ?? ""),
        slug: String(slugDoc.slug ?? slug),
        versionId: String(slugDoc.versionId ?? versionSnap.id),
        version: Number(versionData.version ?? 1),
        language: designDocument.language,
        visibility: String(slugDoc.visibility ?? "public"),
        passwordProtected: Boolean(slugDoc.passwordHash),
        designDocument,
      },
      sessions: sessionsSnap.docs
        .filter((d) => d.data().status !== "cancelled")
        .map((d) => {
          const sd = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            title: String(sd.title ?? ""),
            description:
              typeof sd.description === "string" ? sd.description : null,
            startAt: toIso(sd.startAt),
            endAt: toIso(sd.endAt),
            venue: (sd.venue as { name: string; address: string } | null) ?? null,
            allowRSVP: Boolean(sd.allowRSVP ?? true),
          };
        }),
      viewer: {
        canShareAndPrint,
      },
      guestContext,
    },
  };
}
