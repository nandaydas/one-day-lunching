// ============================================================
// Nimantro — Invitation Renderer Component
// apps/web/components/invitation/InvitationRenderer.tsx
// ============================================================

"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion, type MotionStyle } from "motion/react";
import {
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  MailCheck,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { getSectionMotionConfig } from "@nimantro/animations";
import { formatEventDate, getBangabdaYearLabel } from "@nimantro/i18n";
import {
  buildThemeCssVariables,
  getOrderedEnabledSections,
  resolveSectionText,
} from "@nimantro/invitation-engine";
import type {
  EventVenue,
  InvitationDesignDocument,
  InvitationSection,
  SectionType,
} from "@nimantro/types";
import { AlponaCrest, AlponaDivider } from "./AlponaMotif";
import { CountdownDisplay } from "./CountdownDisplay";
import { resolveExperience } from "@/lib/experience";

export interface PublicEventMeta {
  title?: string;
  startAt?: string | null;
  endAt?: string | null;
  timezone?: string;
  venue?: EventVenue | null;
  hostNames?: string[];
  sessions?: {
    id: string;
    title: string;
    description?: string | null;
    startAt?: string | null;
    venue?: { name: string; address: string } | null;
  }[];
}

export interface InvitationRendererProps {
  design: InvitationDesignDocument;
  eventMeta?: PublicEventMeta;
  locale?: "bn" | "en";
  onLocaleChange?: (locale: "bn" | "en") => void;
  interactive?: boolean;
  activeSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  rsvpSlot?: React.ReactNode;
  showLanguageToggle?: boolean;
  className?: string;
}

interface SectionRenderContext {
  section: InvitationSection;
  locale: "bn" | "en";
  eventMeta?: PublicEventMeta;
  rsvpSlot?: React.ReactNode;
}

function resolveText(
  content: InvitationSection["content"],
  key: string,
  locale: "bn" | "en"
): string {
  return resolveSectionText(content[key], locale);
}

function HeroSection({ section, locale, eventMeta }: SectionRenderContext) {
  const { content } = section;
  const title = resolveText(content, "title", locale);
  const subtitle = resolveText(content, "subtitle", locale);
  const artworkUrl = typeof content.artworkUrl === "string" ? content.artworkUrl : "";
  const photoUrl = typeof content.photoUrl === "string" ? content.photoUrl : "";
  const brideName = resolveText(content, "brideName", locale);
  const groomName = resolveText(content, "groomName", locale);
  const primaryNames =
    resolveText(content, "primaryNames", locale) ||
    (brideName && groomName
      ? `${brideName} ${locale === "bn" ? "ও" : "&"} ${groomName}`
      : eventMeta?.title ?? "");

  const dateLabel =
    resolveText(content, "dateLabel", locale) ||
    (eventMeta?.startAt
      ? formatEventDate(eventMeta.startAt, locale, eventMeta.timezone ?? "Asia/Kolkata")
      : "");

  const bangabda =
    locale === "bn" && eventMeta?.startAt
      ? getBangabdaYearLabel(eventMeta.startAt)
      : "";

  return (
    <div className="py-6 sm:py-10 space-y-5">
      <AlponaCrest className="w-32 h-10 mx-auto" />
      {photoUrl ? (
        <div
          className="relative mx-auto w-[min(70%,260px)] aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-2xl border-4 shadow-xl inv-float"
          style={{ borderColor: "var(--inv-secondary)" }}
        >
          <Image
            src={photoUrl}
            alt={primaryNames || "Couple photo"}
            fill
            unoptimized
            sizes="260px"
            className="object-cover inv-kenburns"
          />
        </div>
      ) : artworkUrl && (
        <div className="relative mx-auto w-full max-w-[300px] aspect-[4/3] inv-kenburns">
          <Image
            src={artworkUrl}
            alt={primaryNames || title || "Celebration artwork"}
            fill
            unoptimized
            sizes="300px"
            className="object-contain"
            style={{
              maskImage: "radial-gradient(closest-side, #000 70%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(closest-side, #000 70%, transparent 100%)",
            }}
          />
        </div>
      )}
      {subtitle && (
        <p
          className="text-sm sm:text-base tracking-wide font-medium"
          style={{ color: "var(--inv-secondary)" }}
        >
          {subtitle}
        </p>
      )}
      {title && (
        <h1
          className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight inv-shimmer-ink"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {title}
        </h1>
      )}
      {primaryNames && (
        <p
          className="text-2xl sm:text-3xl font-semibold pt-2"
          style={{
            color: "var(--inv-text)",
            fontFamily: "var(--inv-accent-font)",
          }}
        >
          {/* word-by-word reveal; words (not letters) keep Bengali conjuncts intact */}
          {primaryNames.split(" ").map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              className="inline-block"
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.18, duration: 0.7 }}
            >
              {word}&nbsp;
            </motion.span>
          ))}
        </p>
      )}
      {(dateLabel || bangabda) && (
        <div
          className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-xs sm:text-sm font-medium mt-2"
          style={{
            borderColor: "var(--inv-border)",
            backgroundColor: "var(--inv-surface)",
            color: "var(--inv-muted)",
          }}
        >
          <Calendar className="h-3.5 w-3.5" style={{ color: "var(--inv-primary)" }} aria-hidden="true" />
          {dateLabel && <span>{dateLabel}</span>}
          {bangabda && <span>· {bangabda}</span>}
        </div>
      )}
      <AlponaDivider />
    </div>
  );
}

