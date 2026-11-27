// ============================================================
// Nimantro — Bundled Template Catalog
// apps/web/lib/templates.ts
// ============================================================

import {
  validateTemplate,
  type TemplateDefinition,
} from "@nimantro/template-schema";
import type { EventCategory, TemplateCategory } from "@nimantro/types";

import bengaliWeddingJson from "../../../templates/wedding/bengali-traditional-wedding.json";
import royalReceptionJson from "../../../templates/wedding/royal-bengali-reception.json";
import floralEngagementJson from "../../../templates/engagement/ring-ceremony-floral.json";
import modernBirthdayJson from "../../../templates/birthday/shubho-jonmodin-modern.json";
import grihaPraveshJson from "../../../templates/housewarming/griha-pravesh-warm.json";
import annaprashanJson from "../../../templates/religious/annaprashan-blessings.json";

export const BUNDLED_TEMPLATES: TemplateDefinition[] = [
  bengaliWeddingJson,
  royalReceptionJson,
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
