// ============================================================
// Nimantro — Cinematic invitation experience
// Tap-to-open cover (envelope or curtain), background music,
// falling petals. Wraps the InvitationRenderer on guest pages.
// ============================================================

"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Music2, VolumeX } from "lucide-react";
import { buildThemeCssVariables } from "@nimantro/invitation-engine";
import type { InvitationDesignDocument } from "@nimantro/types";
import { getTemplateById } from "@/lib/templates";
import { createInviteMusic, type InviteMusic } from "@/lib/invite-music";

export type OpeningStyle = "envelope" | "curtain";

interface InvitationExperienceProps {
  design: InvitationDesignDocument;
  names: string;
  guestName?: string;
  locale: "bn" | "en";
  children: React.ReactNode;
}

function textOf(v: unknown, locale: "bn" | "en"): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as { bn?: string; en?: string };
    return o[locale] || o.en || o.bn || "";
  }
  return "";
}

export function resolveOpening(design: InvitationDesignDocument): OpeningStyle {
  const chosen = design.metadata?.opening;
  if (chosen === "envelope" || chosen === "curtain") return chosen;
  const category = getTemplateById(design.templateId)?.category;
  return category === "luxury" || category === "royal" ? "curtain" : "envelope";
}

export function InvitationExperience({
  design,
  names,
  guestName,
  locale,
  children,
}: InvitationExperienceProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = React.useState<"closed" | "opening" | "open">("closed");
  const [playing, setPlaying] = React.useState(false);
  const synth = React.useRef<InviteMusic | null>(null);
  const audio = React.useRef<HTMLAudioElement | null>(null);

  const opening = resolveOpening(design);
  const rawMusic = design.metadata?.musicUrl?.trim() ?? "";
  const musicUrl = /^(https:\/\/|\/)/.test(rawMusic) ? rawMusic : ""; // only https or site-relative
  const hero = design.sections.find((s) => s.type === "hero");
  const artworkUrl = typeof hero?.content.artworkUrl === "string" ? hero.content.artworkUrl : "";
  const title = textOf(hero?.content.title, locale);
  const cssVars = React.useMemo(
    () => buildThemeCssVariables(design.theme) as React.CSSProperties,
    [design.theme]
  );

  // Lock page scroll while the cover is shown
  React.useEffect(() => {
    if (phase === "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  React.useEffect(
    () => () => {
      synth.current?.stop();
      audio.current?.pause();
    },
    []
  );

  const playMusic = React.useCallback(() => {
    if (musicUrl) {
      audio.current ??= Object.assign(new Audio(musicUrl), { loop: true, volume: 0.6 });
      audio.current.play().catch(() => setPlaying(false));
    } else {
      synth.current ??= createInviteMusic();
      synth.current.start();
    }
    setPlaying(true);
  }, [musicUrl]);

  const pauseMusic = () => {
    if (musicUrl) audio.current?.pause();
    else {
      synth.current?.stop();
      synth.current = null;
    }
    setPlaying(false);
  };

  const open = () => {
    if (phase !== "closed") return;
    playMusic(); // must run inside the tap: browsers block autoplay otherwise
    setPhase("opening");
    window.setTimeout(() => setPhase("open"), reduce ? 50 : opening === "curtain" ? 1700 : 1900);
  };

  const invited = locale === "bn" ? "সাদর আমন্ত্রণ" : "You are cordially invited";
  const dear = guestName ? (locale === "bn" ? `প্রিয় ${guestName}` : `Dear ${guestName}`) : "";
  const tapLabel = locale === "bn" ? "আমন্ত্রণপত্র খুলুন" : "Open Invitation";
  const ease = [0.65, 0, 0.35, 1] as const;

  return (
    <div style={cssVars}>
      {children}

      {phase === "open" && !reduce && <PetalRain />}

      {phase === "open" && (
        <button
          type="button"
          onClick={playing ? pauseMusic : playMusic}
          aria-label={playing ? "Mute music" : "Play music"}
          className="no-print fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white/60 transition-transform hover:scale-105"
          style={{ backgroundColor: "var(--inv-primary)", color: "var(--inv-background)" }}
        >
          {playing ? <Music2 className="h-5 w-5 inv-pulse" /> : <VolumeX className="h-5 w-5" />}
        </button>
      )}

      <AnimatePresence>
        {phase !== "open" && (
          <motion.div
            key="cover"
            className="no-print fixed inset-0 z-50 overflow-hidden"
            style={{ backgroundColor: opening === "curtain" ? "transparent" : "var(--inv-background)" }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: reduce ? 0 : 0.7, ease }}
          >
            {opening === "curtain" ? (
              <>
                {(["left", "right"] as const).map((side) => (
                  <motion.div
                    key={side}
                    className="absolute top-0 h-full w-1/2"
                    style={{
                      [side]: 0,
                      background:
                        "repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 38px), linear-gradient(180deg, var(--inv-primary), color-mix(in srgb, var(--inv-primary) 55%, #000))",
                      boxShadow: "inset 0 -30px 60px rgba(0,0,0,.35)",
                    }}
                    animate={phase === "opening" ? { x: side === "left" ? "-100%" : "100%" } : { x: 0 }}
                    transition={{ duration: reduce ? 0 : 1.6, ease }}
                  >
                    <div
                      className="absolute bottom-0 h-6 w-full"
                      style={{
                        background:
                          "repeating-linear-gradient(90deg, var(--inv-secondary) 0 6px, transparent 6px 12px)",
                        opacity: 0.85,
                      }}
                    />
                  </motion.div>
                ))}
                <CoverText
                  phase={phase}
                  invited={invited}
                  title={title}
                  names={names}
                  dear={dear}
                  tapLabel={tapLabel}
                  onOpen={open}
                  light
                />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
                {artworkUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artworkUrl}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 blur-sm"
                  />
                )}
                <motion.p
                  className="relative text-sm uppercase tracking-[0.3em]"
                  style={{ color: "var(--inv-secondary)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  {invited}
                </motion.p>

                {/* Envelope */}
                <motion.div
                  className="relative w-[min(86vw,360px)] aspect-[3/2]"
                  style={{ perspective: 900 }}
                  initial={{ opacity: 0, y: 30, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.9, ease }}
                >
                  {/* letter rising out */}
                  <motion.div
                    className="absolute inset-x-4 top-3 bottom-3 flex flex-col items-center justify-center rounded-md px-4 text-center shadow-md"
                    style={{ backgroundColor: "var(--inv-surface)", border: "1px solid var(--inv-border)" }}
                    animate={phase === "opening" ? { y: "-62%" } : { y: 0 }}
                    transition={{ delay: reduce ? 0 : 0.55, duration: reduce ? 0 : 0.9, ease }}
                  >
                    <span className="text-lg" style={{ color: "var(--inv-primary)", fontFamily: "var(--inv-heading-font)" }}>
                      {title}
                    </span>
                    <span className="mt-1 text-sm" style={{ color: "var(--inv-text)", fontFamily: "var(--inv-accent-font)" }}>
                      {names}
                    </span>
                  </motion.div>
                  {/* envelope body (front pocket) */}
                  <div
                    className="absolute inset-0 rounded-lg shadow-xl"
                    style={{
                      background:
                        "linear-gradient(160deg, color-mix(in srgb, var(--inv-primary) 88%, #fff), var(--inv-primary))",
                      clipPath: "polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%)",
                    }}
                  />
                  {/* flap */}
                  <motion.div
                    className="absolute inset-x-0 top-0 h-[58%] origin-top"
                    style={{
                      background: "color-mix(in srgb, var(--inv-primary) 80%, #000)",
                      clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                      backfaceVisibility: "hidden",
                      zIndex: phase === "opening" ? 0 : 2,
                    }}
                    animate={phase === "opening" ? { rotateX: 180 } : { rotateX: 0 }}
                    transition={{ duration: reduce ? 0 : 0.6, ease }}
                  />
                  {/* wax seal */}
                  <motion.button
                    type="button"
                    onClick={open}
                    aria-label={tapLabel}
                    className="absolute left-1/2 top-[52%] z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-2xl shadow-lg"
                    style={{
                      background:
                        "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--inv-secondary) 70%, #fff), var(--inv-secondary) 60%, color-mix(in srgb, var(--inv-secondary) 70%, #000))",
                      color: "var(--inv-primary)",
                      fontFamily: "var(--inv-heading-font)",
                    }}
                    animate={phase === "opening" ? { scale: 0, opacity: 0 } : { scale: [1, 1.07, 1] }}
                    transition={phase === "opening" ? { duration: 0.3 } : { repeat: Infinity, duration: 2 }}
                  >
                    ✦
                  </motion.button>
                </motion.div>

                <motion.div
                  className="relative space-y-3 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase === "opening" ? 0 : 1 }}
                  transition={{ delay: phase === "opening" ? 0 : 0.6, duration: 0.6 }}
                >
                  {dear && (
                    <p className="text-base" style={{ color: "var(--inv-text)", fontFamily: "var(--inv-accent-font)" }}>
                      {dear}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={open}
                    className="rounded-full px-6 py-2.5 text-sm font-medium shadow-md transition-transform hover:scale-105"
                    style={{ backgroundColor: "var(--inv-primary)", color: "var(--inv-background)" }}
                  >
                    {tapLabel} ♪
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CoverText(props: {
  phase: string;
  invited: string;
  title: string;
  names: string;
  dear: string;
  tapLabel: string;
  onOpen: () => void;
  light?: boolean;
}) {
  return (
    <motion.div
      className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
      animate={{ opacity: props.phase === "opening" ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      style={{ color: "#FFF8EC" }}
    >
      <motion.p
        className="text-xs uppercase tracking-[0.35em] opacity-80"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.85, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {props.invited}
      </motion.p>
      <motion.h1
        className="inv-shimmer text-4xl sm:text-5xl"
        style={{ fontFamily: "var(--inv-heading-font)" }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
      >
        {props.title}
      </motion.h1>
      <motion.p
        className="text-xl sm:text-2xl"
        style={{ fontFamily: "var(--inv-accent-font)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        {props.names}
      </motion.p>
      {props.dear && <p className="text-sm opacity-80">{props.dear}</p>}
      <motion.button
        type="button"
        onClick={props.onOpen}
        className="mt-4 flex h-20 w-20 items-center justify-center rounded-full text-sm font-semibold shadow-xl"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--inv-secondary) 70%, #fff), var(--inv-secondary) 60%, color-mix(in srgb, var(--inv-secondary) 70%, #000))",
          color: "#2A1410",
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: [1, 1.06, 1] }}
        transition={{ delay: 1.1, scale: { repeat: Infinity, duration: 2, delay: 1.1 } }}
        aria-label={props.tapLabel}
      >
        ♪
      </motion.button>
      <p className="text-xs opacity-80">{props.tapLabel}</p>
    </motion.div>
  );
}

const PETAL_COLORS = ["#F59E0B", "#F97316", "#FBBF24", "#EA580C", "var(--inv-secondary)"];

function PetalRain() {
  // Generated after mount only (phase === "open"), so random values are hydration-safe.
  const petals = React.useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.random() * 100,
        size: 8 + Math.random() * 8,
        duration: 9 + Math.random() * 8,
        delay: Math.random() * 10,
        color: PETAL_COLORS[i % PETAL_COLORS.length],
      })),
    []
  );
  return (
    <div className="no-print pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="inv-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.7,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s, ${p.duration / 3}s`,
            animationDelay: `${p.delay}s, ${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
