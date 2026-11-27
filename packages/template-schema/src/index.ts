// ============================================================
// Nimantro — Template Schema
// packages/template-schema/src/index.ts
// ============================================================

import { z } from "zod";

// ─── Theme ───────────────────────────────────────────────────

export const TemplateThemeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#FFFFFF"),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#242124"),
  muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#77716D"),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#EAE1D8"),
  headingFont: z.string().min(1),
  bodyFont: z.string().min(1),
  accentFont: z.string().optional(),
});

export type TemplateTheme = z.infer<typeof TemplateThemeSchema>;

// ─── Section definition within a template ────────────────────

export const SectionTypeSchema = z.enum([
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
]);

export const AnimationPresetSchema = z.enum([
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
]);

export const LocalisedValueSchema = z.union([
  z.string(),
  z.object({
    bn: z.string().optional(),
    en: z.string().optional(),
  }),
]);

export const TemplateSectionSchema = z.object({
  id: z.string().min(1),
  type: SectionTypeSchema,
  enabled: z.boolean().default(true),
  order: z.number().int().min(0),

  defaultContent: z.record(LocalisedValueSchema).optional(),

  style: z
    .object({
      alignment: z.enum(["left", "center", "right"]).optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      backgroundImage: z.string().optional(),
      paddingTop: z.number().optional(),
      paddingBottom: z.number().optional(),
    })
    .optional()
    .default({}),

  animation: z
    .object({
      preset: AnimationPresetSchema.default("fade-up"),
      delay: z.number().min(0).max(5000).optional(),
      duration: z.number().min(100).max(5000).optional(),
    })
    .optional()
    .default({ preset: "fade-up" }),

  // Whether the host can remove this section
  required: z.boolean().default(false),
  // Whether the host can reorder this section
  locked: z.boolean().default(false),
});

export type TemplateSection = z.infer<typeof TemplateSectionSchema>;

// ─── Guest experience kit (opening, ambience, music, decor) ───

export const OpeningStyleSchema = z.enum(["envelope", "curtain", "doors"]);
export const AmbientEffectSchema = z.enum([
  "marigold",
  "roses",
  "sparkles",
  "fireflies",
  "confetti",
  "leaves",
  "diyas",
  "bubbles",
  "none",
]);
export const MusicPresetSchema = z.enum(["shehnai", "sitar", "flute", "musicbox", "piano", "dhol"]);
export const BackgroundPatternSchema = z.enum([
  "none",
  "alpona",
  "damask",
  "buti",
  "stars",
  "kantha",
  "floral",
  "dots",
]);
export const FrameStyleSchema = z.enum(["simple", "ornate", "stitched", "glow"]);

export const TemplateExperienceSchema = z.object({
  opening: OpeningStyleSchema.default("envelope"),
  effect: AmbientEffectSchema.default("marigold"),
  music: MusicPresetSchema.default("shehnai"),
  pattern: BackgroundPatternSchema.default("none"),
  frame: FrameStyleSchema.default("simple"),
});

export type TemplateExperience = z.infer<typeof TemplateExperienceSchema>;
export type OpeningStyle = z.infer<typeof OpeningStyleSchema>;
export type AmbientEffect = z.infer<typeof AmbientEffectSchema>;
export type MusicPreset = z.infer<typeof MusicPresetSchema>;

// ─── Complete template definition ────────────────────────────

export const TemplateDefinitionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum([
    "traditional",
    "royal",
    "minimal",
    "floral",
    "modern",
    "cultural",
    "luxury",
    "animated",
  ]),
  eventCategories: z
    .array(
      z.enum([
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
      ])
    )
    .min(1),
  languages: z.array(z.enum(["bn", "en"])).min(1),
  thumbnail: z.string(),
  access: z.enum(["free", "premium"]).default("free"),
  theme: TemplateThemeSchema,
  sections: z.array(TemplateSectionSchema).min(1),
  experience: TemplateExperienceSchema.optional(),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
  licence: z.string().optional(),
});

export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;

// ─── Validation helper ────────────────────────────────────────

export function validateTemplate(data: unknown): TemplateDefinition {
  return TemplateDefinitionSchema.parse(data);
}

export function safeValidateTemplate(data: unknown) {
  return TemplateDefinitionSchema.safeParse(data);
}
