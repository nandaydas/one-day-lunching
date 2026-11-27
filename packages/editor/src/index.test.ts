import { describe, expect, it } from "vitest";
import { useEditorStore } from "./index";
import type { InvitationDesignDocument } from "@nimantro/types";

const sampleDesign: InvitationDesignDocument = {
  templateId: "tpl-1",
  templateVersion: 1,
  language: "both",
  theme: {
    primary: "#8B2635",
    secondary: "#D6B56D",
    background: "#FFF9F1",
    surface: "#FFFFFF",
    text: "#242124",
    muted: "#77716D",
    border: "#EAE1D8",
    headingFont: "Noto Serif Bengali",
    bodyFont: "Hind Siliguri",
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      order: 0,
      content: { title: { bn: "শুভ বিবাহ", en: "Wedding" } },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    },
    {
      id: "venue",
      type: "venue",
      enabled: true,
      order: 1,
      content: { heading: { bn: "স্থান", en: "Venue" } },
      style: { alignment: "center" },
      animation: { preset: "fade-up" },
    },
  ],
};

describe("editor Zustand store", () => {
  it("initialises design, tracks dirty state, and supports undo/redo", () => {
    const store = useEditorStore.getState();
    store.initialise(structuredClone(sampleDesign));

    expect(useEditorStore.getState().isDirty).toBe(false);
    expect(useEditorStore.getState().canUndo()).toBe(false);

    useEditorStore.getState().updateSectionContent("hero", {
      title: { bn: "শুভ জন্মদিন", en: "Birthday" },
    });
    useEditorStore.getState().pushHistory("Update hero title");

    expect(useEditorStore.getState().isDirty).toBe(true);
    expect(useEditorStore.getState().canUndo()).toBe(true);
    expect(useEditorStore.getState().design?.sections[0].content.title).toEqual({
      bn: "শুভ জন্মদিন",
      en: "Birthday",
    });

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().design?.sections[0].content.title).toEqual({
      bn: "শুভ বিবাহ",
      en: "Wedding",
    });
    expect(useEditorStore.getState().canRedo()).toBe(true);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().design?.sections[0].content.title).toEqual({
      bn: "শুভ জন্মদিন",
      en: "Birthday",
    });
  });

  it("reorders, toggles, duplicates, and removes sections", () => {
    const store = useEditorStore.getState();
    store.initialise(structuredClone(sampleDesign));

    store.moveSectionDown("hero");
    const moved = useEditorStore.getState().design?.sections ?? [];
    expect(moved.map((s) => s.id)).toEqual(["venue", "hero"]);
    expect(moved.map((s) => s.order)).toEqual([0, 1]);

    store.toggleSectionEnabled("venue");
    expect(useEditorStore.getState().design?.sections[0].enabled).toBe(false);

    store.duplicateSection("hero");
    expect(useEditorStore.getState().design?.sections).toHaveLength(3);

    const dupId = useEditorStore.getState().design?.sections[2].id ?? "";
    store.removeSection(dupId);
    expect(useEditorStore.getState().design?.sections).toHaveLength(2);
  });
});
