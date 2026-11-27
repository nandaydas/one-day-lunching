// ============================================================
// Nimantro — Bundled Template Catalog
// apps/web/lib/templates.ts
// ============================================================

import {
  validateTemplate,
  type TemplateDefinition,
} from "@nimantro/template-schema";
import type { EventCategory, InvitationDesignDocument, TemplateCategory } from "@nimantro/types";
import { SECTION_CATALOG, templateToDesignDocument } from "@nimantro/invitation-engine";

import bengaliWeddingJson from "../../../templates/wedding/bengali-traditional-wedding.json";
import royalReceptionJson from "../../../templates/wedding/royal-bengali-reception.json";
import floralEngagementJson from "../../../templates/engagement/ring-ceremony-floral.json";
import modernBirthdayJson from "../../../templates/birthday/shubho-jonmodin-modern.json";
import grihaPraveshJson from "../../../templates/housewarming/griha-pravesh-warm.json";
import annaprashanJson from "../../../templates/religious/annaprashan-blessings.json";
import lalBenarasiJson from "../../../templates/wedding/lal-benarasi-royal.json";
import shankhaPolaJson from "../../../templates/wedding/shankha-pola-minimal.json";
import rajanigandhaJson from "../../../templates/wedding/rajanigandha-night.json";
import kanthaStitchJson from "../../../templates/wedding/kantha-stitch-floral.json";

export const BUNDLED_TEMPLATES: TemplateDefinition[] = [
  bengaliWeddingJson,
  royalReceptionJson,
  lalBenarasiJson,
  shankhaPolaJson,
  rajanigandhaJson,
  kanthaStitchJson,
  floralEngagementJson,
  modernBirthdayJson,
  grihaPraveshJson,
  annaprashanJson,
].map((raw) => validateTemplate(raw));

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return BUNDLED_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateBySlug(slug: string): TemplateDefinition | undefined {
  return BUNDLED_TEMPLATES.find((t) => t.slug === slug);
}

export function filterTemplates(options?: {
  category?: TemplateCategory | "all";
  eventCategory?: EventCategory | "all";
  search?: string;
}): TemplateDefinition[] {
  const query = options?.search?.trim().toLowerCase() ?? "";

  return BUNDLED_TEMPLATES.filter((t) => {
    if (options?.category && options.category !== "all" && t.category !== options.category) {
      return false;
    }
    if (
      options?.eventCategory &&
      options.eventCategory !== "all" &&
      !t.eventCategories.includes(options.eventCategory)
    ) {
      return false;
    }
    if (query) {
      const hay = `${t.name} ${t.category} ${t.tags.join(" ")} ${t.eventCategories.join(" ")}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

/**
 * Invitations made before galleries existed have no gallery section.
 * Adds the template's gallery (or the default one) after the story, so every event can take photos.
 */
export function withGallery(design: InvitationDesignDocument): InvitationDesignDocument {
  if (design.sections.some((s) => s.type === "gallery")) return design;
  const template = getTemplateById(design.templateId);
  const fromTemplate = template ? templateToDesignDocument(template).sections.find((s) => s.type === "gallery") : undefined;
  const gallery = fromTemplate ?? SECTION_CATALOG.find((c) => c.type === "gallery")!.createDefaultSection(0);
  const sections = [...design.sections].sort((a, b) => a.order - b.order);
  const story = sections.findIndex((s) => s.type === "story");
  const tail = sections.findIndex((s) => s.type === "rsvp" || s.type === "footer");
  const at = story >= 0 ? story + 1 : tail >= 0 ? tail : sections.length;
  sections.splice(at, 0, { ...gallery, content: { ...gallery.content } });
  return { ...design, sections: sections.map((s, i) => ({ ...s, order: i })) };
}
