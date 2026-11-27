import { describe, expect, it } from "vitest";
import { generateSecureToken, hashPassword, sha256, verifyPassword } from "./crypto";
import { computeEventAnalytics } from "./analytics";
import { sanitizePublicInvitationPayload } from "./publicInvitation";
import type { CheckInDocument, GuestGroupDocument, RSVPDocument } from "@nimantro/types";

describe("functions crypto helpers", () => {
  it("generates unique tokens of at least 32 characters and deterministic sha256 hashes", () => {
    const t1 = generateSecureToken();
    const t2 = generateSecureToken();
    expect(t1.length).toBeGreaterThanOrEqual(32);
    expect(t1).not.toBe(t2);
    expect(sha256(t1)).toHaveLength(64);
    expect(sha256(t1)).toBe(sha256(t1));
  });

  it("hashes and verifies passwords with scrypt timing-safe comparison", () => {
    const hash = hashPassword("shubho-bibaho-2026");
    expect(hash).toContain(":");
    expect(verifyPassword("shubho-bibaho-2026", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
    expect(verifyPassword("anything", "malformed")).toBe(false);
  });
});

describe("functions analytics helper", () => {
  it("aggregates household and person-level attendance accurately", () => {
    const now = "2026-01-01T00:00:00.000Z";
    const groups: GuestGroupDocument[] = [
      {
        id: "g1",
        eventId: "e1",
        groupName: "Chatterjee Family",
        primaryContactName: "Arjun",
        invitedAdults: 3,
        invitedChildren: 1,
        status: "responded",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "g2",
        eventId: "e1",
        groupName: "Sen Family",
        primaryContactName: "Riya",
        invitedAdults: 2,
        invitedChildren: 1,
        status: "responded",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "g3",
        eventId: "e1",
        groupName: "Roy Family",
        primaryContactName: "Suman",
        invitedAdults: 2,
        invitedChildren: 0,
        status: "invited",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const rsvps: RSVPDocument[] = [
      {
        id: "r1",
        eventId: "e1",
        groupId: "g1",
        guestInvitationId: "gi1",
        status: "accepted",
        confirmedAdults: 2,
        confirmedChildren: 1,
        updatedAt: now,
      },
      {
        id: "r2",
        eventId: "e1",
        groupId: "g2",
        guestInvitationId: "gi2",
        status: "maybe",
        confirmedAdults: 0,
        confirmedChildren: 0,
        updatedAt: now,
      },
    ];

    const checkIns: CheckInDocument[] = [
      {
        id: "c1",
        eventId: "e1",
        sessionId: "s1",
        guestId: "guest-1",
        groupId: "g1",
        checkedInBy: "u1",
        checkedInAt: now,
        status: "checked_in",
      },
      {
        id: "c2",
        eventId: "e1",
        sessionId: "s1",
        guestId: "guest-2",
        groupId: "g1",
        checkedInBy: "u1",
        checkedInAt: now,
        status: "reversed",
      },
    ];

    const summary = computeEventAnalytics("e1", groups, rsvps, checkIns);
    expect(summary).toEqual({
      eventId: "e1",
      totalGuestGroups: 3,
      totalInvitedPeople: 9,
      totalInvitedAdults: 7,
      totalInvitedChildren: 2,
      totalConfirmedPeople: 3,
      totalConfirmedAdults: 2,
      totalConfirmedChildren: 1,
      totalDeclined: 0,
      totalPending: 2,
      totalMaybe: 3,
      totalCheckIns: 1,
      rsvpResponseRate: 0.6667,
    });
  });
});

describe("public invitation sanitization", () => {
  it("strips private owner metadata and omits sensitive fields", () => {
    const payload = sanitizePublicInvitationPayload({
      event: {
        id: "e1",
        ownerId: "secret-owner-uid",
        title: "Subho Bibaho",
        category: "wedding",
        hostNames: ["Mukherjee Family"],
        startAt: "2026-12-10T18:00:00.000Z",
        timezone: "Asia/Kolkata",
        language: "both",
        visibility: "public",
      },
      slugDoc: {
        slug: "subho-bibaho",
        eventId: "e1",
        invitationId: "inv1",
        versionId: "v1",
        ownerId: "secret-owner-uid",
        visibility: "public",
        passwordHash: "salt:hash",
        status: "active",
      },
      versionDoc: {
        id: "v1",
        invitationId: "inv1",
        version: 1,
        templateId: "bengali-wedding-001",
        templateVersion: 1,
        designDocument: {
          templateId: "bengali-wedding-001",
          templateVersion: 1,
          language: "both",
          theme: {
            primary: "#8B1E2D",
            secondary: "#C9A84C",
            background: "#FFF9F0",
            surface: "#FFFFFF",
            text: "#1A1218",
            muted: "#7A6B62",
            border: "#E8D8B8",
            headingFont: "Noto Serif Bengali",
            bodyFont: "Hind Siliguri",
          },
          sections: [],
        },
      },
      sessions: [],
    });

    expect(JSON.stringify(payload)).not.toContain("secret-owner-uid");
    expect(JSON.stringify(payload)).not.toContain("salt:hash");
    expect(payload.invitation.slug).toBe("subho-bibaho");
    expect(payload.event.title).toBe("Subho Bibaho");
  });
});
