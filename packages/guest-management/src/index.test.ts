import { describe, expect, it } from "vitest";
import {
  calculateEventAttendanceStats,
  calculateHouseholdSummary,
  parseGuestCSV,
  validateCapacityAllocation,
} from "./index";
import type { GuestGroupDocument, RSVPDocument } from "@nimantro/types";

describe("guest-management business logic", () => {
  it("validates capacity allocation accurately", () => {
    expect(validateCapacityAllocation(4, 2, 3, 1)).toEqual({ valid: true });
    expect(validateCapacityAllocation(4, 2, 5, 0).valid).toBe(false);
    expect(validateCapacityAllocation(4, 2, 2, 3).valid).toBe(false);
    expect(validateCapacityAllocation(4, 2, -1, 0).valid).toBe(false);
  });

  it("calculates household summary and pending counts properly", () => {
    const accepted = calculateHouseholdSummary(
      { id: "g1", groupName: "Sarkar Family", invitedAdults: 4, invitedChildren: 2 },
      { status: "accepted", confirmedAdults: 3, confirmedChildren: 1 }
    );
    expect(accepted.invitedPeople).toBe(6);
    expect(accepted.expectedAttendance).toBe(4);
    expect(accepted.pendingPeople).toBe(0);

    const pending = calculateHouseholdSummary({
      id: "g2",
      groupName: "Roy Family",
      invitedAdults: 2,
      invitedChildren: 1,
    });
    expect(pending.expectedAttendance).toBe(0);
    expect(pending.pendingPeople).toBe(3);
  });

  it("distinguishes invitation count from person count in event analytics", () => {
    const now = new Date().toISOString();
    const groups: GuestGroupDocument[] = [
      {
        id: "g1",
        eventId: "e1",
        groupName: "Sarkar Family",
        primaryContactName: "Anirban",
        invitedAdults: 4,
        invitedChildren: 2,
        status: "responded",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "g2",
        eventId: "e1",
        groupName: "Das Family",
        primaryContactName: "Subhankar",
        invitedAdults: 2,
        invitedChildren: 0,
        status: "responded",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "g3",
        eventId: "e1",
        groupName: "Sen Family",
        primaryContactName: "Ritu",
        invitedAdults: 3,
        invitedChildren: 1,
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
        confirmedAdults: 3,
        confirmedChildren: 1,
        updatedAt: now,
      },
      {
        id: "r2",
        eventId: "e1",
        groupId: "g2",
        guestInvitationId: "gi2",
        status: "declined",
        confirmedAdults: 0,
        confirmedChildren: 0,
        updatedAt: now,
      },
    ];

    const stats = calculateEventAttendanceStats("e1", groups, rsvps);
    expect(stats.totalGuestGroups).toBe(3);
    expect(stats.totalInvitedPeople).toBe(12);
    expect(stats.totalConfirmedPeople).toBe(4);
    expect(stats.totalConfirmedAdults).toBe(3);
    expect(stats.totalConfirmedChildren).toBe(1);
    expect(stats.totalDeclined).toBe(2);
    expect(stats.totalPending).toBe(4);
    expect(stats.rsvpResponseRate).toBeCloseTo(2 / 3, 3);
  });

  it("parses valid CSV rows and flags malformed rows", () => {
    const csv = [
      "groupName,primaryContactName,phone,email,invitedAdults,invitedChildren",
      "Sarkar Family,Suman Sarkar,+919830011223,suman@example.com,4,2",
      "Broken Row,,+91999,not-an-email,2,1",
    ].join("\n");

    const res = parseGuestCSV(csv);
    expect(res.validRows).toHaveLength(1);
    expect(res.validRows[0].groupName).toBe("Sarkar Family");
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].rowNumber).toBe(3);
  });
});
