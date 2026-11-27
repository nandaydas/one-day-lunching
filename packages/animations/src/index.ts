// ============================================================
// Nimantro — Motion Animation Presets
// packages/animations/src/index.ts
// ============================================================

import type { AnimationPreset, SectionAnimation } from "@nimantro/types";

export interface MotionVariantConfig {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  transition: {
    duration: number;
    delay?: number;
    ease?: number[] | string;
  };
}

export interface AnimationPresetMeta {
  id: AnimationPreset;
  label: { bn: string; en: string };
  description: string;
}

export const ANIMATION_PRESET_CATALOG: AnimationPresetMeta[] = [
  { id: "none", label: { bn: "কোনটি নয়", en: "None" }, description: "Static display without motion" },
  { id: "fade-in", label: { bn: "ফেড ইন", en: "Fade in" }, description: "Gentle opacity reveal" },
  { id: "fade-up", label: { bn: "উপরে ভেসে ওঠা", en: "Fade up" }, description: "Warm upward entrance" },
  { id: "slide-in", label: { bn: "স্লাইড ইন", en: "Slide in" }, description: "Soft horizontal glide" },
  { id: "scale-reveal", label: { bn: "স্কেল রিভিল", en: "Scale reveal" }, description: "Subtle focal expansion" },
  { id: "envelope-open", label: { bn: "খাম খোলা", en: "Envelope reveal" }, description: "Ceremonial card unfold" },
  { id: "floral-reveal", label: { bn: "পুষ্প উন্মোচন", en: "Floral reveal" }, description: "Delicate botanical bloom" },
  { id: "text-stagger", label: { bn: "ধাপে লেখা", en: "Text stagger" }, description: "Sequential typography cadence" },
  { id: "scroll-reveal", label: { bn: "স্ক্রল রিভিল", en: "Scroll reveal" }, description: "Reveals as guest scrolls" },
  { id: "countdown-transition", label: { bn: "কাউন্টডাউন", en: "Countdown pulse" }, description: "Smooth clock reveal" },
  { id: "gallery-transition", label: { bn: "গ্যালারি মোশন", en: "Gallery transition" }, description: "Crisp photo reveal" },
];

const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const PRESET_CONFIGS: Record<AnimationPreset, MotionVariantConfig> = {
  none: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    transition: { duration: 0 },
  },
  "fade-in": {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: LUXURY_EASE },
  },
  "fade-up": {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: LUXURY_EASE },
  },
  "slide-in": {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.55, ease: LUXURY_EASE },
  },
  "scale-reveal": {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: LUXURY_EASE },
  },
  "envelope-open": {
    initial: { opacity: 0, y: 32, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.85, ease: LUXURY_EASE },
  },
  "floral-reveal": {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.8, ease: LUXURY_EASE },
  },
  "text-stagger": {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: LUXURY_EASE },
  },
  "scroll-reveal": {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: LUXURY_EASE },
  },
  "countdown-transition": {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: LUXURY_EASE },
  },
  "gallery-transition": {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.55, ease: LUXURY_EASE },
  },
};

/**
 * Returns Motion-compatible initial/whileInView/transition props
 * while respecting user reduced-motion preferences and section overrides.
 */
export function getSectionMotionConfig(
  animation: SectionAnimation | undefined,
  prefersReducedMotion = false
): MotionVariantConfig {
  if (!animation || animation.disabled || prefersReducedMotion || animation.preset === "none") {
    return PRESET_CONFIGS.none;
  }

  const base = PRESET_CONFIGS[animation.preset] ?? PRESET_CONFIGS["fade-up"];
  return {
    initial: base.initial,
    animate: base.animate,
    transition: {
      ...base.transition,
      duration: animation.duration ? animation.duration / 1000 : base.transition.duration,
      delay: animation.delay ? animation.delay / 1000 : 0,
    },
  };
}
