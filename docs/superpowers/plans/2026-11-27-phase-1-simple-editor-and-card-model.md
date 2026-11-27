# Phase 1: Simple Editor, Automatic Generation & 4:5 Card-Page Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the complex 3-pane section/animation studio with a streamlined Simple Guided Studio backed by a backward-compatible `4:5` Single-Card and Multi-Page Card data model, automatic event-to-card generation, and crisp HTML/SVG Bengali+English rendering on both editor preview and `/i/[slug]`.

**Architecture:** Extend `InvitationDesignDocument` (`packages/types`, `packages/validation`, `packages/template-schema`) with `designMode: "legacy_sections" | "card_studio"`, `cardFormat: "single_card" | "multi_page"`, and `pages: InvitationCardPage[]` while keeping `sections[]` intact so existing drafts and unit tests continue passing. Build `templateToCardDesignDocument` in `@nimantro/invitation-engine`, upgrade the 6 bundled JSON templates with curated single-card and multi-page card definitions, add `card_studio` actions to `@nimantro/editor`, render `4:5` cards with layered HTML/SVG text in `CardPageRenderer` / `CardDeckRenderer` (embedded in `InvitationRenderer`), and replace `/editor/[eventId]/[invitationId]` with the guided `SimpleStudioShell`.

**Tech Stack:** TypeScript 5.7, Next.js 15 App Router, React 19, Zustand 5 + Immer 10, Zod 3.23, Tailwind CSS, Vitest 2.1.

**Spec:** `docs/superpowers/specs/2026-11-27-nimantro-simple-studio-design.md`

## Global Constraints

- Keep `InvitationDesignDocument` backward-compatible: existing `sections[]` drafts (`designMode` omitted or `"legacy_sections"`) MUST still load, validate, publish, and render on `/i/[slug]`.
- Keep all event names, dates, venue information, and Bengali/English text as editable HTML/SVG layers over background art — never flatten text into raster images inside the editor.
- All objects returned by `@nimantro/invitation-engine` helpers MUST contain zero `undefined` property values (Firestore fails on `undefined` unless explicitly stripped).
- All 6 bundled templates (`templates/**/*.json`) MUST retain `languages[0] === "en"`, `thumbnail` matching `/^\/art\/.+\.jpg$/`, and valid `sections[]` so existing `apps/web/lib/templates.test.ts` assertions remain green.
- Verification uses `pnpm --filter <pkg> test:unit`, `pnpm type-check`, and `pnpm build` (note: initialize git first if `git commit` checkpoints are desired).

---

### File Structure Map

| Action | File Path | Responsibility |
|---|---|---|
| Modify | `packages/types/src/index.ts` | Add `DesignMode`, `CardFormat`, `CardPageRole`, `CardLayoutVariant`, `CardBorderStyle`, `CardSlotContent`, `CardPageVisualConfig`, `InvitationCardPage`, `ScheduleCardItem`, `ThemePreset`, and optional fields on `InvitationDesignDocument` |
| Modify | `packages/validation/src/index.ts` | Add Zod schemas for card pages/slots/visuals and extend `InvitationDesignDocumentSchema` cleanly while preserving `sections` validation |
| Modify | `packages/template-schema/src/index.ts` | Extend `TemplateDefinitionSchema` with optional `supportedFormats`, `defaultSingleCardPages`, `defaultMultiPages`, `aiStylePreset`, `recommendedMusicCategory` |
| Create | `packages/invitation-engine/src/card-studio.ts` | `CARD_THEME_PRESETS`, `templateToCardDesignDocument`, `hydrateCardPagesFromEvent`, `buildCardPagesForTemplate`, `switchCardFormatPages`, `getOrderedEnabledCardPages` |
| Modify | `packages/invitation-engine/src/index.ts` | Re-export `card-studio.ts` helpers |
| Create | `packages/invitation-engine/src/card-studio.test.ts` | Unit tests for auto-generation, single/multi-page hydration, Bangabda dates, zero-`undefined` invariant |
| Modify | `templates/**/*.json` (all 6 files) | Add `supportedFormats`, `defaultSingleCardPages`, `defaultMultiPages`, `aiStylePreset`, `recommendedMusicCategory` |
| Modify | `packages/editor/src/index.ts` | Add `StudioStep`, `setStudioStep`, `setCardFormat`, `setActivePage`, `updateCardPageSlot`, `updateCardPageVisual`, `toggleCardPageEnabled`, `reorderCardPages`, `applyThemePreset`, `applyEventAutoFill` |
| Modify | `packages/editor/src/index.test.ts` | Add unit tests for all `card_studio` store actions + undo/redo |
| Modify | `packages/i18n/messages/en.json` & `bn.json` | Add `studio.*` translation keys for guided steps, card formats, page roles, theme presets |
| Create | `apps/web/components/invitation/CardPageRenderer.tsx` | Fixed `4:5` portrait HTML/SVG card frame renderer supporting 5 layout variants & Alpona/Arch/Floral SVG borders |
| Create | `apps/web/components/invitation/CardDeckRenderer.tsx` | Interactive viewer rendering Single Card or Multi-Page Card carousel/stack with page dots & language switcher |
| Modify | `apps/web/components/invitation/InvitationRenderer.tsx` | Delegate `design.designMode === "card_studio"` to `CardDeckRenderer` while keeping `legacy_sections` renderer untouched |
| Create | `apps/web/components/editor/DetailsTemplateStep.tsx` | Step 1 form: card format switch, template switcher, palette presets, page tabs, Bengali/English slot inputs |
| Create | `apps/web/components/editor/SimpleStudioShell.tsx` | Streamlined 4-step studio layout (step header + left guided panel + live `4:5` canvas preview + Save/Publish toolbar) |
| Modify | `apps/web/app/(editor)/editor/[eventId]/[invitationId]/page.tsx` | Load event + invitation; mount `SimpleStudioShell` for `card_studio` (or offer 1-click upgrade / fallback for legacy drafts) |
| Modify | `apps/web/app/(dashboard)/dashboard/events/new/page.tsx` | Add `Single Card` vs `Multi-Page Card` format selector and pass `cardFormat` to `/api/events` |
| Modify | `apps/web/app/api/events/route.ts` & `apps/functions/src/events/createEvent.ts` | Accept optional `cardFormat`, generate `card_studio` `InvitationDesignDocument` via `templateToCardDesignDocument`, persist `cardFormat` |

---

### Task 1: Extend Shared Types, Validation & Template Schema for 4:5 Card Studio

**Files:**
- Modify: `packages/types/src/index.ts:200-220`
- Modify: `packages/validation/src/index.ts:155-185`
- Modify: `packages/template-schema/src/index.ts:100-153`
- Test: `packages/template-schema/src/index.test.ts`

**Interfaces:**
- Produces in `@nimantro/types`: `DesignMode`, `CardFormat`, `CardPageRole`, `CardLayoutVariant`, `CardBorderStyle`, `ScheduleCardItem`, `CardSlotContent`, `CardPageVisualConfig`, `InvitationCardPage`, `CardThemePreset`, and extended `InvitationDesignDocument` (`designMode?`, `cardFormat?`, `pages?`).
- Produces in `@nimantro/validation`: `InvitationCardPageSchema`, `CardSlotContentSchema`, `CardPageVisualConfigSchema`, updated `InvitationDesignDocumentSchema`.
- Produces in `@nimantro/template-schema`: `TemplateCardPageSchema`, extended `TemplateDefinitionSchema`.

- [ ] **Step 1: Write the failing test in `packages/template-schema/src/index.test.ts`**

Read `packages/template-schema/src/index.test.ts` first to inspect existing tests, then append this test verifying card-page template fields parse cleanly and reject invalid border styles:

