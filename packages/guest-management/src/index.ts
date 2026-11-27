// ============================================================
// Nimantro — Guest Management & RSVP Business Logic
// packages/guest-management/src/index.ts
// ============================================================

import type {
  CheckInDocument,
  Entitlements,
  EventAnalyticsSummary,
  GuestGroupDocument,
  PlanTier,
  RSVPDocument,
} from "@nimantro/types";
import { CSVGuestRowSchema } from "@nimantro/validation";

export interface HouseholdAttendanceSummary {
  groupId: string;
  groupName: string;
  invitedAdults: number;
  invitedChildren: number;
  invitedPeople: number;
  confirmedAdults: number;
  confirmedChildren: number;
  expectedAttendance: number;
  pendingPeople: number;
  status: "pending" | "accepted" | "declined" | "maybe";
}

export interface CapacityValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ParsedCSVGuestRow {
  groupName: string;
  primaryContactName: string;
  phone?: string;
  email?: string;
  invitedAdults: number;
  invitedChildren: number;
}

export interface CSVParseResult {
  validRows: ParsedCSVGuestRow[];
  errors: { rowNumber: number; message: string; raw: string }[];
}

export const PLAN_ENTITLEMENTS: Record<PlanTier, Entitlements> = {
  free: {
    plan: "free",
    maxActiveEvents: 3,
    maxGuestGroups: 100,
    premiumTemplates: false,
    advancedAnimations: false,
    familyRSVP: true,
    qrCheckIn: false,
    multiHost: false,
    customDomain: false,
    advancedAnalytics: false,
    csvImport: true,
  },
  event_pro: {
    plan: "event_pro",
    maxActiveEvents: 15,
    maxGuestGroups: 1000,
    premiumTemplates: true,
    advancedAnimations: true,
    familyRSVP: true,
    qrCheckIn: true,
    multiHost: true,
    customDomain: false,
    advancedAnalytics: true,
    csvImport: true,
  },
  event_business: {
    plan: "event_business",
    maxActiveEvents: 100,
    maxGuestGroups: 10000,
    premiumTemplates: true,
    advancedAnimations: true,
    familyRSVP: true,
    qrCheckIn: true,
    multiHost: true,
    customDomain: true,
    advancedAnalytics: true,
    csvImport: true,
  },
};

export function getPlanEntitlements(plan: PlanTier = "free"): Entitlements {
  return PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free;
}

/**
 * Validate RSVP adult/child headcount against the invitation's authorised capacity.
 */
export function validateCapacityAllocation(
  allowedAdults: number,
  allowedChildren: number,
  confirmedAdults: number,
  confirmedChildren: number
): CapacityValidationResult {
  if (confirmedAdults < 0 || confirmedChildren < 0) {
    return { valid: false, reason: "Confirmed guest counts cannot be negative." };
  }
  if (confirmedAdults > allowedAdults) {
    return {
      valid: false,
      reason: `Confirmed adults (${confirmedAdults}) exceed allowed adults (${allowedAdults}).`,
    };
  }
  if (confirmedChildren > allowedChildren) {
    return {
      valid: false,
      reason: `Confirmed children (${confirmedChildren}) exceed allowed children (${allowedChildren}).`,
    };
  }
  return { valid: true };
}

/**
 * Calculate household-level attendance summary per PRD Section 11.1.
 */
export function calculateHouseholdSummary(
  group: Pick<GuestGroupDocument, "id" | "groupName" | "invitedAdults" | "invitedChildren">,
  rsvp?: Pick<RSVPDocument, "status" | "confirmedAdults" | "confirmedChildren">
): HouseholdAttendanceSummary {
  const invitedPeople = group.invitedAdults + group.invitedChildren;
  const status = rsvp?.status ?? "pending";

  const confirmedAdults = status === "accepted" ? rsvp?.confirmedAdults ?? 0 : 0;
  const confirmedChildren = status === "accepted" ? rsvp?.confirmedChildren ?? 0 : 0;
  const expectedAttendance = confirmedAdults + confirmedChildren;

  // Pending people only applies while household has not finalised acceptance/decline
  const pendingPeople =
    status === "pending" || status === "maybe"
      ? invitedPeople
      : 0;

  return {
    groupId: group.id,
    groupName: group.groupName,
    invitedAdults: group.invitedAdults,
    invitedChildren: group.invitedChildren,
    invitedPeople,
    confirmedAdults,
    confirmedChildren,
    expectedAttendance,
    pendingPeople,
    status,
  };
}

/**
 * Aggregate invitation count vs person-level attendance metrics per PRD Section 4.9 & 11.4.
 * Never presents pending/estimated numbers as confirmed attendance.
 */
