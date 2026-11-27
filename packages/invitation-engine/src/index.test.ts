import { describe, expect, it } from "vitest";
import {
  buildThemeCssVariables,
  getOrderedEnabledSections,
  resolveSectionText,
  templateToDesignDocument,
} from "./index";
import type { TemplateDefinition } from "@nimantro/template-schema";

const sampleTemplate: TemplateDefinition = {
  id: "test-template",
  version: 1,
  name: "Test Wedding",
  slug: "test-wedding",
  category: "traditional",
  eventCategories: ["wedding"],
  languages: ["bn", "en"],
  thumbnail: "/thumb.jpg",
  access: "free",
  tags: ["wedding"],
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
      id: "venue",
      type: "venue",
      enabled: false,
      order: 2,
      required: false,
      locked: false,
      style: {},
      animation: { preset: "fade-up" },
    },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      order: 0,
      required: true,
      locked: false,
      defaultContent: { title: { bn: "শুভ বিবাহ", en: "Wedding Invitation" } },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    },
  ],
};

describe("invitation-engine", () => {
  it("converts template to sorted design document and filters enabled sections", () => {
    const doc = templateToDesignDocument(sampleTemplate);
    expect(doc.language).toBe("both");
    const enabled = getOrderedEnabledSections(doc);
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("hero");
  });

  it("resolves bilingual strings with fallback", () => {
    expect(resolveSectionText({ bn: "শুভ বিবাহ", en: "Wedding" }, "bn")).toBe("শুভ বিবাহ");
    expect(resolveSectionText({ bn: "শুভ বিবাহ", en: "Wedding" }, "en")).toBe("Wedding");
    expect(resolveSectionText({ en: "Only English" }, "bn")).toBe("Only English");
  });

  it("builds theme CSS custom properties", () => {
    const vars = buildThemeCssVariables(templateToDesignDocument(sampleTemplate).theme);
    expect(vars["--inv-primary"]).toBe("#8B1E2D");
    expect(vars["--inv-heading-font"]).toContain("Noto Serif Bengali");
  });

  it("omits undefined properties so documents are Firestore-safe", () => {
    const doc = templateToDesignDocument(sampleTemplate);
    const hasUndefined = (obj: unknown): boolean => {
      if (obj === undefined) return true;
      if (Array.isArray(obj)) return obj.some(hasUndefined);
      if (obj && typeof obj === "object") {
        return Object.values(obj).some(hasUndefined);
      }
      return false;
    };
    expect(hasUndefined(doc)).toBe(false);
  });
});
