// ============================================================
// Nimantro — Pure Creator / Inviter Permission Helper
// apps/web/lib/invitation-permissions.ts
// ============================================================

const INVITER_ROLES = new Set(["owner", "co_host", "guest_manager"]);
const INVITER_PERMISSIONS = new Set([
  "manage_invitations",
  "manage_guests",
  "manage_members",
]);

export interface MemberPermissionRecord {
  role?: unknown;
  permissions?: unknown;
}

/**
 * Only the event creator (ownerId) or an authorised inviter member
 * (co-host / guest manager / invitation manager) may share or print invitations.
 */
export function canUserShareOrPrintInvitation(input: {
  ownerId?: unknown;
  viewerUid?: string | null;
  member?: MemberPermissionRecord | null;
}): boolean {
  const { ownerId, viewerUid, member } = input;
  if (!viewerUid) return false;
  if (typeof ownerId === "string" && ownerId === viewerUid) return true;
  if (!member) return false;

  if (typeof member.role === "string" && INVITER_ROLES.has(member.role)) {
    return true;
  }

  if (Array.isArray(member.permissions)) {
    return member.permissions.some(
      (p) => typeof p === "string" && INVITER_PERMISSIONS.has(p)
    );
  }

  return false;
}
