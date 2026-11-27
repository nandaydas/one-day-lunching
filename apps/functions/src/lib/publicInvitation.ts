// ============================================================
// Nimantro — Public Invitation Sanitization Helper
// apps/functions/src/lib/publicInvitation.ts
// ============================================================

import type { InvitationDesignDocument } from "@nimantro/types";

interface SanitizeInput {
  event: Record<string, unknown>;
  slugDoc: Record<string, unknown>;
  versionDoc: Record<string, unknown>;
  sessions: Record<string, unknown>[];
  guestContext?: {
    group: Record<string, unknown>;
    guests: Record<string, unknown>[];
    guestInvitation: Record<string, unknown>;
    existingRsvp?: Record<string, unknown> | null;
  } | null;
}

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date(((value as { seconds: number }).seconds) * 1000).toISOString();
  }
  return null;
}

export function sanitizePublicInvitationPayload({
  event,
  slugDoc,
  versionDoc,
  sessions,
  guestContext,
}: SanitizeInput) {
  const designDocument = versionDoc.designDocument as InvitationDesignDocument;

  return {
    event: {
      id: String(event.id ?? slugDoc.eventId ?? ""),
      title: String(event.title ?? ""),
      category: String(event.category ?? "other"),
      description: typeof event.description === "string" ? event.description : null,
      hostNames: Array.isArray(event.hostNames) ? event.hostNames.map(String) : [],
      startAt: serializeTimestamp(event.startAt),
      endAt: serializeTimestamp(event.endAt),
      timezone: String(event.timezone ?? "Asia/Kolkata"),
      language: String(event.language ?? designDocument?.language ?? "both"),
      venue: event.venue ?? null,
      coverImageUrl: typeof event.coverImageUrl === "string" ? event.coverImageUrl : null,
    },
    invitation: {
      id: String(slugDoc.invitationId ?? versionDoc.invitationId ?? ""),
      slug: String(slugDoc.slug ?? ""),
      versionId: String(slugDoc.versionId ?? versionDoc.id ?? ""),
      version: Number(versionDoc.version ?? 1),
      language: designDocument?.language ?? String(event.language ?? "both"),
      visibility: String(slugDoc.visibility ?? "public"),
      passwordProtected: Boolean(slugDoc.passwordHash),
      designDocument,
    },
    sessions: sessions
      .filter((s) => s.status !== "cancelled")
      .map((s) => ({
        id: String(s.id ?? ""),
        title: String(s.title ?? ""),
        description: typeof s.description === "string" ? s.description : null,
        startAt: serializeTimestamp(s.startAt),
        endAt: serializeTimestamp(s.endAt),
        venue: s.venue ?? null,
        allowRSVP: Boolean(s.allowRSVP ?? true),
      })),
    guestContext: guestContext
      ? {
          group: {
            id: String(guestContext.group.id ?? ""),
            groupName: String(guestContext.group.groupName ?? ""),
            primaryContactName: String(guestContext.group.primaryContactName ?? ""),
            invitedAdults: Number(guestContext.group.invitedAdults ?? 0),
            invitedChildren: Number(guestContext.group.invitedChildren ?? 0),
            status: String(guestContext.group.status ?? "invited"),
          },
          guests: guestContext.guests.map((g) => ({
            id: String(g.id ?? ""),
            fullName: String(g.fullName ?? ""),
            type: String(g.type ?? "adult"),
            invitationStatus: String(g.invitationStatus ?? "pending"),
          })),
          guestInvitation: {
            id: String(guestContext.guestInvitation.id ?? ""),
            allowedAdults: Number(guestContext.guestInvitation.allowedAdults ?? 0),
            allowedChildren: Number(guestContext.guestInvitation.allowedChildren ?? 0),
            status: String(guestContext.guestInvitation.status ?? "active"),
          },
          existingRsvp: guestContext.existingRsvp
            ? {
                status: String(guestContext.existingRsvp.status ?? "pending"),
                confirmedAdults: Number(guestContext.existingRsvp.confirmedAdults ?? 0),
                confirmedChildren: Number(guestContext.existingRsvp.confirmedChildren ?? 0),
                memberResponses: guestContext.existingRsvp.memberResponses ?? null,
                mealPreference: guestContext.existingRsvp.mealPreference ?? null,
                specialRequirements: guestContext.existingRsvp.specialRequirements ?? null,
                message: guestContext.existingRsvp.message ?? null,
              }
            : null,
        }
      : null,
  };
}