function OrnateCorners() {
  const corner = (
    <svg viewBox="0 0 60 60" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 56V20Q4 4 20 4h36" />
      <path d="M12 56V26q0-14 14-14h30" opacity=".6" />
      <path d="M20 20c6-8 14-6 14 0s-8 8-14 0z" fill="currentColor" opacity=".8" />
      <circle cx="8" cy="8" r="3" fill="currentColor" />
    </svg>
  );
  return (
    <div className="pointer-events-none absolute inset-0" style={{ color: "var(--inv-secondary)", zIndex: 2 }} aria-hidden="true">
      <div className="absolute left-2 top-3">{corner}</div>
      <div className="absolute right-2 top-3 -scale-x-100">{corner}</div>
      <div className="absolute bottom-2 left-2 -scale-y-100">{corner}</div>
      <div className="absolute bottom-2 right-2 -scale-x-100 -scale-y-100">{corner}</div>
    </div>
  );
}

function WelcomeSection({ section, locale }: SectionRenderContext) {
  const heading = resolveText(section.content, "heading", locale);
  const message = resolveText(section.content, "message", locale);

  return (
    <div className="space-y-3 max-w-xl mx-auto">
      {heading && (
        <h2
          className="text-xl sm:text-2xl font-semibold"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {heading}
        </h2>
      )}
      {message && (
        <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--inv-text)" }}>
          {message}
        </p>
      )}
    </div>
  );
}