```typescript
import { describe, expect, it } from "vitest";
import { validateTemplate, safeValidateTemplate } from "./index";

describe("card studio template schema extensions", () => {
  it("validates templates with single_card and multi_page default pages", () => {
    const valid = safeValidateTemplate({
      id: "card-tpl-001",
      version: 1,
      name: "Card Template",
      slug: "card-template",
      category: "traditional",
      eventCategories: ["wedding"],
      languages: ["en", "bn"],
      thumbnail: "/art/wedding-3d.jpg",
      access: "free",
      supportedFormats: ["single_card", "multi_page"],
      aiStylePreset: "bengali_royal_wedding",
      recommendedMusicCategory: "shehnai",
      theme: {
        primary: "#8B1E2D",
        secondary: "#C9A84C",
        background: "#FFF9F0",
        headingFont: "Noto Serif Bengali",
        bodyFont: "Hind Siliguri",
      },
      sections: [
        {
          id: "hero",
          type: "hero",
          enabled: true,
          order: 0,
        },
      ],
      defaultSingleCardPages: [
        {
          id: "cover",
          role: "cover",
          layout: "framed_royal",
          order: 0,
          defaultSlots: {
            title: { en: "Wedding Invitation", bn: "শুভ বিবাহ" },
          },
          visual: {
            backgroundMode: "template_art",
            backgroundImageUrl: "/art/wedding-3d.jpg",
            overlayScrimOpacity: 0.12,
            borderStyle: "alpona_gold",
          },
        },
      ],
    });
    expect(valid.success).toBe(true);

    const invalid = safeValidateTemplate({
      id: "bad",
      version: 1,
      name: "Bad",
      slug: "bad",
      category: "traditional",
      eventCategories: ["wedding"],
      languages: ["en"],
      thumbnail: "/art/wedding-3d.jpg",
      theme: {
        primary: "#8B1E2D",
        secondary: "#C9A84C",
        background: "#FFF9F0",
        headingFont: "Lato",
        bodyFont: "Lato",
      },
      sections: [{ id: "hero", type: "hero", enabled: true, order: 0 }],
      defaultSingleCardPages: [
        {
          id: "cover",
          role: "cover",
          layout: "framed_royal",
          order: 0,
          visual: {
            backgroundMode: "template_art",
            overlayScrimOpacity: 2.5,
            borderStyle: "invalid_border",
          },
        },
      ],
    });
    expect(invalid.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nimantro/template-schema test:unit`
Expected: FAIL — unrecognized keys or validation succeeds unexpectedly because `defaultSingleCardPages` is stripped/ignored by current Zod object schema.

- [ ] **Step 3: Implement type definitions in `packages/types/src/index.ts`**

Add directly above `InvitationDesignDocument` in `packages/types/src/index.ts`:

```typescript
// ─── Simple Studio Card-Page Model (v2) ──────────────────────

export type DesignMode = "legacy_sections" | "card_studio";
export type CardFormat = "single_card" | "multi_page";

export type CardPageRole =
  | "cover"
  | "couple_story"
  | "family"
  | "schedule"
  | "venue"
  | "gallery"
  | "blessings";

export type CardLayoutVariant =
  | "framed_royal"
  | "arch_portrait"
  | "floral_split"
  | "minimal_editorial"
  | "festive_grid";

export type CardBorderStyle =
  | "alpona_gold"
  | "temple_arch"
  | "floral_vine"
  | "minimal_line"
  | "none";

export interface ScheduleCardItem {
  id: string;
  title: LocalisedString;
  time: LocalisedString;
  note?: LocalisedString;
}

export interface CardSlotContent {
  eyebrow?: LocalisedString;
  title?: LocalisedString;
  subtitle?: LocalisedString;
  primaryNames?: LocalisedString;
  dateLabel?: LocalisedString;
  timeLabel?: LocalisedString;
  body?: LocalisedString;
  brideFamily?: LocalisedString;
  groomFamily?: LocalisedString;
  venueName?: LocalisedString;
  venueAddress?: LocalisedString;
  mapsUrl?: string;
  contactName?: LocalisedString;
  phone?: string;
  scheduleItems?: ScheduleCardItem[];
  heroPhotoUrl?: string;
  secondaryPhotoUrl?: string;
  galleryPhotoUrls?: string[];
}

export interface CardPageVisualConfig {
  backgroundMode:
    | "theme_gradient"
    | "template_art"
    | "ai_generated"
    | "uploaded_photo";
  backgroundImageUrl?: string;
  backgroundAssetId?: string;
  aiGenerationId?: string;
  overlayScrimOpacity: number;
  borderStyle: CardBorderStyle;
}

export interface InvitationCardPage {
  id: string;
  role: CardPageRole;
  layout: CardLayoutVariant;
  enabled: boolean;
  order: number;
  slots: CardSlotContent;
  visual: CardPageVisualConfig;
}

export interface CardThemePreset {
  id: string;
  name: LocalisedString;
  theme: InvitationTheme;
}

export interface InvitationDesignDocument {
  designMode?: DesignMode;
  cardFormat?: CardFormat;
  templateId: string;
  templateVersion: number;
  language: Language;
  theme: InvitationTheme;
  sections: InvitationSection[];
  pages?: InvitationCardPage[];
  coverImageUrl?: string;
  metadata?: Record<string, string>;
}
```

- [ ] **Step 4: Add Zod schemas in `packages/validation/src/index.ts` and `packages/template-schema/src/index.ts`**

In `packages/validation/src/index.ts`, extend `InvitationDesignDocumentSchema` (keeping `sections` `.min(0)` when `designMode === "card_studio"` OR keeping `sections` populated via compatibility adapter so `.min(1)` still holds cleanly):

```typescript
export const DesignModeSchema = z.enum(["legacy_sections", "card_studio"]);
export const CardFormatSchema = z.enum(["single_card", "multi_page"]);
export const CardPageRoleSchema = z.enum([
  "cover",
  "couple_story",
  "family",
  "schedule",
  "venue",
  "gallery",
  "blessings",
]);
export const CardLayoutVariantSchema = z.enum([
  "framed_royal",
  "arch_portrait",
  "floral_split",
  "minimal_editorial",
  "festive_grid",
]);
export const CardBorderStyleSchema = z.enum([
  "alpona_gold",
  "temple_arch",
  "floral_vine",
  "minimal_line",
  "none",
]);

export const ScheduleCardItemSchema = z.object({
  id: z.string().min(1),
  title: LocalisedStringSchema,
  time: LocalisedStringSchema,
  note: LocalisedStringSchema.optional(),
});

export const CardSlotContentSchema = z.object({
  eyebrow: LocalisedStringSchema.optional(),
  title: LocalisedStringSchema.optional(),
  subtitle: LocalisedStringSchema.optional(),
  primaryNames: LocalisedStringSchema.optional(),
  dateLabel: LocalisedStringSchema.optional(),
  timeLabel: LocalisedStringSchema.optional(),
  body: LocalisedStringSchema.optional(),
  brideFamily: LocalisedStringSchema.optional(),
  groomFamily: LocalisedStringSchema.optional(),
  venueName: LocalisedStringSchema.optional(),
  venueAddress: LocalisedStringSchema.optional(),
  mapsUrl: z.string().max(500).optional(),
  contactName: LocalisedStringSchema.optional(),
  phone: z.string().max(40).optional(),
  scheduleItems: z.array(ScheduleCardItemSchema).max(6).optional(),
  heroPhotoUrl: z.string().max(2048).optional(),
  secondaryPhotoUrl: z.string().max(2048).optional(),
  galleryPhotoUrls: z.array(z.string().max(2048)).max(6).optional(),
});

export const CardPageVisualConfigSchema = z.object({
  backgroundMode: z.enum([
    "theme_gradient",
    "template_art",
    "ai_generated",
    "uploaded_photo",
  ]),
  backgroundImageUrl: z.string().max(2048).optional(),
  backgroundAssetId: z.string().max(128).optional(),
  aiGenerationId: z.string().max(128).optional(),
  overlayScrimOpacity: z.number().min(0).max(0.85),
  borderStyle: CardBorderStyleSchema,
});

export const InvitationCardPageSchema = z.object({
  id: z.string().min(1),
  role: CardPageRoleSchema,
  layout: CardLayoutVariantSchema,
  enabled: z.boolean(),
  order: z.number().int().min(0),
  slots: CardSlotContentSchema,
  visual: CardPageVisualConfigSchema,
});

export const InvitationDesignDocumentSchema = z.object({
  designMode: DesignModeSchema.optional(),
  cardFormat: CardFormatSchema.optional(),
  templateId: z.string(),
  templateVersion: z.number().int().min(1),
  language: LanguageSchema,
  theme: InvitationThemeSchema,
  sections: z.array(InvitationSectionSchema),
  pages: z.array(InvitationCardPageSchema).max(8).optional(),
  coverImageUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});
```

