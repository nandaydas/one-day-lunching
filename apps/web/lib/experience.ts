// Resolves an invitation's guest experience: template defaults, overridden by
// the host's choices saved in designDocument.metadata.
import type { TemplateExperience } from "@nimantro/template-schema";
import type { InvitationDesignDocument } from "@nimantro/types";
import { getTemplateById } from "./templates";

export type Experience = TemplateExperience;

const OPTIONS: { [K in keyof Experience]: readonly Experience[K][] } = {
  opening: ["envelope", "curtain", "doors"],
  effect: ["marigold", "roses", "sparkles", "fireflies", "confetti", "leaves", "diyas", "bubbles", "none"],
  music: ["shehnai", "sitar", "flute", "musicbox", "piano", "dhol"],
  pattern: ["none", "alpona", "damask", "buti", "stars", "kantha", "floral", "dots"],
  frame: ["simple", "ornate", "stitched", "glow"],
};

export const EXPERIENCE_OPTIONS = OPTIONS;

export function resolveExperience(design: InvitationDesignDocument): Experience {
  const template = getTemplateById(design.templateId);
  const base: Experience = template?.experience ?? {
    opening: template?.category === "royal" || template?.category === "luxury" ? "curtain" : "envelope",
    effect: "marigold",
    music: "shehnai",
    pattern: "none",
    frame: "simple",
  };
  const meta = design.metadata ?? {};
  const pick = <K extends keyof Experience>(key: K): Experience[K] =>
    (OPTIONS[key] as readonly string[]).includes(meta[key] ?? "") ? (meta[key] as Experience[K]) : base[key];

  return {
    opening: pick("opening"),
    effect: pick("effect"),
    music: pick("music"),
    pattern: pick("pattern"),
    frame: pick("frame"),
  };
}
