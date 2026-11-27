// ============================================================
// Nimantro — Zod Validation Schemas
// packages/validation/src/index.ts
// ============================================================

import { z } from "zod";

// ─── Shared ───────────────────────────────────────────────────

export const LanguageSchema = z.enum(["bn", "en", "both"]);

export const LocalisedStringSchema = z.object({
  bn: z.string().optional(),
  en: z.string().optional(),
});

// ─── User ────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(80),
  preferredLanguage: z.enum(["bn", "en"]),
  photoURL: z.string().url().optional(),
});

// ─── Event ───────────────────────────────────────────────────

export const EventCategorySchema = z.enum([
  "wedding",
  "engagement",
  "birthday",
  "anniversary",
  "housewarming",
  "annaprashan",
  "religious_ceremony",
  "puja_festival",
  "corporate",
  "other",
]);

export const EventVenueSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mapsUrl: z.string().url().optional(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(2).max(120),
  category: EventCategorySchema,
  description: z.string().max(1000).optional(),
  hostNames: z.array(z.string().min(1).max(100)).min(1).max(10),
  startAt: z.string().datetime(), // ISO string from client
  endAt: z.string().datetime().optional(),
  timezone: z.string().min(1).max(60),
  language: LanguageSchema,
  visibility: z.enum(["public", "unlisted", "private"]),
  venue: EventVenueSchema.optional(),
  coverImageUrl: z.string().url().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const CreateEventSessionSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  venue: z
    .object({ name: z.string(), address: z.string() })
    .optional(),
  allowRSVP: z.boolean().default(true),
});

// ─── Template ─────────────────────────────────────────────────

export const TemplateCategorySchema = z.enum([
  "traditional",
  "royal",
  "minimal",
  "floral",
  "modern",
  "cultural",
  "luxury",
  "animated",
]);

// ─── Invitation ───────────────────────────────────────────────

export const SlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase alphanumeric with hyphens only"
  );

export const SectionStyleSchema = z.object({
  alignment: z.enum(["left", "center", "right"]).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  paddingTop: z.number().min(0).max(200).optional(),
  paddingBottom: z.number().min(0).max(200).optional(),
});

export const SectionAnimationSchema = z.object({
  preset: z.enum([
    "none",
    "fade-in",
    "fade-up",
    "slide-in",
    "scale-reveal",
    "envelope-open",
    "floral-reveal",
    "text-stagger",
    "scroll-reveal",
    "countdown-transition",
    "gallery-transition",
  ]),
  delay: z.number().min(0).max(5000).optional(),
  duration: z.number().min(100).max(5000).optional(),
  disabled: z.boolean().optional(),
});

export const InvitationSectionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "hero",
    "welcome",
    "family",
    "story",
    "countdown",
    "schedule",
    "venue",
    "gallery",
    "rsvp",
    "contact",
    "footer",
  ]),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  content: z.record(z.unknown()),
  style: SectionStyleSchema,
  animation: SectionAnimationSchema,
});

export const InvitationThemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  muted: z.string(),
  border: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  accentFont: z.string().optional(),
});

export const InvitationDesignDocumentSchema = z.object({
  templateId: z.string(),
  templateVersion: z.number().int().min(1),
  language: LanguageSchema,
  theme: InvitationThemeSchema,
  sections: z.array(InvitationSectionSchema).min(1),
  coverImageUrl: z.string().url().optional(),
  metadata: z.record(z.string().max(1000)).optional(), // e.g. musicUrl, opening
});

export const PublishInvitationSchema = z.object({
  invitationId: z.string(),
  slug: SlugSchema,
  visibility: z.enum(["public", "unlisted", "private"]),
  passwordProtected: z.boolean().optional(),
  password: z.string().min(4).max(40).optional(),
});

// ─── Guest Management ─────────────────────────────────────────

export const CreateGuestGroupSchema = z.object({
  groupName: z.string().min(1).max(200),
  primaryContactName: z.string().min(1).max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/)
    .optional(),
  email: z.string().email().optional(),
  invitedAdults: z.number().int().min(0).max(500),
  invitedChildren: z.number().int().min(0).max(100),
  notes: z.string().max(500).optional(),
});

export const UpdateGuestGroupSchema = CreateGuestGroupSchema.partial();

export const AddGuestMemberSchema = z.object({
  fullName: z.string().min(1).max(100),
  type: z.enum(["adult", "child"]),
  phone: z.string().optional(),
});

export const CSVGuestRowSchema = z.object({
  groupName: z.string().min(1),
  primaryContactName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  invitedAdults: z.coerce.number().int().min(0),
  invitedChildren: z.coerce.number().int().min(0),
});

// ─── RSVP ─────────────────────────────────────────────────────

export const SubmitRSVPSchema = z.object({
  token: z.string().min(32).max(128),
  status: z.enum(["accepted", "declined", "maybe"]),
  confirmedAdults: z.number().int().min(0).max(500).optional(),
  confirmedChildren: z.number().int().min(0).max(100).optional(),
  memberResponses: z
    .array(
      z.object({
        guestId: z.string(),
        attending: z.boolean(),
      })
    )
    .optional(),
  mealPreference: z.string().max(200).optional(),
  specialRequirements: z.string().max(500).optional(),
  message: z.string().max(500).optional(),
});

// ─── Export ───────────────────────────────────────────────────

export const CreateExportJobSchema = z.object({
  invitationId: z.string(),
  versionId: z.string(),
  format: z.enum(["pdf", "jpg", "png"]),
  pageSize: z.enum(["a4", "a5", "letter", "square"]).optional(),
});

// ─── Slug ─────────────────────────────────────────────────────

export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Re-export zod for downstream usage
export { z };