And in `packages/template-schema/src/index.ts`, add `TemplateCardPageSchema` and attach `supportedFormats`, `aiStylePreset`, `recommendedMusicCategory`, `defaultSingleCardPages`, and `defaultMultiPages` to `TemplateDefinitionSchema`:

```typescript
export const TemplateCardPageSchema = z.object({
  id: z.string().min(1),
  role: z.enum([
    "cover",
    "couple_story",
    "family",
    "schedule",
    "venue",
    "gallery",
    "blessings",
  ]),
  layout: z.enum([
    "framed_royal",
    "arch_portrait",
    "floral_split",
    "minimal_editorial",
    "festive_grid",
  ]),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0),
  defaultSlots: z.object({
    eyebrow: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    title: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    subtitle: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    primaryNames: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    dateLabel: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    timeLabel: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    body: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    brideFamily: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    groomFamily: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    venueName: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    venueAddress: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    mapsUrl: z.string().optional(),
    contactName: z.object({ bn: z.string().optional(), en: z.string().optional() }).optional(),
    phone: z.string().optional(),
    scheduleItems: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.object({ bn: z.string().optional(), en: z.string().optional() }),
          time: z.object({ bn: z.string().optional(), en: z.string().optional() }),
          note: z
            .object({ bn: z.string().optional(), en: z.string().optional() })
            .optional(),
        })
      )
      .optional(),
    heroPhotoUrl: z.string().optional(),
    secondaryPhotoUrl: z.string().optional(),
    galleryPhotoUrls: z.array(z.string()).optional(),
  }).default({}),
  visual: z.object({
    backgroundMode: z.enum([
      "theme_gradient",
      "template_art",
      "ai_generated",
      "uploaded_photo",
    ]),
    backgroundImageUrl: z.string().optional(),
    overlayScrimOpacity: z.number().min(0).max(0.85).default(0.15),
    borderStyle: z
      .enum(["alpona_gold", "temple_arch", "floral_vine", "minimal_line", "none"])
      .default("alpona_gold"),
  }),
});
```

Inside `TemplateDefinitionSchema`:
```typescript
  supportedFormats: z
    .array(z.enum(["single_card", "multi_page"]))
    .min(1)
    .default(["single_card", "multi_page"]),
  aiStylePreset: z.string().optional(),
  recommendedMusicCategory: z
    .enum(["shehnai", "bansuri", "shankha", "sitar", "devotional", "festive"])
    .optional(),
  defaultSingleCardPages: z.array(TemplateCardPageSchema).optional(),
  defaultMultiPages: z.array(TemplateCardPageSchema).optional(),
```

- [ ] **Step 5: Build upstream packages and run unit tests**

Run:
```bash
pnpm --filter @nimantro/types build && pnpm --filter @nimantro/validation build && pnpm --filter @nimantro/template-schema build && pnpm --filter @nimantro/template-schema test:unit
```
Expected: Build succeeds with 0 TS errors and `packages/template-schema` unit tests PASS.

---

### Task 2: Implement Auto-Generation & Card-Page Engine (`@nimantro/invitation-engine`)

**Files:**
- Create: `packages/invitation-engine/src/card-studio.ts`
- Modify: `packages/invitation-engine/src/index.ts`
- Create: `packages/invitation-engine/src/card-studio.test.ts`

**Interfaces:**
- Consumes: `TemplateDefinition`, `TemplateCardPage` from `@nimantro/template-schema`, `InvitationDesignDocument`, `InvitationCardPage`, `CardFormat`, `EventVenue`, `Language` from `@nimantro/types`, date helpers (`formatEventDate`, `getBangabdaYearLabel`) from `@nimantro/i18n` (or inject formatted date strings / add `@nimantro/i18n` workspace dependency if circular-free; verify `packages/i18n` has zero dependency on `invitation-engine` first — confirmed in `packages/i18n/package.json`!).
- Produces:
  - `CARD_THEME_PRESETS: CardThemePreset[]`
  - `templateToCardDesignDocument(template, options): InvitationDesignDocument`
  - `hydrateCardPagesFromEvent(pages, eventData): InvitationCardPage[]`
  - `getOrderedEnabledCardPages(design): InvitationCardPage[]`
  - `switchCardFormatPages(design, template, targetFormat): InvitationCardPage[]`

- [ ] **Step 1: Write the failing test `packages/invitation-engine/src/card-studio.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import type { TemplateDefinition } from "@nimantro/template-schema";
import {
  CARD_THEME_PRESETS,
  getOrderedEnabledCardPages,
  templateToCardDesignDocument,
} from "./card-studio";

const sampleCardTemplate: TemplateDefinition = {
  id: "bengali-wedding-001",
  version: 1,
  name: "Bengali Traditional Wedding",
  slug: "bengali-traditional-wedding",
  category: "traditional",
  eventCategories: ["wedding"],
  languages: ["en", "bn"],
  thumbnail: "/art/wedding-3d.jpg",
  access: "free",
  tags: ["wedding"],
  supportedFormats: ["single_card", "multi_page"],
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
  sections: [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      order: 0,
      required: true,
      locked: false,
      defaultContent: {
        title: { en: "Wedding Invitation", bn: "শুভ বিবাহ" },
        primaryNames: { en: "Rituparna & Anirban", bn: "ঋতুপর্ণা ও অনির্বাণ" },
      },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    },
  ],
  defaultSingleCardPages: [
    {
      id: "cover",
      role: "cover",
      layout: "framed_royal",
      enabled: true,
      order: 0,
      defaultSlots: {
        title: { en: "Wedding Invitation", bn: "শুভ বিবাহ" },
        primaryNames: { en: "Rituparna & Anirban", bn: "ঋতুপর্ণা ও অনির্বাণ" },
      },
      visual: {
        backgroundMode: "template_art",
        backgroundImageUrl: "/art/wedding-3d.jpg",
        overlayScrimOpacity: 0.12,
        borderStyle: "alpona_gold",
      },
    },
  ],
};

describe("card-studio invitation engine", () => {
  it("auto-populates single_card pages from event details without undefined values", () => {
    const doc = templateToCardDesignDocument(sampleCardTemplate, {
      cardFormat: "single_card",
      language: "both",
      eventDetails: {
        title: "Anindita & Soumya Wedding",
        hostNames: ["Anindita", "Soumya"],
        startAt: "2026-12-11T19:15:00.000Z",
        timezone: "Asia/Kolkata",
        venue: { name: "Sonar Tori Banquet", address: "Salt Lake, Kolkata" },
      },
    });

    expect(doc.designMode).toBe("card_studio");
    expect(doc.cardFormat).toBe("single_card");
    const pages = getOrderedEnabledCardPages(doc);
    expect(pages).toHaveLength(1);
    expect(pages[0].slots.primaryNames).toEqual({
      bn: "Anindita ও Soumya",
      en: "Anindita & Soumya",
    });
    expect(pages[0].slots.venueName).toEqual({
      bn: "Sonar Tori Banquet",
      en: "Sonar Tori Banquet",
    });
    expect(pages[0].slots.dateLabel?.en).toContain("2026");
    expect(pages[0].slots.dateLabel?.bn).toContain("বঙ্গাব্দ");

    const serialized = JSON.stringify(doc);
    expect(JSON.parse(serialized)).toEqual(doc);
  });

  it("exposes curated Bengali theme presets", () => {
    expect(CARD_THEME_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(CARD_THEME_PRESETS[0].theme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nimantro/invitation-engine test:unit`
Expected: FAIL — `Cannot find module './card-studio'`.

- [ ] **Step 3: Create `packages/invitation-engine/src/card-studio.ts`**

Add `@nimantro/i18n: "workspace:*"` to `packages/invitation-engine/package.json` dependencies first (`pnpm install` is already satisfied via workspace links once `packages/i18n` is built). Implement `packages/invitation-engine/src/card-studio.ts`:

