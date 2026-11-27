// ============================================================
// Nimantro — Cloud Functions Event Analytics Helper
// apps/functions/src/lib/analytics.ts
// ============================================================

import type {
  CheckInDocument,
  EventAnalyticsSummary,
  GuestGroupDocument,
  RSVPDocument,
} from "@nimantro/types";

export function computeEventAnalytics(
  eventId: string,
  groups: GuestGroupDocument[],
  rsvps: RSVPDocument[],
  checkIns: CheckInDocument[] = []
): EventAnalyticsSummary {
  const rsvpByGroup = new Map<string, RSVPDocument>();
  for (const rsvp of rsvps) {
    rsvpByGroup.set(rsvp.groupId, rsvp);
  }

  let totalInvitedAdults = 0;
  let totalInvitedChildren = 0;
  let totalConfirmedAdults = 0;
  let totalConfirmedChildren = 0;
  let totalDeclined = 0;
  let totalPending = 0;
  let totalMaybe = 0;
  let respondedGroups = 0;

  for (const group of groups) {
    totalInvitedAdults += group.invitedAdults;
    totalInvitedChildren += group.invitedChildren;
    const groupInvited = group.invitedAdults + group.invitedChildren;

    const rsvp = rsvpByGroup.get(group.id);
    if (!rsvp || rsvp.status === "pending") {
      totalPending += groupInvited;
      continue;
    }

    respondedGroups += 1;

    if (rsvp.status === "accepted") {
      totalConfirmedAdults += rsvp.confirmedAdults;
      totalConfirmedChildren += rsvp.confirmedChildren;
    } else if (rsvp.status === "declined") {
      totalDeclined += groupInvited;
    } else if (rsvp.status === "maybe") {
      totalMaybe += groupInvited;
    }
  }

  const totalInvitedPeople = totalInvitedAdults + totalInvitedChildren;
  const totalConfirmedPeople = totalConfirmedAdults + totalConfirmedChildren;
  const totalCheckIns = checkIns.filter((c) => c.status === "checked_in").length;
  const rsvpResponseRate =
    groups.length > 0 ? Number((respondedGroups / groups.length).toFixed(4)) : 0;

  return {
    eventId,
    totalGuestGroups: groups.length,
    totalInvitedPeople,
    totalInvitedAdults,
    totalInvitedChildren,
    totalConfirmedPeople,
    totalConfirmedAdults,
    totalConfirmedChildren,
    totalDeclined,
    totalPending,
    totalMaybe,
    totalCheckIns,
    rsvpResponseRate,
  };
}
