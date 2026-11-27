import { describe, expect, it } from "vitest";
import { translate } from "@nimantro/i18n";
import { STORY_TYPE_CATALOG, templateToDesignDocument } from "@nimantro/invitation-engine";
import { canUserShareOrPrintInvitation } from "./invitation-permissions";
import { BUNDLED_TEMPLATES, filterTemplates, getTemplateById } from "./templates";
import { hashPassword, sha256, verifyPassword } from "./server-crypto";

describe("web template catalog", () => {
  it("loads and validates all 6 bundled templates with 3D artwork, stories, and English-first order", () => {
    expect(BUNDLED_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    const wedding = getTemplateById("bengali-wedding-001");
    expect(wedding?.name).toBe("Bengali Traditional Wedding");

    for (const tpl of BUNDLED_TEMPLATES) {
      expect(tpl.languages[0]).toBe("en");
      expect(tpl.thumbnail).toMatch(/^\/art\/.+\.(jpg|svg)$/);
      const doc = templateToDesignDocument(tpl);
      const story = doc.sections.find((s) => s.type === "story" && s.enabled);
      expect(story, `Template ${tpl.id} missing enabled story section`).toBeDefined();
      expect(STORY_TYPE_CATALOG.some((st) => st.id === story?.content.storyType)).toBe(true);
    }
  });

  it("filters templates by category, event category, and search text", () => {
    expect(filterTemplates({ eventCategory: "birthday" })).toHaveLength(1);
    expect(filterTemplates({ category: "royal" })[0]?.id).toBe(
      "royal-bengali-reception-001"
    );
    expect(filterTemplates({ search: "griha" })[0]?.id).toBe("griha-pravesh-warm-001");
  });
});

describe("withGallery", () => {
  it("adds a gallery after the story to old invitations and leaves others alone", async () => {
    const { BUNDLED_TEMPLATES, withGallery } = await import("./templates");
    const { templateToDesignDocument } = await import("@nimantro/invitation-engine");
    const full = templateToDesignDocument(BUNDLED_TEMPLATES[0]);
    expect(withGallery(full)).toBe(full);

    const old = { ...full, sections: full.sections.filter((s) => s.type !== "gallery") };
    const fixed = withGallery(old);
    const types = fixed.sections.map((s) => s.type);
    expect(types.filter((t) => t === "gallery")).toHaveLength(1);
    expect(types.indexOf("gallery")).toBe(types.indexOf("story") + 1);
    expect(fixed.sections.map((s) => s.order)).toEqual(fixed.sections.map((_, i) => i));
  });
});

describe("web server-crypto", () => {
  it("verifies password hashes and deterministic sha256", () => {
    const h = hashPassword("nimantro-pass");
    expect(verifyPassword("nimantro-pass", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(sha256("abc")).toBe(sha256("abc"));
  });
});

describe("web Bengali i18n dictionary", () => {
  it("translates navigation, dashboard, event, and settings keys into Bengali", () => {
    const keys = [
      "nav.overview",
      "nav.events",
      "nav.settings",
      "dashboard.welcome",
      "dashboard.createEvent",
      "events.title",
      "newEvent.heading",
      "settings.heading",
      "auth.preferredLanguage",
      "auth.signInTitle",
      "auth.signInDesc",
      "auth.signUpTitle",
      "auth.signUpDesc",
      "auth.continueWithGoogle",
      "auth.createAccount",
      "auth.forgotPassword",
      "auth.newToNimantro",
      "editor.sections",
      "editor.theme",
      "editor.content",
      "editor.invitationLanguage",
      "editor.save",
      "editor.publish",
      "nav.workspace",
      "exports.title",
      "notifications.title",
      "analytics.title",
    ];
    for (const key of keys) {
      const bn = translate("bn", key);
      const en = translate("en", key);
      expect(bn).not.toBe(key);
      expect(bn).not.toBe(en);
    }
  });
});

describe("creator and inviter share/print permissions", () => {
  it("allows only event creators and authorised inviter members to share or print", () => {
    expect(
      canUserShareOrPrintInvitation({ ownerId: "user-owner", viewerUid: "user-owner" })
    ).toBe(true);
    expect(
      canUserShareOrPrintInvitation({
        ownerId: "user-owner",
        viewerUid: "user-cohost",
        member: { role: "co_host", permissions: [] },
      })
    ).toBe(true);
    expect(
      canUserShareOrPrintInvitation({
        ownerId: "user-owner",
        viewerUid: "user-inviter",
        member: { role: "guest_manager", permissions: ["manage_guests"] },
      })
    ).toBe(true);
    expect(
      canUserShareOrPrintInvitation({
        ownerId: "user-owner",
        viewerUid: "user-viewer",
        member: { role: "viewer", permissions: [] },
      })
    ).toBe(false);
    expect(
      canUserShareOrPrintInvitation({
        ownerId: "user-owner",
        viewerUid: "random-guest",
        member: null,
      })
    ).toBe(false);
    expect(
      canUserShareOrPrintInvitation({
        ownerId: "user-owner",
        viewerUid: null,
        member: null,
      })
    ).toBe(false);
  });
});