```typescript
// ============================================================
// Nimantro — Simple Card Studio Engine (Auto-Generation & Presets)
// packages/invitation-engine/src/card-studio.ts
// ============================================================

import { formatEventDate, getBangabdaYearLabel } from "@nimantro/i18n";
import type { TemplateCardPage, TemplateDefinition } from "@nimantro/template-schema";
import type {
  CardFormat,
  CardSlotContent,
  CardThemePreset,
  EventVenue,
  InvitationCardPage,
  InvitationDesignDocument,
  InvitationTheme,
  Language,
} from "@nimantro/types";
import { templateToDesignDocument } from "./index";

export const CARD_THEME_PRESETS: CardThemePreset[] = [
  {
    id: "royal-sindoor-gold",
    name: { en: "Royal Red & Antique Gold", bn: "রাজকীয় লাল ও সোনালি" },
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
      accentFont: "Playfair Display",
    },
  },
  {
    id: "sandalwood-ivory",
    name: { en: "Sandalwood Ivory & Terracotta", bn: "চন্দন ও টেরাকোটা" },
    theme: {
      primary: "#9D4E2A",
      secondary: "#D19E4B",
      background: "#FDF8F1",
      surface: "#FFFFFF",
      text: "#2A211B",
      muted: "#7A6A5F",
      border: "#EAD9C4",
      headingFont: "Playfair Display",
      bodyFont: "Hind Siliguri",
      accentFont: "Noto Serif Bengali",
    },
  },
  {
    id: "lotus-blush",
    name: { en: "Lotus Rose & Sage", bn: "পদ্ম গোলাপি ও পাতা সবুজ" },
    theme: {
      primary: "#9E4244",
      secondary: "#8AA38B",
      background: "#FFFBF8",
      surface: "#FFFFFF",
      text: "#2A2124",
      muted: "#7D6F72",
      border: "#EFE0DC",
      headingFont: "Playfair Display",
      bodyFont: "Hind Siliguri",
      accentFont: "Noto Serif Bengali",
    },
  },
  {
    id: "emerald-temple-brass",
    name: { en: "Emerald & Temple Brass", bn: "পান্না সবুজ ও পিতল" },
    theme: {
      primary: "#1B4D3E",
      secondary: "#C89D54",
      background: "#F8FAF7",
      surface: "#FFFFFF",
      text: "#17211E",
      muted: "#5E6B66",
      border: "#D5E0D8",
      headingFont: "Noto Serif Bengali",
      bodyFont: "Hind Siliguri",
      accentFont: "Playfair Display",
    },
  },
  {
    id: "midnight-zari",
    name: { en: "Midnight Indigo & Zari Gold", bn: "রাত্রি নীল ও জরি" },
    theme: {
      primary: "#F3D382",
      secondary: "#C9A84C",
      background: "#161B2E",
      surface: "#1F2640",
      text: "#F8F4EC",
      muted: "#C4BED0",
      border: "#3B4363",
      headingFont: "Playfair Display",
      bodyFont: "Hind Siliguri",
      accentFont: "Noto Serif Bengali",
    },
  },
];

export interface AutoGenerateEventInput {
  title: string;
  hostNames: string[];
  startAt: string;
  timezone?: string;
  venue?: EventVenue;
  description?: string;
  coverImageUrl?: string;
}

/**
 * Remove any keys whose value is `undefined` recursively so objects remain Firestore-safe.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        clean[k] = stripUndefinedDeep(v);
      }
    }
    return clean as T;
  }
  return value;
}

function buildFallbackPagesFromTemplate(
  template: TemplateDefinition,
  format: CardFormat
): TemplateCardPage[] {
  const hero = template.sections.find((s) => s.type === "hero")?.defaultContent ?? {};
  const welcome = template.sections.find((s) => s.type === "welcome")?.defaultContent ?? {};
  const family = template.sections.find((s) => s.type === "family")?.defaultContent ?? {};
  const schedule = template.sections.find((s) => s.type === "schedule")?.defaultContent ?? {};
  const venue = template.sections.find((s) => s.type === "venue")?.defaultContent ?? {};
  const footer = template.sections.find((s) => s.type === "footer")?.defaultContent ?? {};

  const toLoc = (val: unknown) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? (val as { bn?: string; en?: string })
      : typeof val === "string"
      ? { bn: val, en: val }
      : undefined;

  const coverPage: TemplateCardPage = {
    id: "cover",
    role: "cover",
    layout: "framed_royal",
    enabled: true,
    order: 0,
    defaultSlots: {
      eyebrow: toLoc(hero.subtitle),
      title: toLoc(hero.title),
      primaryNames: toLoc(hero.primaryNames),
      dateLabel: toLoc(hero.dateLabel),
      venueName: toLoc(venue.venueName),
      venueAddress: toLoc(venue.address),
      body: format === "single_card" ? toLoc(welcome.message) : undefined,
      heroPhotoUrl:
        typeof hero.artworkUrl === "string" ? hero.artworkUrl : template.thumbnail,
    },
    visual: {
      backgroundMode: "template_art",
      backgroundImageUrl:
        typeof hero.artworkUrl === "string" ? hero.artworkUrl : template.thumbnail,
      overlayScrimOpacity: 0.14,
      borderStyle: "alpona_gold",
    },
  };

  if (format === "single_card") {
    return [coverPage];
  }

  return [
    coverPage,
    {
      id: "family",
      role: "family",
      layout: "arch_portrait",
      enabled: true,
      order: 1,
      defaultSlots: {
        title: toLoc(welcome.heading) ?? { bn: "সাদর আমন্ত্রণ", en: "Warm Invitation" },
        body: toLoc(welcome.message),
        brideFamily: toLoc(family.brideFamily),
        groomFamily: toLoc(family.groomFamily),
      },
      visual: {
        backgroundMode: "theme_gradient",
        overlayScrimOpacity: 0.08,
        borderStyle: "floral_vine",
      },
    },
    {
      id: "schedule",
      role: "schedule",
      layout: "festive_grid",
      enabled: true,
      order: 2,
      defaultSlots: {
        title: toLoc(schedule.heading) ?? { bn: "অনুষ্ঠান সূচি", en: "Ceremony Schedule" },
        scheduleItems: [
          ...(schedule.item1Title
            ? [
                {
                  id: "sched-1",
                  title: toLoc(schedule.item1Title) ?? { en: "Ceremony" },
                  time: toLoc(schedule.item1Time) ?? { en: "" },
                },
              ]
            : []),
          ...(schedule.item2Title
            ? [
                {
                  id: "sched-2",
                  title: toLoc(schedule.item2Title) ?? { en: "Reception" },
                  time: toLoc(schedule.item2Time) ?? { en: "" },
                },
              ]
            : []),
        ],
      },
      visual: {
        backgroundMode: "theme_gradient",
        overlayScrimOpacity: 0.08,
        borderStyle: "minimal_line",
      },
    },
    {
      id: "venue",
      role: "venue",
      layout: "minimal_editorial",
      enabled: true,
      order: 3,
      defaultSlots: {
        title: toLoc(venue.heading) ?? { bn: "অনুষ্ঠানের স্থান", en: "Venue & Blessings" },
        venueName: toLoc(venue.venueName),
        venueAddress: toLoc(venue.address),
        mapsUrl: typeof venue.mapsUrl === "string" ? venue.mapsUrl : undefined,
        body: toLoc(footer.closing),
      },
      visual: {
        backgroundMode: "theme_gradient",
        overlayScrimOpacity: 0.08,
        borderStyle: "alpona_gold",
      },
    },
  ];
}

export function hydrateCardPagesFromEvent(
  pages: InvitationCardPage[],
  eventDetails: AutoGenerateEventInput
): InvitationCardPage[] {
  const tz = eventDetails.timezone ?? "Asia/Kolkata";
  const enDate = formatEventDate(eventDetails.startAt, "en", tz, true);
  const bnDate = formatEventDate(eventDetails.startAt, "bn", tz, true);
  const bangabda = getBangabdaYearLabel(eventDetails.startAt);
  const bnDateFull = bangabda ? `${bnDate} · ${bangabda}` : bnDate;

  const namesBn = eventDetails.hostNames.join(" ও ");
  const namesEn = eventDetails.hostNames.join(" & ");

  return pages.map((page) => {
    const nextSlots: CardSlotContent = { ...page.slots };

    if (page.role === "cover") {
      if (eventDetails.hostNames.length > 0) {
        nextSlots.primaryNames = { bn: namesBn, en: namesEn };
      }
      if (enDate || bnDateFull) {
        nextSlots.dateLabel = { bn: bnDateFull, en: enDate };
      }
      if (eventDetails.venue) {
        nextSlots.venueName = {
          bn: eventDetails.venue.name,
          en: eventDetails.venue.name,
        };
        nextSlots.venueAddress = {
          bn: eventDetails.venue.address,
          en: eventDetails.venue.address,
        };
      }
      if (eventDetails.coverImageUrl) {
        nextSlots.heroPhotoUrl = eventDetails.coverImageUrl;
      }
    }

    if (page.role === "venue" && eventDetails.venue) {
      nextSlots.venueName = {
        bn: eventDetails.venue.name,
        en: eventDetails.venue.name,
      };
      nextSlots.venueAddress = {
        bn: eventDetails.venue.address,
        en: eventDetails.venue.address,
      };
      if (eventDetails.venue.mapsUrl) {
        nextSlots.mapsUrl = eventDetails.venue.mapsUrl;
      }
    }

    if (page.role === "couple_story" && eventDetails.description) {
      nextSlots.body = {
        bn: eventDetails.description,
        en: eventDetails.description,
      };
    }

    return {
      ...page,
      slots: stripUndefinedDeep(nextSlots),
    };
  });
}

export function buildCardPagesForTemplate(
  template: TemplateDefinition,
  format: CardFormat,
  eventDetails?: AutoGenerateEventInput
): InvitationCardPage[] {
  const sourcePages =
    format === "single_card"
      ? template.defaultSingleCardPages ?? buildFallbackPagesFromTemplate(template, "single_card")
      : template.defaultMultiPages ?? buildFallbackPagesFromTemplate(template, "multi_page");

  const mapped: InvitationCardPage[] = sourcePages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p, idx) => ({
      id: p.id,
      role: p.role,
      layout: p.layout,
      enabled: p.enabled ?? true,
      order: idx,
      slots: stripUndefinedDeep(p.defaultSlots ?? {}),
      visual: stripUndefinedDeep({
        backgroundMode: p.visual.backgroundMode,
        ...(p.visual.backgroundImageUrl
          ? { backgroundImageUrl: p.visual.backgroundImageUrl }
          : {}),
        overlayScrimOpacity: p.visual.overlayScrimOpacity ?? 0.14,
        borderStyle: p.visual.borderStyle ?? "alpona_gold",
      }),
    }));

  return eventDetails ? hydrateCardPagesFromEvent(mapped, eventDetails) : mapped;
}

export function templateToCardDesignDocument(
  template: TemplateDefinition,
  options?: {
    cardFormat?: CardFormat;
    language?: Language;
    theme?: Partial<InvitationTheme>;
    eventDetails?: AutoGenerateEventInput;
  }
): InvitationDesignDocument {
  const cardFormat: CardFormat = options?.cardFormat ?? "multi_page";
  const baseLegacyDoc = templateToDesignDocument(template, {
    language: options?.language,
    theme: options?.theme,
    coverImageUrl: options?.eventDetails?.coverImageUrl,
    contentOverrides: options?.eventDetails
      ? {
          hero: {
            primaryNames: {
              bn: options.eventDetails.hostNames.join(" ও "),
              en: options.eventDetails.hostNames.join(" & "),
            },
          },
          countdown: {
            targetDate: options.eventDetails.startAt.slice(0, 16),
          },
          ...(options.eventDetails.venue
            ? {
                venue: {
                  venueName: {
                    bn: options.eventDetails.venue.name,
                    en: options.eventDetails.venue.name,
                  },
                  address: {
                    bn: options.eventDetails.venue.address,
                    en: options.eventDetails.venue.address,
                  },
                },
              }
            : {}),
        }
      : undefined,
  });

  const pages = buildCardPagesForTemplate(template, cardFormat, options?.eventDetails);

  return stripUndefinedDeep({
    ...baseLegacyDoc,
    designMode: "card_studio",
    cardFormat,
    pages,
  });
}

export function getOrderedEnabledCardPages(
  design: InvitationDesignDocument
): InvitationCardPage[] {
  return (design.pages ?? [])
    .filter((p) => p.enabled)
    .slice()
    .sort((a, b) => a.order - b.order);
}

/**
 * Switch an invitation between single_card and multi_page while preserving
 * user-entered names, date, venue, and cover photo across formats.
 */
export function switchCardFormatPages(
  currentPages: InvitationCardPage[] | undefined,
  template: TemplateDefinition,
  targetFormat: CardFormat
): InvitationCardPage[] {
  const nextPages = buildCardPagesForTemplate(template, targetFormat);
  const currentCover = currentPages?.find((p) => p.role === "cover");
  const currentVenue = currentPages?.find((p) => p.role === "venue");
  const sourceSlots = {
    ...(currentVenue?.slots ?? {}),
    ...(currentCover?.slots ?? {}),
  };

  return nextPages.map((page) => {
    if (page.role === "cover") {
      return {
        ...page,
        slots: stripUndefinedDeep({
          ...page.slots,
          ...(sourceSlots.primaryNames ? { primaryNames: sourceSlots.primaryNames } : {}),
          ...(sourceSlots.dateLabel ? { dateLabel: sourceSlots.dateLabel } : {}),
          ...(sourceSlots.heroPhotoUrl ? { heroPhotoUrl: sourceSlots.heroPhotoUrl } : {}),
          ...(targetFormat === "single_card" && sourceSlots.venueName
            ? { venueName: sourceSlots.venueName }
            : {}),
        }),
      };
    }
    if (page.role === "venue") {
      return {
        ...page,
        slots: stripUndefinedDeep({
          ...page.slots,
          ...(sourceSlots.venueName ? { venueName: sourceSlots.venueName } : {}),
          ...(sourceSlots.venueAddress ? { venueAddress: sourceSlots.venueAddress } : {}),
          ...(sourceSlots.mapsUrl ? { mapsUrl: sourceSlots.mapsUrl } : {}),
        }),
      };
    }
    return page;
  });
}
```