function FamilySection({ section, locale }: SectionRenderContext) {
  const heading =
    resolveText(section.content, "heading", locale) ||
    (locale === "bn" ? "নিমন্ত্রণকর্তা" : "Hosted With Love By");
  const brideFamily = resolveText(section.content, "brideFamily", locale);
  const groomFamily = resolveText(section.content, "groomFamily", locale);

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--inv-secondary)" }}>
        <Users className="h-4 w-4" aria-hidden="true" />
        <span>{heading}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {brideFamily && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: "var(--inv-surface)",
              borderColor: "var(--inv-border)",
            }}
          >
            <p className="text-sm sm:text-base font-medium leading-relaxed">{brideFamily}</p>
          </div>
        )}
        {groomFamily && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: "var(--inv-surface)",
              borderColor: "var(--inv-border)",
            }}
          >
            <p className="text-sm sm:text-base font-medium leading-relaxed">{groomFamily}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StorySection({ section, locale }: SectionRenderContext) {
  const { content } = section;
  const heading = resolveText(content, "heading", locale);
  const narrative = resolveText(content, "narrative", locale);
  const storyType =
    typeof content.storyType === "string" ? content.storyType : "couple-journey";
  const quote = resolveText(content, "quote", locale);
  const attribution = resolveText(content, "attribution", locale);

  const chapters = [1, 2, 3]
    .map((idx) => ({
      id: idx,
      tag: resolveText(content, `chapter${idx}Tag`, locale),
      title: resolveText(content, `chapter${idx}Title`, locale),
      detail: resolveText(content, `chapter${idx}Detail`, locale),
    }))
    .filter((ch) => ch.tag || ch.title || ch.detail);

  if (storyType === "tribute-quote" || storyType === "family-chronicle") {
    return (
      <div
        className="rounded-xl border p-6 sm:p-8 max-w-2xl mx-auto space-y-4"
        style={{
          backgroundColor: "var(--inv-surface)",
          borderColor: "var(--inv-border)",
        }}
      >
        <div className="inline-flex items-center justify-center gap-2 text-xs font-medium" style={{ color: "var(--inv-secondary)" }}>
          <BookOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {heading && (
            <h2
              className="text-xl font-medium"
              style={{
                color: "var(--inv-primary)",
                fontFamily: "var(--inv-heading-font)",
              }}
            >
              {heading}
            </h2>
          )}
        </div>
        {narrative && (
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--inv-muted)" }}>
            {narrative}
          </p>
        )}
        {quote && (
          <blockquote
            className="border-l-2 pl-4 py-1 text-left text-base sm:text-lg leading-relaxed"
            style={{
              borderColor: "var(--inv-secondary)",
              color: "var(--inv-text)",
              fontFamily: "var(--inv-heading-font)",
            }}
          >
            &ldquo;{quote}&rdquo;
            {attribution && (
              <footer className="mt-2 text-xs font-sans" style={{ color: "var(--inv-muted)" }}>
                — {attribution}
              </footer>
            )}
          </blockquote>
        )}
      </div>
    );
  }

  if (storyType === "milestone-chapters" && chapters.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="space-y-2">
          {heading && (
            <h2
              className="text-xl sm:text-2xl font-medium"
              style={{
                color: "var(--inv-primary)",
                fontFamily: "var(--inv-heading-font)",
              }}
            >
              {heading}
            </h2>
          )}
          {narrative && (
            <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: "var(--inv-muted)" }}>
              {narrative}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {chapters.map((ch) => (
            <div
              key={ch.id}
              className="rounded-xl border p-4 space-y-2"
              style={{
                backgroundColor: "var(--inv-surface)",
                borderColor: "var(--inv-border)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xl font-medium tabular-nums"
                  style={{
                    color: "var(--inv-primary)",
                    fontFamily: "var(--inv-heading-font)",
                  }}
                >
                  0{ch.id}
                </span>
                {ch.tag && (
                  <span className="text-[11px] font-medium" style={{ color: "var(--inv-secondary)" }}>
                    {ch.tag}
                  </span>
                )}
              </div>
              {ch.title && (
                <h3 className="text-sm font-medium" style={{ color: "var(--inv-text)" }}>
                  {ch.title}
                </h3>
              )}
              {ch.detail && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--inv-muted)" }}>
                  {ch.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (storyType === "ritual-heritage" && chapters.length > 0) {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <div className="space-y-2">
          <BookOpen className="h-4 w-4 mx-auto" strokeWidth={1.5} style={{ color: "var(--inv-secondary)" }} aria-hidden="true" />
          {heading && (
            <h2
              className="text-xl sm:text-2xl font-medium"
              style={{
                color: "var(--inv-primary)",
                fontFamily: "var(--inv-heading-font)",
              }}
            >
              {heading}
            </h2>
          )}
          {narrative && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--inv-muted)" }}>
              {narrative}
            </p>
          )}
        </div>
        <div className="space-y-3 text-left">
          {chapters.map((ch) => (
            <div
              key={ch.id}
              className="flex overflow-hidden rounded-xl border"
              style={{
                backgroundColor: "var(--inv-surface)",
                borderColor: "var(--inv-border)",
              }}
            >
              <div className="w-1 shrink-0" style={{ backgroundColor: "var(--inv-secondary)" }} aria-hidden="true" />
              <div className="p-4 space-y-1">
                {ch.tag && (
                  <p className="text-[11px] font-medium" style={{ color: "var(--inv-primary)" }}>
                    {ch.tag}
                  </p>
                )}
                {ch.title && (
                  <h3 className="text-sm font-medium" style={{ color: "var(--inv-text)" }}>
                    {ch.title}
                  </h3>
                )}
                {ch.detail && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--inv-muted)" }}>
                    {ch.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-6 max-w-xl mx-auto space-y-4"
      style={{
        backgroundColor: "var(--inv-surface)",
        borderColor: "var(--inv-border)",
      }}
    >
      <Heart className="h-4 w-4 mx-auto" strokeWidth={1.5} style={{ color: "var(--inv-primary)" }} aria-hidden="true" />
      {heading && (
        <h2
          className="text-xl font-medium"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {heading}
        </h2>
      )}
      {narrative && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--inv-muted)" }}>
          {narrative}
        </p>
      )}
      {chapters.length > 0 && (
        <div className="space-y-3 border-l pl-4 pt-1 text-left" style={{ borderColor: "var(--inv-border)" }}>
          {chapters.map((ch) => (
            <div key={ch.id} className="space-y-0.5">
              {ch.tag && (
                <p className="text-[11px] font-medium" style={{ color: "var(--inv-secondary)" }}>
                  {ch.tag}
                </p>
              )}
              {ch.title && (
                <p className="text-sm font-medium" style={{ color: "var(--inv-text)" }}>
                  {ch.title}
                </p>
              )}
              {ch.detail && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--inv-muted)" }}>
                  {ch.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CountdownSection({ section, locale, eventMeta }: SectionRenderContext) {
  const label = resolveText(section.content, "label", locale);
  const targetDate =
    resolveText(section.content, "targetDate", locale) || eventMeta?.startAt || null;

  return (
    <div className="space-y-2">
      {label && (
        <h2
          className="text-lg sm:text-xl font-semibold"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {label}
        </h2>
      )}
      <CountdownDisplay targetDate={targetDate} locale={locale} />
    </div>
  );
}

function ScheduleSection({ section, locale, eventMeta }: SectionRenderContext) {
  const heading = resolveText(section.content, "heading", locale);
  const items: { title: string; time: string }[] = [];

  for (const idx of [1, 2, 3, 4]) {
    const title = resolveText(section.content, `item${idx}Title`, locale);
    const time = resolveText(section.content, `item${idx}Time`, locale);
    if (title || time) {
      items.push({ title, time });
    }
  }

  const sessions = eventMeta?.sessions ?? [];

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {heading && (
        <h2
          className="text-xl sm:text-2xl font-semibold"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {heading}
        </h2>
      )}
      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border p-4 text-left"
            style={{
              backgroundColor: "var(--inv-surface)",
              borderColor: "var(--inv-border)",
            }}
          >
            <div>
              <p className="font-semibold text-base">{s.title}</p>
              {s.description && (
                <p className="text-xs mt-0.5" style={{ color: "var(--inv-muted)" }}>
                  {s.description}
                </p>
              )}
            </div>
            {s.startAt && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0"
                style={{ color: "var(--inv-primary)" }}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatEventDate(s.startAt, locale, eventMeta?.timezone ?? "Asia/Kolkata")}
              </span>
            )}
          </div>
        ))}
        {items.map((item, idx) => (
          <div
            key={`${item.title}-${idx}`}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-xl border p-4 text-left"
            style={{
              backgroundColor: "var(--inv-surface)",
              borderColor: "var(--inv-border)",
            }}
          >
            <span className="font-semibold text-sm sm:text-base">{item.title}</span>
            {item.time && (
              <span
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                style={{ color: "var(--inv-primary)" }}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {item.time}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VenueSection({ section, locale, eventMeta }: SectionRenderContext) {
  const heading = resolveText(section.content, "heading", locale);
  const venueName =
    resolveText(section.content, "venueName", locale) || eventMeta?.venue?.name || "";
  const address =
    resolveText(section.content, "address", locale) || eventMeta?.venue?.address || "";
  const mapsUrl =
    resolveText(section.content, "mapsUrl", locale) || eventMeta?.venue?.mapsUrl || "";

  return (
    <div
      className="rounded-2xl border p-6 max-w-xl mx-auto space-y-3"
      style={{
        backgroundColor: "var(--inv-surface)",
        borderColor: "var(--inv-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full mx-auto flex items-center justify-center"
        style={{ backgroundColor: "color-mix(in srgb, var(--inv-primary) 12%, transparent)" }}
      >
        <MapPin className="h-5 w-5" style={{ color: "var(--inv-primary)" }} aria-hidden="true" />
      </div>
      {heading && (
        <h2
          className="text-xl font-semibold"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {heading}
        </h2>
      )}
      {venueName && <p className="font-semibold text-base sm:text-lg">{venueName}</p>}
      {address && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--inv-muted)" }}>
          {address}
        </p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-85"
          style={{
            borderColor: "var(--inv-primary)",
            color: "var(--inv-primary)",
          }}
        >
          <span>{locale === "bn" ? "ম্যাপে দেখুন" : "Open in Maps"}</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function GallerySection({ section, locale }: SectionRenderContext) {
  const heading = resolveText(section.content, "heading", locale);
  const caption = resolveText(section.content, "caption", locale);
  const images = Array.isArray(section.content.images)
    ? section.content.images.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  const [open, setOpen] = React.useState<number | null>(null);
  const tilt = [-3, 2, -1.5, 3, -2, 1.5];

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {heading && (
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--inv-primary)", fontFamily: "var(--inv-heading-font)" }}
        >
          {heading}
        </h2>
      )}
      {caption && (
        <p className="text-sm" style={{ color: "var(--inv-muted)" }}>
          {caption}
        </p>
      )}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 px-1">
          {images.map((src, idx) => (
            <motion.button
              type="button"
              key={`${src}-${idx}`}
              onClick={() => setOpen(idx)}
              className={`relative rounded-sm bg-white p-2 pb-6 shadow-lg ${
                images.length % 2 === 1 && idx === 0 ? "col-span-2" : ""
              }`}
              style={{ rotate: tilt[idx % tilt.length] }}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (idx % 4) * 0.12, duration: 0.6 }}
              aria-label={`Open photo ${idx + 1}`}
            >
              <span
                className={`relative block w-full overflow-hidden ${
                  images.length % 2 === 1 && idx === 0 ? "aspect-[16/10]" : "aspect-[4/5]"
                }`}
              >
                <Image src={src} alt={`${heading || "Gallery"} ${idx + 1}`} fill unoptimized className="object-cover" />
              </span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed p-6 text-xs"
          style={{ borderColor: "var(--inv-border)", color: "var(--inv-muted)" }}
        >
          {locale === "bn"
            ? "এডিটরে ছবি আপলোড করুন — অতিথিরা খালি গ্যালারি দেখবেন না"
            : "Upload photos in the editor — guests won't see an empty gallery"}
        </div>
      )}

      {open !== null && (
        <div
          className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-label="Photo viewer"
        >
          <motion.div
            key={open}
            className="relative h-[80vh] w-full max-w-3xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <Image src={images[open]} alt={`Photo ${open + 1}`} fill unoptimized className="object-contain" />
          </motion.div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-2xl text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + images.length) % images.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-2 text-2xl text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % images.length);
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RsvpSection({ section, locale, rsvpSlot }: SectionRenderContext) {
  const heading = resolveText(section.content, "heading", locale);
  const description = resolveText(section.content, "description", locale);

  return (
    <div
      id="rsvp-section"
      className="rounded-xl border p-6 max-w-xl mx-auto space-y-4"
      style={{
        backgroundColor: "var(--inv-surface)",
        borderColor: "var(--inv-border)",
      }}
    >
      <MailCheck className="h-5 w-5 mx-auto" strokeWidth={1.5} style={{ color: "var(--inv-secondary)" }} aria-hidden="true" />
      {heading && (
        <h2
          className="text-xl sm:text-2xl font-medium"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {heading}
        </h2>
      )}
      {description && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--inv-muted)" }}>
          {description}
        </p>
      )}
      {rsvpSlot ?? (
        <p className="text-xs" style={{ color: "var(--inv-muted)" }}>
          {locale === "bn"
            ? "ব্যক্তিগত আমন্ত্রণ লিঙ্কের মাধ্যমে আপনার উপস্থিতি নিশ্চিত করুন।"
            : "Use your personal invitation link to submit your family RSVP."}
        </p>
      )}
    </div>
  );
}

function ContactSection({ section, locale }: SectionRenderContext) {
  const heading = resolveText(section.content, "heading", locale);
  const contactName = resolveText(section.content, "contactName", locale);
  const phone = resolveText(section.content, "phone", locale);

  return (
    <div className="space-y-2 max-w-md mx-auto">
      {heading && (
        <h2
          className="text-lg font-medium"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {heading}
        </h2>
      )}
      {contactName && <p className="text-sm font-medium">{contactName}</p>}
      {phone && (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          style={{ color: "var(--inv-primary)" }}
        >
          <Phone className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          <span>{phone}</span>
        </a>
      )}
    </div>
  );
}

function FooterSection({ section, locale }: SectionRenderContext) {
  const closing = resolveText(section.content, "closing", locale);

  return (
    <div className="pt-4 pb-6 space-y-4">
      <AlponaDivider />
      {closing && (
        <p
          className="text-base sm:text-lg font-medium max-w-md mx-auto leading-relaxed"
          style={{
            color: "var(--inv-primary)",
            fontFamily: "var(--inv-heading-font)",
          }}
        >
          {closing}
        </p>
      )}
      <p className="text-[11px] opacity-60" style={{ color: "var(--inv-muted)" }}>
        {locale === "bn" ? "নিমন্ত্রণ দ্বারা প্রস্তুত" : "Crafted with Nimantro"}
      </p>
    </div>
  );
}

const SECTION_COMPONENTS: Record<
  SectionType,
  React.ComponentType<SectionRenderContext>
> = {
  hero: HeroSection,
  welcome: WelcomeSection,
  family: FamilySection,
  story: StorySection,
  countdown: CountdownSection,
  schedule: ScheduleSection,
  venue: VenueSection,
  gallery: GallerySection,
  rsvp: RsvpSection,
  contact: ContactSection,
  footer: FooterSection,
};

export function InvitationRenderer({
  design,
  eventMeta,
  locale: controlledLocale,
  onLocaleChange,
  interactive = true,
  activeSectionId,
  onSelectSection,
  rsvpSlot,
  showLanguageToggle = true,
  className = "",
}: InvitationRendererProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [internalLocale, setInternalLocale] = React.useState<"bn" | "en">(
    design.language === "bn" ? "bn" : "en"
  );

  React.useEffect(() => {
    if (design.language === "bn" || design.language === "en") {
      setInternalLocale(design.language);
    }
  }, [design.language]);

  const activeLocale = controlledLocale ?? internalLocale;
  const setLocale = (next: "bn" | "en") => {
    setInternalLocale(next);
    onLocaleChange?.(next);
  };

  const cssVars = React.useMemo(
    () => buildThemeCssVariables(design.theme) as React.CSSProperties,
    [design.theme]
  );

  const experience = resolveExperience(design);

  const enabledSections = React.useMemo(
    () => getOrderedEnabledSections(design),
    [design]
  );

  const alignClass = (alignment?: "left" | "center" | "right") => {
    if (alignment === "left") return "text-left";
    if (alignment === "right") return "text-right";
    return "text-center";
  };

  return (
    <div
      lang={activeLocale}
      style={{
        ...cssVars,
        backgroundColor: "var(--inv-background)",
        color: "var(--inv-text)",
        fontFamily: "var(--inv-body-font)",
      }}
      data-pattern={experience.pattern}
      data-frame={experience.frame}
      className={`inv-card relative overflow-hidden rounded-2xl border shadow-elevated ${
        activeLocale === "bn" ? "lang-bn" : ""
      } ${className}`}
    >
      {/* Top subtle ornament bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, var(--inv-primary), var(--inv-secondary), var(--inv-primary))`,
        }}
        aria-hidden="true"
      />
      {experience.frame === "ornate" && <OrnateCorners />}

      {/* Bilingual language toggle when invitation supports both */}
      {showLanguageToggle && design.language === "both" && (
        <div className="no-print flex justify-end px-4 pt-4">
          <div
            className="inline-flex items-center gap-1 rounded-full border p-1 text-xs font-medium"
            style={{
              backgroundColor: "var(--inv-surface)",
              borderColor: "var(--inv-border)",
            }}
            role="group"
            aria-label="Language switcher"
          >
            <Globe className="h-3.5 w-3.5 ml-1.5" style={{ color: "var(--inv-muted)" }} aria-hidden="true" />
            <button
              type="button"
              onClick={() => setLocale("bn")}
              className="rounded-full px-2.5 py-1 transition-colors"
              style={
                activeLocale === "bn"
                  ? { backgroundColor: "var(--inv-primary)", color: "#FFFFFF" }
                  : { color: "var(--inv-muted)" }
              }
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className="rounded-full px-2.5 py-1 transition-colors"
              style={
                activeLocale === "en"
                  ? { backgroundColor: "var(--inv-primary)", color: "#FFFFFF" }
                  : { color: "var(--inv-muted)" }
              }
            >
              English
            </button>
          </div>
        </div>
      )}

      {/* Sections stack */}
      <div className="px-5 sm:px-10 py-6 space-y-10">
        {enabledSections.map((section) => {
          // Guests never see an empty gallery; the editor shows a placeholder instead
          if (
            interactive &&
            section.type === "gallery" &&
            !(Array.isArray(section.content.images) && section.content.images.length > 0)
          ) {
            return null;
          }
          const SectionComp = SECTION_COMPONENTS[section.type];
          const motionConfig = getSectionMotionConfig(
            section.animation,
            prefersReducedMotion || !interactive
          );
          const isSelected = activeSectionId === section.id;

          const sectionStyle: React.CSSProperties = {
            backgroundColor: section.style?.backgroundColor,
            color: section.style?.textColor,
            paddingTop: section.style?.paddingTop,
            paddingBottom: section.style?.paddingBottom,
          };

          const content = (
            <SectionComp
              section={section}
              locale={activeLocale}
              eventMeta={eventMeta}
              rsvpSlot={rsvpSlot}
            />
          );

          const wrapperClass = `relative rounded-xl transition-all ${alignClass(
            section.style?.alignment
          )} ${
            onSelectSection
              ? "cursor-pointer hover:outline hover:outline-2 hover:outline-dashed hover:outline-primary/40 p-2 -mx-2"
              : ""
          } ${isSelected ? "ring-2 ring-primary ring-offset-2 p-2 -mx-2" : ""}`;

          if (!interactive || motionConfig.transition.duration === 0) {
            return (
              <section
                key={section.id}
                style={sectionStyle}
                className={wrapperClass}
                onClick={onSelectSection ? () => onSelectSection(section.id) : undefined}
              >
                {content}
              </section>
            );
          }

          return (
            <motion.section
              key={section.id}
              initial={motionConfig.initial}
              whileInView={motionConfig.animate}
              viewport={{ once: true, amount: 0.2 }}
              transition={motionConfig.transition}
              style={sectionStyle as MotionStyle}
              className={wrapperClass}
              onClick={onSelectSection ? () => onSelectSection(section.id) : undefined}
            >
              {content}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
