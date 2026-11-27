// ============================================================
// Nimantro — Editor State (Zustand)
// packages/editor/src/index.ts
// ============================================================

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { current } from "immer";
import type {
  InvitationDesignDocument,
  InvitationSection,
  Language,
} from "@nimantro/types";

export type EditorMode = "content" | "style" | "animation" | "preview";
export type PreviewDevice = "mobile" | "tablet" | "desktop";

export interface EditorHistoryEntry {
  design: InvitationDesignDocument;
  timestamp: number;
  label?: string;
}

export interface EditorState {
  // The working copy of the design (not yet saved/published)
  design: InvitationDesignDocument | null;

  // Active section being edited
  activeSectionId: string | null;

  // Editor UI state
  mode: EditorMode;
  previewDevice: PreviewDevice;

  // History for undo/redo
  history: EditorHistoryEntry[];
  historyIndex: number;

  // Status flags
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;

  // Actions
  initialise: (design: InvitationDesignDocument) => void;
  setActiveSection: (sectionId: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setPreviewDevice: (device: PreviewDevice) => void;

  // Section actions
  updateSectionContent: (sectionId: string, content: Partial<InvitationSection["content"]>) => void;
  updateSectionStyle: (sectionId: string, style: Partial<InvitationSection["style"]>) => void;
  updateSectionAnimation: (sectionId: string, animation: Partial<InvitationSection["animation"]>) => void;
  toggleSectionEnabled: (sectionId: string) => void;
  moveSectionUp: (sectionId: string) => void;
  moveSectionDown: (sectionId: string) => void;
  addSection: (section: InvitationSection) => void;
  removeSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string) => void;

  // Theme & Language
  updateTheme: (theme: Partial<InvitationDesignDocument["theme"]>) => void;
  updateLanguage: (language: Language) => void;
  updateMetadata: (key: string, value: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (label?: string) => void;

  // Save state
  markSaving: () => void;
  markSaved: () => void;
  markDirty: () => void;
}

const MAX_HISTORY = 50;

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    design: null,
    activeSectionId: null,
    mode: "content",
    previewDevice: "mobile",
    history: [],
    historyIndex: -1,
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,

    initialise: (design) => {
      set((state) => {
        state.design = design;
        state.history = [{ design, timestamp: Date.now(), label: "Initial" }];
        state.historyIndex = 0;
        state.isDirty = false;
        state.activeSectionId = null;
      });
    },

    setActiveSection: (sectionId) => {
      set((state) => {
        state.activeSectionId = sectionId;
      });
    },

    setMode: (mode) => {
      set((state) => {
        state.mode = mode;
      });
    },

    setPreviewDevice: (device) => {
      set((state) => {
        state.previewDevice = device;
      });
    },

    updateSectionContent: (sectionId, content) => {
      set((state) => {
        if (!state.design) return;
        const section = state.design.sections.find((s) => s.id === sectionId);
        if (section) {
          Object.assign(section.content, content);
          state.isDirty = true;
        }
      });
    },

    updateSectionStyle: (sectionId, style) => {
      set((state) => {
        if (!state.design) return;
        const section = state.design.sections.find((s) => s.id === sectionId);
        if (section) {
          for (const [key, val] of Object.entries(style)) {
            if (val === undefined) {
              delete (section.style as Record<string, unknown>)[key];
            } else {
              (section.style as Record<string, unknown>)[key] = val;
            }
          }
          state.isDirty = true;
        }
      });
    },

    updateSectionAnimation: (sectionId, animation) => {
      set((state) => {
        if (!state.design) return;
        const section = state.design.sections.find((s) => s.id === sectionId);
        if (section) {
          Object.assign(section.animation, animation);
          state.isDirty = true;
        }
      });
    },

    toggleSectionEnabled: (sectionId) => {
      set((state) => {
        if (!state.design) return;
        const section = state.design.sections.find((s) => s.id === sectionId);
        if (section) {
          section.enabled = !section.enabled;
          state.isDirty = true;
        }
      });
    },