Export `./card-studio` from `packages/invitation-engine/src/index.ts`:
```typescript
export * from "./card-studio";
```

- [ ] **Step 4: Build & run unit tests**

Run:
```bash
pnpm --filter @nimantro/i18n build && pnpm --filter @nimantro/invitation-engine build && pnpm --filter @nimantro/invitation-engine test:unit
```
Expected: All existing tests in `index.test.ts` AND all new tests in `card-studio.test.ts` PASS.

---

### Task 3: Upgrade All 6 Bundled Templates with Single-Card & Multi-Page Card Definitions

**Files:**
- Modify: `templates/wedding/bengali-traditional-wedding.json`
- Modify: `templates/wedding/royal-bengali-reception.json`
- Modify: `templates/engagement/ring-ceremony-floral.json`
- Modify: `templates/birthday/shubho-jonmodin-modern.json`
- Modify: `templates/housewarming/griha-pravesh-warm.json`
- Modify: `templates/religious/annaprashan-blessings.json`
- Test: `apps/web/lib/templates.test.ts`

**Interfaces:**
- Consumes: `TemplateDefinitionSchema` (`@nimantro/template-schema`).
- Produces: Complete `defaultSingleCardPages` (1 card page with title, couple/celebrant names, date, venue, photo slot) and `defaultMultiPages` (4 card pages: `cover`, `family`/`couple_story`, `schedule`, `venue`+`blessings`) on all 6 JSON templates, plus `aiStylePreset` and `recommendedMusicCategory`.

- [ ] **Step 1: Add failing test to `apps/web/lib/templates.test.ts`**

Append inside `describe("web template catalog", ...)`:

```typescript
  it("provides both single-card and multi-page card definitions on every bundled template", () => {
    for (const tpl of BUNDLED_TEMPLATES) {
      expect(tpl.supportedFormats).toContain("single_card");
      expect(tpl.supportedFormats).toContain("multi_page");
      expect(tpl.defaultSingleCardPages?.length).toBe(1);
      expect(tpl.defaultMultiPages?.length).toBeGreaterThanOrEqual(3);
      expect(tpl.aiStylePreset).toBeTruthy();
      expect(tpl.recommendedMusicCategory).toBeTruthy();
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `expected undefined to be 1` on `defaultSingleCardPages`.

- [ ] **Step 3: Populate `defaultSingleCardPages` & `defaultMultiPages` in all 6 JSON templates**

For each of the 6 JSON files (`bengali-traditional-wedding.json`, `royal-bengali-reception.json`, `ring-ceremony-floral.json`, `shubho-jonmodin-modern.json`, `griha-pravesh-warm.json`, `annaprashan-blessings.json`), add top-level metadata and curated bilingual pages matching each template's artwork (`/art/wedding-3d.jpg`, `/art/engagement-3d.jpg`, `/art/birthday-3d.jpg`, `/art/cultural-3d.jpg`), layout variant (`framed_royal`, `arch_portrait`, `floral_split`, `minimal_editorial`, `festive_grid`), and border style (`alpona_gold`, `floral_vine`, `minimal_line`, `temple_arch`). Example block for `templates/wedding/bengali-traditional-wedding.json`:

```json
  "supportedFormats": ["single_card", "multi_page"],
  "aiStylePreset": "bengali_royal_wedding",
  "recommendedMusicCategory": "shehnai",
  "defaultSingleCardPages": [
    {
      "id": "cover",
      "role": "cover",
      "layout": "framed_royal",
      "enabled": true,
      "order": 0,
      "defaultSlots": {
        "eyebrow": { "en": "With joyous hearts, our families invite you", "bn": "সাদর আমন্ত্রণ ও আশীর্বাদ প্রার্থনা" },
        "title": { "en": "Shubho Bibaho", "bn": "শুভ বিবাহ" },
        "primaryNames": { "en": "Rituparna & Anirban", "bn": "ঋতুপর্ণা ও অনির্বাণ" },
        "dateLabel": { "en": "Friday, 11 December 2026 · 7:15 PM", "bn": "শুক্রবার, ১১ই ডিসেম্বর ২০২৬ · সন্ধ্যা ৭:১৫" },
        "venueName": { "en": "Sonar Tori Banquet, Salt Lake", "bn": "সোনার তরী ব্যাঙ্কোয়েট, সল্টলেক" },
        "venueAddress": { "en": "Sector II, Bidhannagar, Kolkata 700091", "bn": "সেক্টর ২, বিধাননগর, কলকাতা ৭০০০৯১" },
        "heroPhotoUrl": "/art/wedding-3d.jpg"
      },
      "visual": {
        "backgroundMode": "template_art",
        "backgroundImageUrl": "/art/wedding-3d.jpg",
        "overlayScrimOpacity": 0.14,
        "borderStyle": "alpona_gold"
      }
    }
  ],
  "defaultMultiPages": [
    {
      "id": "cover",
      "role": "cover",
      "layout": "framed_royal",
      "enabled": true,
      "order": 0,
      "defaultSlots": {
        "eyebrow": { "en": "With joyous hearts, our families invite you", "bn": "সাদর আমন্ত্রণ ও আশীর্বাদ প্রার্থনা" },
        "title": { "en": "Shubho Bibaho", "bn": "শুভ বিবাহ" },
        "primaryNames": { "en": "Rituparna & Anirban", "bn": "ঋতুপর্ণা ও অনির্বাণ" },
        "dateLabel": { "en": "Friday, 11 December 2026", "bn": "শুক্রবার, ১১ই ডিসেম্বর ২০২৬" },
        "heroPhotoUrl": "/art/wedding-3d.jpg"
      },
      "visual": {
        "backgroundMode": "template_art",
        "backgroundImageUrl": "/art/wedding-3d.jpg",
        "overlayScrimOpacity": 0.14,
        "borderStyle": "alpona_gold"
      }
    },
    {
      "id": "family",
      "role": "family",
      "layout": "arch_portrait",
      "enabled": true,
      "order": 1,
      "defaultSlots": {
        "title": { "en": "Cordial Invitation", "bn": "সবিনয় নিবেদন" },
        "body": { "en": "We warmly invite you and your family to bless Rituparna and Anirban as they begin their lifelong journey together.", "bn": "আমাদের এই আনন্দময় বিবাহ অনুষ্ঠানে আপনার সপরিবার উপস্থিতি ও শুভ আশীর্বাদ একান্ত কাম্য।" },
        "brideFamily": { "en": "Mrs. Mita & Mr. Subhasis Chatterjee", "bn": "শ্রী শুভাশিস ও শ্রীমতী মিতা চট্টোপাধ্যায়" },
        "groomFamily": { "en": "Mrs. Anjali & Mr. Debashis Mukherjee", "bn": "শ্রী দেবাশিস ও শ্রীমতী অঞ্জলি মুখোপাধ্যায়" }
      },
      "visual": {
        "backgroundMode": "theme_gradient",
        "overlayScrimOpacity": 0.08,
        "borderStyle": "temple_arch"
      }
    },
    {
      "id": "schedule",
      "role": "schedule",
      "layout": "festive_grid",
      "enabled": true,
      "order": 2,
      "defaultSlots": {
        "title": { "en": "Ceremony Schedule", "bn": "অনুষ্ঠান সূচি" },
        "scheduleItems": [
          {
            "id": "holud",
            "title": { "en": "Gaye Holud Ceremony", "bn": "শুভ গায়ে হলুদ" },
            "time": { "en": "10:00 AM", "bn": "সকাল ১০:০০ ঘটিকা" }
          },
          {
            "id": "bibaho",
            "title": { "en": "Shubho Bibaho & Dinner", "bn": "শুভ বিবাহ ও প্রীতিভোজ" },
            "time": { "en": "7:15 PM onwards", "bn": "সন্ধ্যা ৭:১৫ ঘটিকা" }
          }
        ]
      },
      "visual": {
        "backgroundMode": "theme_gradient",
        "overlayScrimOpacity": 0.08,
        "borderStyle": "floral_vine"
      }
    },
    {
      "id": "venue",
      "role": "venue",
      "layout": "minimal_editorial",
      "enabled": true,
      "order": 3,
      "defaultSlots": {
        "title": { "en": "Venue & Blessings", "bn": "অনুষ্ঠানের স্থান ও আশীর্বাদ" },
        "venueName": { "en": "Sonar Tori Banquet, Salt Lake", "bn": "সোনার তরী ব্যাঙ্কোয়েট, সল্টলেক" },
        "venueAddress": { "en": "Sector II, Bidhannagar, Kolkata 700091", "bn": "সেক্টর ২, বিধাননগর, কলকাতা ৭০০০৯১" },
        "mapsUrl": "https://maps.google.com/?q=Salt+Lake+Kolkata",
        "body": { "en": "Your presence and blessings will make our joy complete.", "bn": "আপনাদের উপস্থিতি ও আশীর্বাদ আমাদের আনন্দকে পরিপূর্ণ করবে।" }
      },
      "visual": {
        "backgroundMode": "theme_gradient",
        "overlayScrimOpacity": 0.08,
        "borderStyle": "alpona_gold"
      }
    }
  ]
