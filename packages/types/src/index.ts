// ============================================================
// Nimantro — Core Domain Types
// packages/types/src/index.ts
// ============================================================

// ─── Shared primitives ───────────────────────────────────────

export type Language = "bn" | "en" | "both";
export type LocalisedString = { bn?: string; en?: string };

/**
 * Infrastructure-agnostic timestamp representation compatible with
 * Firebase Client Timestamp, Firebase Admin Timestamp, JS Date, and ISO strings.
 */
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
  toMillis?: () => number;
}

export type FirestoreTimestamp = TimestampLike | Date | string;

// ─── User ────────────────────────────────────────────────────

export interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferredLanguage: "bn" | "en";
  accountStatus: "active" | "suspended";
  role: "user" | "admin";
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface UserProfile
  extends Omit<UserDocument, "accountStatus" | "role"> {}

// ─── Event ───────────────────────────────────────────────────

export type EventCategory =
  | "wedding"
  | "engagement"
  | "birthday"
  | "anniversary"
  | "housewarming"
  | "annaprashan"
  | "religious_ceremony"
  | "puja_festival"
  | "corporate"
  | "other";

export type EventStatus = "draft" | "published" | "archived";
export type EventVisibility = "public" | "unlisted" | "private";

export interface EventVenue {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
}

export interface EventDocument {
  id: string;
  ownerId: string;

  title: string;
  category: EventCategory;
  description?: string;
  hostNames: string[];

  startAt: FirestoreTimestamp;
  endAt?: FirestoreTimestamp;
  timezone: string;

  language: Language;
  visibility: EventVisibility;

  venue?: EventVenue;
  coverImageUrl?: string;

  status: EventStatus;

  // Denormalised counters — updated only by trusted functions
  invitationCount: number;
  guestGroupCount: number;
  invitedPersonCount: number;
  confirmedPersonCount: number;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type EventMemberRole =
  | "owner"
  | "co_host"
  | "guest_manager"
  | "viewer";

export interface EventMemberDocument {
  uid: string;
  role: EventMemberRole;
  permissions: string[];
  invitedBy: string;
  joinedAt: FirestoreTimestamp;
}

export interface EventSessionDocument {
  id: string;
  title: string;
  description?: string;
  startAt: FirestoreTimestamp;
  endAt?: FirestoreTimestamp;
  venue?: Pick<EventVenue, "name" | "address">;
  allowRSVP: boolean;
  status: "active" | "cancelled";
}

// ─── Invitation & Template ───────────────────────────────────

export type SectionType =
  | "hero"
  | "welcome"
  | "family"
  | "story"
  | "countdown"
  | "schedule"
  | "venue"
  | "gallery"
  | "rsvp"
  | "contact"
  | "footer";

export type StoryType =
  | "couple-journey"
  | "milestone-chapters"
  | "ritual-heritage"
  | "family-chronicle"
  | "tribute-quote";

export type AnimationPreset =
  | "none"
  | "fade-in"
  | "fade-up"
  | "slide-in"
  | "scale-reveal"
  | "envelope-open"
  | "floral-reveal"
  | "text-stagger"
  | "scroll-reveal"
  | "countdown-transition"
  | "gallery-transition";

export interface SectionAnimation {
  preset: AnimationPreset;
  delay?: number;
  duration?: number;
  disabled?: boolean; // respects prefers-reduced-motion
}

export interface SectionStyle {
  alignment?: "left" | "center" | "right";
  backgroundColor?: string;
  textColor?: string;
  backgroundImage?: string;
  paddingTop?: number;
  paddingBottom?: number;
}

export interface SectionContent {
  [key: string]: string | LocalisedString | string[] | undefined;
}

export interface InvitationSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  content: SectionContent;
  style: SectionStyle;
  animation: SectionAnimation;
  responsiveSettings?: {
    mobile?: Partial<SectionStyle>;
    tablet?: Partial<SectionStyle>;
  };
}

export interface InvitationTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  accentFont?: string;
}

export interface InvitationDesignDocument {
  templateId: string;
  templateVersion: number;
  language: Language;
  theme: InvitationTheme;
  sections: InvitationSection[];
  coverImageUrl?: string;
  metadata?: Record<string, string>;
}

export type InvitationStatus = "draft" | "published" | "unpublished";