    moveSectionUp: (sectionId) => {
      set((state) => {
        if (!state.design) return;
        const idx = state.design.sections.findIndex((s) => s.id === sectionId);
        if (idx > 0) {
          const temp = state.design.sections[idx];
          state.design.sections[idx] = state.design.sections[idx - 1];
          state.design.sections[idx - 1] = temp;
          // Fix order values
          state.design.sections.forEach((s, i) => { s.order = i; });
          state.isDirty = true;
        }
      });
    },

    moveSectionDown: (sectionId) => {
      set((state) => {
        if (!state.design) return;
        const idx = state.design.sections.findIndex((s) => s.id === sectionId);
        if (idx < state.design.sections.length - 1) {
          const temp = state.design.sections[idx];
          state.design.sections[idx] = state.design.sections[idx + 1];
          state.design.sections[idx + 1] = temp;
          state.design.sections.forEach((s, i) => { s.order = i; });
          state.isDirty = true;
        }
      });
    },

    addSection: (section) => {
      set((state) => {
        if (!state.design) return;
        const newSection = { ...section, order: state.design.sections.length };
        state.design.sections.push(newSection);
        state.isDirty = true;
      });
    },

    removeSection: (sectionId) => {
      set((state) => {
        if (!state.design) return;
        state.design.sections = state.design.sections.filter(
          (s) => s.id !== sectionId
        );
        state.design.sections.forEach((s, i) => { s.order = i; });
        if (state.activeSectionId === sectionId) {
          state.activeSectionId = null;
        }
        state.isDirty = true;
      });
    },

    duplicateSection: (sectionId) => {
      set((state) => {
        if (!state.design) return;
        const original = state.design.sections.find((s) => s.id === sectionId);
        if (!original) return;
        const duplicate: InvitationSection = {
          ...structuredClone(current(original)),
          id: `${original.id}-copy-${Date.now()}`,
          order: original.order + 1,
        };
        const idx = state.design.sections.findIndex((s) => s.id === sectionId);
        state.design.sections.splice(idx + 1, 0, duplicate);
        state.design.sections.forEach((s, i) => { s.order = i; });
        state.isDirty = true;
      });
    },

    updateTheme: (theme) => {
      set((state) => {
        if (!state.design) return;
        Object.assign(state.design.theme, theme);
        state.isDirty = true;
      });
    },

    updateLanguage: (language) => {
      set((state) => {
        if (!state.design) return;
        state.design.language = language;
        state.isDirty = true;
      });
    },

    updateMetadata: (key, value) => {
      set((state) => {
        if (!state.design) return;
        state.design.metadata = { ...state.design.metadata, [key]: value };
        state.isDirty = true;
      });
    },

    pushHistory: (label) => {
      const { design, history, historyIndex } = get();
      if (!design) return;
      const newEntry: EditorHistoryEntry = {
        design: structuredClone(design),
        timestamp: Date.now(),
        label,
      };
      set((state) => {
        // Discard any redo history ahead of current index
        const trimmed = history.slice(0, historyIndex + 1);
        const newHistory = [...trimmed, newEntry].slice(-MAX_HISTORY);
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      set((state) => {
        state.historyIndex = newIndex;
        state.design = structuredClone(history[newIndex].design);
        state.isDirty = true;
      });
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex >= history.length - 1) return;
      const newIndex = historyIndex + 1;
      set((state) => {
        state.historyIndex = newIndex;
        state.design = structuredClone(history[newIndex].design);
        state.isDirty = true;
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    markSaving: () => {
      set((state) => { state.isSaving = true; });
    },

    markSaved: () => {
      set((state) => {
        state.isSaving = false;
        state.isDirty = false;
        state.lastSavedAt = Date.now();
      });
    },

    markDirty: () => {
      set((state) => { state.isDirty = true; });
    },
  }))
);