```

Apply the corresponding category-authentic Bengali & English content (`royal-bengali-reception-001` -> `"shehnai"`, `ashirbad-floral-001` -> `"floral_garden"` / `"bansuri"`, `shubho-jonmodin-modern-001` -> `"modern_celebration"` / `"festive"`, `griha-pravesh-warm-001` -> `"temple_heritage"` / `"shankha"`, `annaprashan-blessings-001` -> `"temple_heritage"` / `"bansuri"`) across the remaining 5 JSON files.

- [ ] **Step 4: Run web unit tests**

Run: `pnpm --filter web test:unit`
Expected: PASS — all existing and new template catalog assertions pass.

---

### Task 4: Extend Zustand Editor Store (`@nimantro/editor`) & i18n Dictionaries

**Files:**
- Modify: `packages/editor/src/index.ts`
- Modify: `packages/editor/src/index.test.ts`
- Modify: `packages/i18n/messages/en.json`
- Modify: `packages/i18n/messages/bn.json`

**Interfaces:**
- Produces in `@nimantro/editor`: `StudioStep = "details" | "media" | "ai" | "export"`, store fields `studioStep`, `activePageId`, and actions `setStudioStep`, `setActivePage`, `setCardFormat`, `updateCardPageSlot`, `updateCardPageVisual`, `toggleCardPageEnabled`, `applyThemePreset`, `replaceCardPages`.

- [ ] **Step 1: Write failing tests in `packages/editor/src/index.test.ts`**

Append inside `describe("editor Zustand store", ...)`:

```typescript
  it("manages card_studio steps, page slots, visual scrim, and undo/redo", () => {
    const store = useEditorStore.getState();
    store.initialise({
      ...structuredClone(sampleDesign),
      designMode: "card_studio",
      cardFormat: "multi_page",
      pages: [
        {
          id: "cover",
          role: "cover",
          layout: "framed_royal",
          enabled: true,
          order: 0,
          slots: { title: { bn: "শুভ বিবাহ", en: "Wedding" } },
          visual: {
            backgroundMode: "theme_gradient",
            overlayScrimOpacity: 0.12,
            borderStyle: "alpona_gold",
          },
        },
        {
          id: "venue",
          role: "venue",
          layout: "minimal_editorial",
          enabled: true,
          order: 1,
          slots: { venueName: { bn: "ভবন", en: "Hall" } },
          visual: {
            backgroundMode: "theme_gradient",
            overlayScrimOpacity: 0.1,
            borderStyle: "minimal_line",
          },
        },
      ],
    });

    useEditorStore.getState().setStudioStep("media");
    expect(useEditorStore.getState().studioStep).toBe("media");

    useEditorStore.getState().updateCardPageSlot("cover", {
      primaryNames: { bn: "রিয়া ও অর্ক", en: "Riya & Arka" },
    });
    useEditorStore.getState().updateCardPageVisual("cover", { overlayScrimOpacity: 0.35 });
    useEditorStore.getState().pushHistory("Update cover names & scrim");

    expect(useEditorStore.getState().design?.pages?.[0].slots.primaryNames?.en).toBe("Riya & Arka");
    expect(useEditorStore.getState().design?.pages?.[0].visual.overlayScrimOpacity).toBe(0.35);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().design?.pages?.[0].slots.primaryNames).toBeUndefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nimantro/editor test:unit`
Expected: FAIL — `setStudioStep is not a function`.

- [ ] **Step 3: Update `packages/editor/src/index.ts` and i18n message files**

Add `StudioStep` and card-studio state/actions to `EditorState` in `packages/editor/src/index.ts` while preserving every existing `sections[]` action:

```typescript
export type StudioStep = "details" | "media" | "ai" | "export";
```
Add to `useEditorStore`:
```typescript
    studioStep: "details",
    activePageId: null,

    setStudioStep: (step) => {
      set((state) => {
        state.studioStep = step;
      });
    },

    setActivePage: (pageId) => {
      set((state) => {
        state.activePageId = pageId;
      });
    },

    setCardFormat: (cardFormat, nextPages) => {
      set((state) => {
        if (!state.design) return;
        state.design.designMode = "card_studio";
        state.design.cardFormat = cardFormat;
        state.design.pages = nextPages;
        state.activePageId = nextPages[0]?.id ?? null;
        state.isDirty = true;
      });
    },

    updateCardPageSlot: (pageId, slotPatch) => {
      set((state) => {
        if (!state.design?.pages) return;
        const page = state.design.pages.find((p) => p.id === pageId);
        if (!page) return;
        Object.assign(page.slots, slotPatch);
        state.isDirty = true;
      });
    },

    updateCardPageVisual: (pageId, visualPatch) => {
      set((state) => {
        if (!state.design?.pages) return;
        const page = state.design.pages.find((p) => p.id === pageId);
        if (!page) return;
        for (const [k, v] of Object.entries(visualPatch)) {
          if (v === undefined) {
            delete (page.visual as Record<string, unknown>)[k];
          } else {
            (page.visual as Record<string, unknown>)[k] = v;
          }
        }
        state.isDirty = true;
      });
    },

    toggleCardPageEnabled: (pageId) => {
      set((state) => {
        if (!state.design?.pages) return;
        const page = state.design.pages.find((p) => p.id === pageId);
        if (!page) return;
        page.enabled = !page.enabled;
        state.isDirty = true;
      });
    },

    applyThemePreset: (theme) => {
      set((state) => {
        if (!state.design) return;
        state.design.theme = { ...theme };
        state.isDirty = true;
      });
    },

    replaceCardPages: (pages) => {
      set((state) => {
        if (!state.design) return;
        state.design.designMode = "card_studio";
        state.design.pages = pages;
        state.isDirty = true;
      });
    },
```
Also ensure `initialise` sets `state.activePageId = design.pages?.[0]?.id ?? null` and `state.studioStep = "details"`.

Add `"studio"` keys to `packages/i18n/messages/en.json` and `packages/i18n/messages/bn.json` (`stepDetails`, `stepMedia`, `stepAi`, `stepExport`, `singleCard`, `multiPageCard`, `themePresets`, `pageLabel`, `upgradeLegacy`).

- [ ] **Step 4: Build and test `@nimantro/editor` and `@nimantro/i18n`**

Run:
```bash
pnpm --filter @nimantro/i18n build && pnpm --filter @nimantro/editor build && pnpm --filter @nimantro/editor test:unit
```
Expected: PASS.

---

### Task 5: Build `4:5` CardPageRenderer, CardDeckRenderer & Wire into InvitationRenderer

**Files:**
- Create: `apps/web/components/invitation/CardPageRenderer.tsx`
- Create: `apps/web/components/invitation/CardDeckRenderer.tsx`
- Modify: `apps/web/components/invitation/InvitationRenderer.tsx`

**Interfaces:**
- Consumes: `InvitationCardPage`, `InvitationTheme`, `InvitationDesignDocument` (`@nimantro/types`), `buildThemeCssVariables`, `resolveSectionText`, `getOrderedEnabledCardPages` (`@nimantro/invitation-engine`), `AlponaCrest`, `AlponaDivider` (`./AlponaMotif`).
- Produces:
  - `CardPageRenderer({ page, theme, locale, className, active, onClick })` rendering an exact `aspect-[4/5]` frame with layered SVG decorative borders, background art/AI backdrop + dark/light scrim for contrast, uploaded photo frames, and crisp Bengali/English HTML typography.
  - `CardDeckRenderer({ design, locale, onLocaleChange, interactive, activePageId, onSelectPage, rsvpSlot, showLanguageToggle })` rendering Single Card or Multi-Page Card carousel/stacked view on web and embedding `rsvpSlot` underneath.

- [ ] **Step 1: Write unit/component contract test or pure helper test in `apps/web/components/invitation/card-renderer-utils.ts` + `.test.ts`**

Create a tiny pure helper `apps/web/components/invitation/card-renderer-utils.ts` exporting `computeScrimOverlay(hexColor: string, opacity: number): string` and `resolvePageHeadingFont(locale: "bn" | "en", theme: InvitationTheme): string`, and write its unit test `apps/web/components/invitation/card-renderer-utils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { computeScrimOverlay } from "./card-renderer-utils";

describe("card renderer contrast helpers", () => {
  it("computes light or dark scrim gradient preserving text legibility", () => {
    const lightScrim = computeScrimOverlay("#FFF9F0", 0.4);
    expect(lightScrim).toContain("rgba(255, 249, 240");
    const darkScrim = computeScrimOverlay("#161B2E", 0.5);
    expect(darkScrim).toContain("rgba(22, 27, 46");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `Cannot find module './card-renderer-utils'`.

- [ ] **Step 3: Implement `card-renderer-utils.ts`, `CardPageRenderer.tsx`, `CardDeckRenderer.tsx`, and hook into `InvitationRenderer.tsx`**

Implement `card-renderer-utils.ts`:
```typescript
import type { InvitationTheme } from "@nimantro/types";
import { getFontStack } from "@nimantro/invitation-engine";

export function computeScrimOverlay(hexColor: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(0.85, opacity));
  const clean = hexColor.replace("#", "");
  const r = parseInt(clean.slice(0, 2) || "ff", 16);
  const g = parseInt(clean.slice(2, 4) || "ff", 16);
  const b = parseInt(clean.slice(4, 6) || "ff", 16);
  const centerOpacity = Math.min(0.92, clamped + 0.16);
  return `radial-gradient(circle at 50% 48%, rgba(${r}, ${g}, ${b}, ${centerOpacity}) 0%, rgba(${r}, ${g}, ${b}, ${clamped}) 72%, rgba(${r}, ${g}, ${b}, ${Math.max(0.05, clamped * 0.7)}) 100%)`;
}

export function resolvePageHeadingFont(
  locale: "bn" | "en",
  theme: InvitationTheme
): string {
  if (locale === "bn") {
    return getFontStack(
      theme.headingFont.includes("Bengali") || theme.headingFont.includes("Bangla") || theme.headingFont.includes("Siliguri")
        ? theme.headingFont
        : theme.accentFont ?? "Noto Serif Bengali"
    );
  }
  return getFontStack(theme.headingFont);
}
```

Implement `CardPageRenderer.tsx` handling all 5 `CardPageRole` views (`cover`, `couple_story`/`family`, `schedule`, `venue`, `gallery`/`blessings`) inside an `aspect-[4/5]` rounded card container with:
1. Optional full-bleed background image (`page.visual.backgroundImageUrl`) when `backgroundMode` is `"template_art"`, `"ai_generated"`, or `"uploaded_photo"`.
2. Radial scrim overlay (`computeScrimOverlay(theme.background, page.visual.overlayScrimOpacity)`) ensuring high contrast for layered Bengali/English text.
3. SVG border frame (`alpona_gold`, `temple_arch`, `floral_vine`, `minimal_line`).
4. Crisp HTML/SVG typography slots (`eyebrow`, `title`, `primaryNames`, `dateLabel`, `heroPhotoUrl` circular/arch portrait frame when uploaded, `brideFamily` & `groomFamily`, `scheduleItems`, `venueName`, `venueAddress`, `mapsUrl`, `galleryPhotoUrls`, `body`).

Implement `CardDeckRenderer.tsx` rendering:
- Language toggle pill (`বাংলা` / `English`) when `design.language === "both"` and `showLanguageToggle`.
- When `design.cardFormat === "single_card"` (or 1 enabled page): centered `CardPageRenderer`.
- When `multi_page`: clean interactive slide view with Previous/Next arrows, page pill indicators (`1 / 4`), plus optional "View All Pages" vertical stack mode for scrolling guests, and `rsvpSlot` cleanly positioned below the card deck.

In `InvitationRenderer.tsx`, at the top of the `InvitationRenderer` component:
```typescript
if (design.designMode === "card_studio" && (design.pages?.length ?? 0) > 0) {
  return (
    <CardDeckRenderer
      design={design}
      eventMeta={eventMeta}
      locale={controlledLocale}
      onLocaleChange={onLocaleChange}
      interactive={interactive}
      activePageId={activeSectionId}
      onSelectPage={onSelectSection}
      rsvpSlot={rsvpSlot}
      showLanguageToggle={showLanguageToggle}
      className={className}
    />
  );
}
```

- [ ] **Step 4: Run web unit tests & type-check**

Run: `pnpm --filter web test:unit && pnpm --filter web type-check`
Expected: PASS.

---

### Task 6: Simple Guided Studio UI & Event Creation Auto-Fill

**Files:**
- Create: `apps/web/components/editor/DetailsTemplateStep.tsx`
- Create: `apps/web/components/editor/SimpleStudioShell.tsx`
- Modify: `apps/web/app/(editor)/editor/[eventId]/[invitationId]/page.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/events/new/page.tsx`
- Modify: `apps/web/app/api/events/route.ts`
- Modify: `apps/functions/src/events/createEvent.ts`

**Interfaces:**
- Consumes: `useEditorStore` (`@nimantro/editor`), `templateToCardDesignDocument`, `buildCardPagesForTemplate`, `CARD_THEME_PRESETS` (`@nimantro/invitation-engine`), `BUNDLED_TEMPLATES`, `getTemplateById` (`@/lib/templates`), `CardDeckRenderer`, `CardPageRenderer`.
- Produces: Guided 4-step editor shell where Phase 1 implements Step 1 (`DetailsTemplateStep`) + Step 4 quick Publish/Share (Phase 2 populates Step 2 `Photos & Music`, Phase 3 populates Step 3 `AI Background`, Phase 4 populates Step 4 `Export Cards`).

- [ ] **Step 1: Write unit test for `/api/events` auto-generation helper**

Extract `buildInitialInvitationDesign` in `apps/web/lib/event-design-builder.ts` and write `apps/web/lib/event-design-builder.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildInitialInvitationDesign } from "./event-design-builder";

describe("buildInitialInvitationDesign", () => {
  it("creates card_studio single_card design with populated couple names and venue", () => {
    const doc = buildInitialInvitationDesign({
      templateId: "bengali-wedding-001",
      category: "wedding",
      cardFormat: "single_card",
      language: "both",
      title: "Rituparna & Anirban",
      hostNames: ["Rituparna", "Anirban"],
      startAt: "2026-12-11T19:15:00.000Z",
      timezone: "Asia/Kolkata",
      venue: { name: "Sonar Tori", address: "Salt Lake, Kolkata" },
    });

    expect(doc.designMode).toBe("card_studio");
    expect(doc.cardFormat).toBe("single_card");
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages?.[0].slots.primaryNames?.bn).toBe("Rituparna ও Anirban");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `Cannot find module './event-design-builder'`.

- [ ] **Step 3: Implement `event-design-builder.ts`, update `api/events/route.ts`, `createEvent.ts`, `events/new/page.tsx`, `DetailsTemplateStep.tsx`, `SimpleStudioShell.tsx`, and `editor/[eventId]/[invitationId]/page.tsx`**

1. `apps/web/lib/event-design-builder.ts`: Calls `getTemplateById(templateId)` (falling back by `category`) and returns `templateToCardDesignDocument(template, { cardFormat, language, eventDetails })`.
2. `apps/web/app/api/events/route.ts`: Extend `CreateEventPayloadSchema` with `cardFormat: CardFormatSchema.optional().default("multi_page")` and use `buildInitialInvitationDesign(...)`.
3. `apps/web/app/(dashboard)/dashboard/events/new/page.tsx`: Add a clear 2-card toggle (`Single Card (1 page)` vs `Multi-Page Card (4 pages)`) above template selection and send `cardFormat` in `POST /api/events`.
4. `apps/web/components/editor/DetailsTemplateStep.tsx`:
   - Format segmented toggle (`Single Card` / `Multi-Page Card`) calling `buildCardPagesForTemplate` while preserving user-entered couple names, date, and venue slots across switches.
   - Template selector strip (`BUNDLED_TEMPLATES`) + Color Palette Presets (`CARD_THEME_PRESETS`) + Language selector (`both`, `bn`, `en`).
   - Page selector pills (`Cover`, `Families`, `Schedule`, `Venue`) and clean bilingual text inputs for the active page's `slots` (`title`, `eyebrow`, `primaryNames`, `dateLabel`, `body`, `brideFamily`, `groomFamily`, `scheduleItems`, `venueName`, `venueAddress`, `mapsUrl`), plus background scrim slider (`0% – 75%`).
5. `apps/web/components/editor/SimpleStudioShell.tsx`:
   - Clean top bar: Back to Event, Title + Saved/Unsaved badge, Undo/Redo, Language Preview Toggle, Save Draft, Publish Dialog (`/i/[slug]` + visibility + password).
   - 4-Step Progress Bar: `1. Details & Template` | `2. Photos & Music` | `3. AI Background` | `4. Export & Share`.
   - 2-Column Workspace (`lg:grid-cols-[420px_1fr]`): Left step form panel + Right centered `4:5` live interactive preview card (`CardDeckRenderer`) with instant click-to-switch pages.
   - Steps 2 and 3 render informative status cards until Phases 2 and 3 mount `MediaMusicStep` and `AiBackgroundStep`, while Step 4 already provides full Publish & Live Link sharing (`ExportSharePanel` joins in Phase 4).
6. `apps/web/app/(editor)/editor/[eventId]/[invitationId]/page.tsx`:
   - Loads `invitation` AND `event` doc (`events/{eventId}`), mounts `SimpleStudioShell` when `design.designMode === "card_studio"`.
   - For legacy `designMode !== "card_studio"` drafts, renders a non-destructive banner `"This invitation uses legacy webpage sections"` with a 1-click `"Switch to Simple Card Studio"` conversion button alongside the legacy `InvitationRenderer` preview so zero existing invitations break.

- [ ] **Step 4: Run full workspace verification**

Run:
```bash
pnpm --filter @nimantro/types build && pnpm --filter @nimantro/validation build && pnpm --filter @nimantro/template-schema build && pnpm --filter @nimantro/i18n build && pnpm --filter @nimantro/invitation-engine build && pnpm --filter @nimantro/editor build && pnpm type-check && pnpm test:unit && pnpm --filter web build
```
Expected: All builds, TypeScript checks, and unit test suites PASS.