export interface InvitationDocument {
  id: string;
  eventId: string;
  templateId: string;
  templateVersion: number;
  title: string;
  slug: string;
  language: Language;
  designDocument: InvitationDesignDocument;
  publishedVersionId?: string;
  visibility?: EventVisibility;
  passwordProtected?: boolean;
  status: InvitationStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface InvitationVersionDocument {
  id: string;
  invitationId: string;
  eventId?: string;
  version: number;
  templateId: string;
  templateVersion: number;
  designDocument: InvitationDesignDocument;
  createdAt: FirestoreTimestamp;
  publishedBy: string;
}

export interface SlugDocument {
  slug: string;
  eventId: string;
  invitationId: string;
  versionId: string;
  ownerId: string;
  visibility: EventVisibility;
  passwordHash?: string;
  status: "active" | "unpublished";
  updatedAt: FirestoreTimestamp;
}

// ─── Template ─────────────────────────────────────────────────

export type TemplateCategory =
  | "traditional"
  | "royal"
  | "minimal"
  | "floral"
  | "modern"
  | "cultural"
  | "luxury"
  | "animated";

export type TemplateAccess = "free" | "premium";
export type TemplateStatus = "draft" | "published" | "archived";

export interface TemplateDocument {
  id: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  eventCategories: EventCategory[];
  languages: ("bn" | "en")[];
  thumbnailUrl: string;
  previewUrl?: string;
  access: TemplateAccess;
  status: TemplateStatus;
  latestVersion: number;
  tags: string[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Guest Management ─────────────────────────────────────────

export type GuestGroupStatus = "draft" | "invited" | "responded";
export type GuestType = "adult" | "child";
export type GuestInvitationStatus = "active" | "revoked" | "expired";

export interface GuestGroupDocument {
  id: string;
  eventId: string;
  groupName: string;
  primaryContactName: string;
  phone?: string;
  email?: string;
  invitedAdults: number;
  invitedChildren: number;
  status: GuestGroupStatus;
  notes?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface GuestDocument {
  id: string;
  groupId: string;
  eventId: string;
  fullName: string;
  type: GuestType;
  phone?: string;
  invitationStatus: "pending" | "accepted" | "declined";
  createdAt: FirestoreTimestamp;
}

export interface GuestInvitationDocument {
  id: string;
  eventId: string;
  groupId: string;
  invitationId: string;
  tokenHash: string; // SHA-256 of raw token; never store raw token
  allowedAdults: number;
  allowedChildren: number;
  status: GuestInvitationStatus;
  sentAt?: FirestoreTimestamp;
  viewedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

// ─── RSVP ─────────────────────────────────────────────────────

export type RSVPStatus = "pending" | "accepted" | "declined" | "maybe";

export interface MemberResponse {
  guestId: string;
  attending: boolean;
}

export interface RSVPDocument {
  id: string;
  eventId: string;
  groupId: string;
  guestInvitationId: string;
  status: RSVPStatus;
  confirmedAdults: number;
  confirmedChildren: number;
  memberResponses?: MemberResponse[];
  mealPreference?: string;
  specialRequirements?: string;
  message?: string;
  respondedAt?: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Check-in ────────────────────────────────────────────────

export type CheckInStatus = "checked_in" | "reversed";

export interface CheckInDocument {
  id: string;
  eventId: string;
  sessionId: string;
  guestId: string;
  groupId: string;
  checkedInBy: string;
  checkedInAt: FirestoreTimestamp;
  status: CheckInStatus;
}

// ─── Export ───────────────────────────────────────────────────

export type ExportFormat = "pdf" | "jpg" | "png" | "gif" | "mp4";
export type ExportStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface ExportJob {
  id: string;
  userId: string;
  eventId: string;
  invitationId: string;
  versionId: string;
  format: ExportFormat;
  status: ExportStatus;
  storagePath?: string;
  downloadUrl?: string;
  errorCode?: string;
  createdAt: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
}

// ─── Notifications ────────────────────────────────────────────

export type NotificationType =
  | "rsvp_received"
  | "invitation_viewed"
  | "export_completed"
  | "export_failed"
  | "event_reminder";

export interface NotificationDocument {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: FirestoreTimestamp;
}

// ─── Entitlements ─────────────────────────────────────────────

export type PlanTier = "free" | "event_pro" | "event_business";

export interface Entitlements {
  plan: PlanTier;
  maxActiveEvents: number;
  maxGuestGroups: number;
  premiumTemplates: boolean;
  advancedAnimations: boolean;
  familyRSVP: boolean;
  qrCheckIn: boolean;
  multiHost: boolean;
  customDomain: boolean;
  advancedAnalytics: boolean;
  csvImport: boolean;
}

// ─── Analytics ────────────────────────────────────────────────

export interface EventAnalyticsSummary {
  eventId: string;
  totalGuestGroups: number;
  totalInvitedPeople: number;
  totalInvitedAdults: number;
  totalInvitedChildren: number;
  totalConfirmedPeople: number;
  totalConfirmedAdults: number;
  totalConfirmedChildren: number;
  totalDeclined: number;
  totalPending: number;
  totalMaybe: number;
  totalCheckIns: number;
  rsvpResponseRate: number; // 0–1
}
