// ============================================================
// Nimantro — Cinematic invitation experience
// Tap-to-open cover (envelope / curtain / carved doors), background
// music, ambient particle effects. Wraps the InvitationRenderer.
// ============================================================

"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Music2, VolumeX } from "lucide-react";
import { buildThemeCssVariables } from "@nimantro/invitation-engine";
import type { InvitationDesignDocument } from "@nimantro/types";
import { resolveExperience, type Experience } from "@/lib/experience";
import { createInviteMusic, type InviteMusic } from "@/lib/invite-music";

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

const EASE = [0.65, 0, 0.35, 1] as const;
const SEAL_BG =
  "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--inv-secondary) 65%, #fff), var(--inv-secondary) 60%, color-mix(in srgb, var(--inv-secondary) 65%, #000))";

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

  const exp = resolveExperience(design);
  const rawMusic = design.metadata?.musicUrl?.trim() ?? "";
  const musicUrl = /^(https:\/\/|\/)/.test(rawMusic) ? rawMusic : ""; // only https or site-relative
  const hero = design.sections.find((s) => s.type === "hero");
  const artworkUrl =
    (typeof hero?.content.photoUrl === "string" && hero.content.photoUrl) ||
    (typeof hero?.content.artworkUrl === "string" ? hero.content.artworkUrl : "");
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

  const stopAll = React.useCallback(() => {
    synth.current?.stop();
    synth.current = null;
    audio.current?.pause();
  }, []);

  React.useEffect(() => stopAll, [stopAll]);

  const playMusic = React.useCallback(() => {
    if (musicUrl) {
      const wanted = new URL(musicUrl, window.location.href).href;
      if (audio.current?.src !== wanted) {
        audio.current?.pause();
        audio.current = Object.assign(new Audio(wanted), { loop: true, volume: 0.6 });
      }
      audio.current.play().catch(() => setPlaying(false));
    } else {
      synth.current ??= createInviteMusic(exp.music);
      synth.current.start();
    }
    setPlaying(true);
  }, [musicUrl, exp.music]);

  // Switch track live when the preset or custom URL changes while playing
  const playingRef = React.useRef(playing);
  playingRef.current = playing;
  React.useEffect(() => {
    if (!playingRef.current) return;
    stopAll();
    playMusic();
  }, [exp.music, musicUrl, stopAll, playMusic]);

  const pauseMusic = () => {
    stopAll();
    setPlaying(false);
  };

  const open = () => {
    if (phase !== "closed") return;
    playMusic(); // must run inside the tap: browsers block autoplay otherwise
    setPhase("opening");
    const ms = { envelope: 1900, curtain: 1700, doors: 1900 }[exp.opening];
    window.setTimeout(() => setPhase("open"), reduce ? 50 : ms);
  };

  const copy = {
    invited: locale === "bn" ? "সাদর আমন্ত্রণ" : "You are cordially invited",
    dear: guestName ? (locale === "bn" ? `প্রিয় ${guestName}` : `Dear ${guestName}`) : "",
    tap: locale === "bn" ? "আমন্ত্রণপত্র খুলুন" : "Open Invitation",
  };

  return (
    <div style={cssVars}>
      {children}

      {phase === "open" && !reduce && exp.effect !== "none" && <AmbientEffect kind={exp.effect} />}

      {phase === "open" && (
        <button
          type="button"
          onClick={playing ? pauseMusic : playMusic}
          aria-label={playing ? "Mute music" : "Play music"}
          className="no-print fixed bottom-32 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white/60 transition-transform hover:scale-105"
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
            style={{ backgroundColor: exp.opening === "envelope" ? "var(--inv-background)" : "transparent" }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
          >
            {exp.opening === "envelope" && (
              <EnvelopeCover
                phase={phase}
                reduce={reduce}
                artworkUrl={artworkUrl}
                title={title}
                names={names}
                copy={copy}
                onOpen={open}
              />
            )}
            {exp.opening === "curtain" && <CurtainPanels phase={phase} reduce={reduce} />}
            {exp.opening === "doors" && <DoorPanels phase={phase} reduce={reduce} />}
            {exp.opening !== "envelope" && (
              <CoverText phase={phase} title={title} names={names} copy={copy} onOpen={open} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Copy = { invited: string; dear: string; tap: string };

function EnvelopeCover(props: {
  phase: string;
  reduce: boolean;
  artworkUrl: string;
  title: string;
  names: string;
  copy: Copy;
  onOpen: () => void;
}) {
  const { phase, reduce } = props;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      {props.artworkUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.artworkUrl}
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
        {props.copy.invited}
      </motion.p>

      <motion.div
        className="relative w-[min(86vw,360px)] aspect-[3/2]"
        style={{ perspective: 900 }}
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {/* letter rising out */}
        <motion.div
          className="absolute inset-x-4 top-3 bottom-3 flex flex-col items-center justify-center rounded-md px-4 text-center shadow-md"
          style={{ backgroundColor: "var(--inv-surface)", border: "1px solid var(--inv-border)" }}
          animate={phase === "opening" ? { y: "-62%" } : { y: 0 }}
          transition={{ delay: reduce ? 0 : 0.55, duration: reduce ? 0 : 0.9, ease: EASE }}
        >
          <span className="text-lg" style={{ color: "var(--inv-primary)", fontFamily: "var(--inv-heading-font)" }}>
            {props.title}
          </span>
          <span className="mt-1 text-sm" style={{ color: "var(--inv-text)", fontFamily: "var(--inv-accent-font)" }}>
            {props.names}
          </span>
        </motion.div>
        {/* envelope pocket */}
        <div
          className="absolute inset-0 rounded-lg shadow-xl"
          style={{
            background: "linear-gradient(160deg, color-mix(in srgb, var(--inv-primary) 88%, #fff), var(--inv-primary))",
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
          transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
        />
        {/* wax seal */}
        <motion.button
          type="button"
          onClick={props.onOpen}
          aria-label={props.copy.tap}
          className="absolute left-1/2 top-[52%] z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-2xl shadow-lg"
          style={{ background: SEAL_BG, color: "var(--inv-primary)", fontFamily: "var(--inv-heading-font)" }}
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
        {props.copy.dear && (
          <p className="text-base" style={{ color: "var(--inv-text)", fontFamily: "var(--inv-accent-font)" }}>
            {props.copy.dear}
          </p>
        )}
        <button
          type="button"
          onClick={props.onOpen}
          className="rounded-full px-6 py-2.5 text-sm font-medium shadow-md transition-transform hover:scale-105"
          style={{ backgroundColor: "var(--inv-primary)", color: "var(--inv-background)" }}
        >
          {props.copy.tap} ♪
        </button>
      </motion.div>
    </div>
  );
}

function CurtainPanels({ phase, reduce }: { phase: string; reduce: boolean }) {
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <motion.div
          key={side}
          className="absolute top-0 h-full w-1/2"
          style={{
            [side]: 0,
            background:
              "repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 38px), linear-gradient(180deg, color-mix(in srgb, var(--inv-primary) 85%, #000), color-mix(in srgb, var(--inv-primary) 45%, #000))",
            boxShadow: "inset 0 -30px 60px rgba(0,0,0,.35)",
          }}
          animate={phase === "opening" ? { x: side === "left" ? "-100%" : "100%" } : { x: 0 }}
          transition={{ duration: reduce ? 0 : 1.6, ease: EASE }}
        >
          <div
            className="absolute bottom-0 h-6 w-full"
            style={{
              background: "repeating-linear-gradient(90deg, var(--inv-secondary) 0 6px, transparent 6px 12px)",
              opacity: 0.85,
            }}
          />
        </motion.div>
      ))}
    </>
  );
}

function DoorPanels({ phase, reduce }: { phase: string; reduce: boolean }) {
  return (
    <div className="absolute inset-0" style={{ perspective: 1400 }}>
      {(["left", "right"] as const).map((side) => (
        <motion.div
          key={side}
          className="absolute top-0 flex h-full w-1/2 flex-col gap-4 p-5 sm:p-8"
          style={{
            [side]: 0,
            transformOrigin: side === "left" ? "left center" : "right center",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--inv-primary) 70%, #3a1d0e), color-mix(in srgb, var(--inv-primary) 40%, #1a0c05))",
            boxShadow:
              side === "left" ? "inset -10px 0 30px rgba(0,0,0,.45)" : "inset 10px 0 30px rgba(0,0,0,.45)",
          }}
          animate={phase === "opening" ? { rotateY: side === "left" ? -105 : 105 } : { rotateY: 0 }}
          transition={{ duration: reduce ? 0 : 1.7, ease: EASE }}
        >
          {/* carved arch panels */}
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[999px] border-2"
              style={{
                borderColor: "color-mix(in srgb, var(--inv-secondary) 80%, transparent)",
                boxShadow:
                  "inset 0 0 0 6px rgba(0,0,0,.15), inset 0 0 0 8px color-mix(in srgb, var(--inv-secondary) 40%, transparent)",
                background:
                  "radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--inv-secondary) 25%, transparent) 0 18%, transparent 19%)",
              }}
            />
          ))}
          {/* door ring */}
          <span
            className="absolute top-[64%] h-8 w-8 rounded-full border-[3px]"
            style={{ [side === "left" ? "right" : "left"]: 14, borderColor: "var(--inv-secondary)" }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function CoverText(props: { phase: string; title: string; names: string; copy: Copy; onOpen: () => void }) {
  return (
    <motion.div
      className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
      animate={{ opacity: props.phase === "opening" ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      style={{ color: "#FFF8EC", textShadow: "0 2px 12px rgba(0,0,0,.45)" }}
    >
      <motion.p
        className="text-xs uppercase tracking-[0.35em]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {props.copy.invited}
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
      {props.copy.dear && <p className="text-sm opacity-90">{props.copy.dear}</p>}
      <motion.button
        type="button"
        onClick={props.onOpen}
        className="mt-4 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold shadow-xl"
        style={{ background: SEAL_BG, color: "#2A1410", textShadow: "none" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: [1, 1.06, 1] }}
        transition={{ delay: 1.1, scale: { repeat: Infinity, duration: 2, delay: 1.1 } }}
        aria-label={props.copy.tap}
      >
        ♪
      </motion.button>
      <p className="text-xs opacity-90">{props.copy.tap}</p>
    </motion.div>
  );
}

// ─── Ambient particles ────────────────────────────────────────

type Particle = React.CSSProperties & { cls: string; char?: string };
type EffectKind = Exclude<Experience["effect"], "none">;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function petal(i: number, colors: string[]): Particle {
  const size = rand(12, 22);
  const duration = rand(9, 17);
  return {
    cls: "fx-fall",
    left: `${rand(0, 100)}%`,
    width: size,
    height: size * 0.7,
    backgroundColor: colors[i % colors.length],
    borderRadius: "80% 0 80% 0",
    animationDuration: `${duration}s, ${duration / 3}s`,
    animationDelay: `-${rand(0, duration)}s, -${rand(0, 3)}s`,
  };
}

const FX: Record<EffectKind, (i: number) => Particle> = {
  marigold: (i) => petal(i, ["#F59E0B", "#F97316", "#FBBF24", "#EA580C", "var(--inv-secondary)"]),
  roses: (i) => petal(i, ["#BE123C", "#E11D48", "#FB7185", "#9F1239", "#FDA4AF"]),
  leaves: (i) => ({ ...petal(i, ["#6E8B5B", "#8AA66F", "#B5553C", "#D98E5F"]), borderRadius: "0 80% 0 80%" }),
  sparkles: () => ({
    cls: "fx-twinkle",
    char: "✦",
    left: `${rand(0, 100)}%`,
    top: `${rand(0, 100)}%`,
    fontSize: rand(8, 18),
    color: "var(--inv-secondary)",
    animationDuration: `${rand(2, 4)}s`,
    animationDelay: `-${rand(0, 4)}s`,
  }),
  fireflies: () => ({
    cls: "fx-firefly",
    left: `${rand(0, 100)}%`,
    top: `${rand(10, 95)}%`,
    animationDuration: `${rand(6, 12)}s, ${rand(1.5, 3)}s`,
    animationDelay: `-${rand(0, 5)}s, -${rand(0, 3)}s`,
  }),
  confetti: (i) =>
    i % 6 === 0
      ? {
          cls: "fx-rise fx-balloon",
          left: `${rand(5, 95)}%`,
          backgroundColor: ["#F43F5E", "#3B82F6", "#F59E0B", "#10B981"][i % 4],
          animationDuration: `${rand(12, 18)}s`,
          animationDelay: `-${rand(0, 12)}s`,
        }
      : {
          cls: "fx-fall",
          left: `${rand(0, 100)}%`,
          width: 7,
          height: 12,
          backgroundColor: ["#F43F5E", "#3B82F6", "#F59E0B", "#10B981", "#A855F7"][i % 5],
          animationDuration: `${rand(5, 9)}s, ${rand(1.5, 3)}s`,
          animationDelay: `-${rand(0, 9)}s, -${rand(0, 3)}s`,
        },
  diyas: () => ({
    cls: "fx-rise fx-diya",
    left: `${rand(5, 95)}%`,
    animationDuration: `${rand(14, 22)}s`,
    animationDelay: `-${rand(0, 14)}s`,
  }),
  bubbles: () => {
    const s = rand(14, 40);
    return {
      cls: "fx-rise fx-bubble",
      left: `${rand(0, 100)}%`,
      width: s,
      height: s,
      animationDuration: `${rand(10, 18)}s`,
      animationDelay: `-${rand(0, 10)}s`,
    };
  },
};

function AmbientEffect({ kind }: { kind: EffectKind }) {
  // Generated after the cover opens (client only), so random values are hydration-safe.
  const particles = React.useMemo(
    () => Array.from({ length: kind === "sparkles" ? 32 : 30 }, (_, i) => FX[kind](i)),
    [kind]
  );
  return (
    <div className="no-print pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {particles.map(({ cls, char, ...style }, i) => (
        <span key={i} className={`fx ${cls}`} style={style}>
          {char}
        </span>
      ))}
    </div>
  );
}