export function calculateEventAttendanceStats(
  eventId: string,
  groups: GuestGroupDocument[],
  rsvps: RSVPDocument[],
  checkIns: CheckInDocument[] = []
): EventAnalyticsSummary {
  const rsvpByGroupId = new Map<string, RSVPDocument>();
  for (const rsvp of rsvps) {
    rsvpByGroupId.set(rsvp.groupId, rsvp);
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
    const invitedInGroup = group.invitedAdults + group.invitedChildren;

    const rsvp = rsvpByGroupId.get(group.id);
    if (!rsvp || rsvp.status === "pending") {
      totalPending += invitedInGroup;
      continue;
    }

    respondedGroups += 1;

    if (rsvp.status === "accepted") {
      totalConfirmedAdults += rsvp.confirmedAdults;
      totalConfirmedChildren += rsvp.confirmedChildren;
    } else if (rsvp.status === "declined") {
      totalDeclined += invitedInGroup;
    } else if (rsvp.status === "maybe") {
      totalMaybe += invitedInGroup;
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

/**
 * Minimal RFC-4180-aware CSV line parser supporting quoted fields.
 */
function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse and Zod-validate guest household rows from CSV text.
 * Expected header: groupName,primaryContactName,phone,email,invitedAdults,invitedChildren
 */
export function parseGuestCSV(csvText: string): CSVParseResult {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, message: "CSV must include a header row and at least one guest row.", raw: lines[0] ?? "" }],
    };
  }

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    groupName: headers.findIndex((h) => h === "groupname" || h === "group_name" || h === "family"),
    primaryContactName: headers.findIndex((h) => h === "primarycontactname" || h === "contact" || h === "name"),
    phone: headers.findIndex((h) => h === "phone" || h === "mobile"),
    email: headers.findIndex((h) => h === "email"),
    invitedAdults: headers.findIndex((h) => h === "invitedadults" || h === "adults"),
    invitedChildren: headers.findIndex((h) => h === "invitedchildren" || h === "children"),
  };

  if (idx.groupName === -1 || idx.primaryContactName === -1) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, message: "Missing required headers: groupName, primaryContactName.", raw: lines[0] }],
    };
  }

  const validRows: ParsedCSVGuestRow[] = [];
  const errors: CSVParseResult["errors"] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const cols = splitCSVLine(raw);

    const candidate = {
      groupName: cols[idx.groupName] ?? "",
      primaryContactName: cols[idx.primaryContactName] ?? "",
      phone: idx.phone !== -1 && cols[idx.phone] ? cols[idx.phone] : undefined,
      email: idx.email !== -1 && cols[idx.email] ? cols[idx.email] : undefined,
      invitedAdults: idx.invitedAdults !== -1 ? cols[idx.invitedAdults] ?? 1 : 1,
      invitedChildren: idx.invitedChildren !== -1 ? cols[idx.invitedChildren] ?? 0 : 0,
    };

    const parsed = CSVGuestRowSchema.safeParse(candidate);
    if (parsed.success) {
      validRows.push(parsed.data);
    } else {
      errors.push({
        rowNumber: i + 1,
        message: parsed.error.issues.map((iss) => iss.message).join("; "),
        raw,
      });
    }
  }

  return { validRows, errors };
}

/**
 * Escape CSV cell safely (including formula injection protection).
 */
function csvCell(value: string | number | undefined): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportGuestsToCSV(
  groups: GuestGroupDocument[],
  rsvps: RSVPDocument[]
): string {
  const rsvpMap = new Map(rsvps.map((r) => [r.groupId, r]));
  const header = [
    "Group Name",
    "Primary Contact",
    "Phone",
    "Email",
    "Invited Adults",
    "Invited Children",
    "RSVP Status",
    "Confirmed Adults",
    "Confirmed Children",
    "Message",
  ].join(",");

  const rows = groups.map((g) => {
    const r = rsvpMap.get(g.id);
    return [
      csvCell(g.groupName),
      csvCell(g.primaryContactName),
      csvCell(g.phone),
      csvCell(g.email),
      csvCell(g.invitedAdults),
      csvCell(g.invitedChildren),
      csvCell(r?.status ?? "pending"),
      csvCell(r?.confirmedAdults ?? 0),
      csvCell(r?.confirmedChildren ?? 0),
      csvCell(r?.message),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * Build a native WhatsApp share intent URL per PRD Section 4.10.
 */
export function buildWhatsAppShareUrl(message: string, phone?: string): string {
  const cleanPhone = phone ? phone.replace(/[^\d]/g, "") : "";
  const encoded = encodeURIComponent(message);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}
