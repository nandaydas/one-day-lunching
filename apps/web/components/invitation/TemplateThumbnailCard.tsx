// ============================================================
// Nimantro — Template Preview Card Artwork
// apps/web/components/invitation/TemplateThumbnailCard.tsx
// ============================================================

import * as React from "react";
import Image from "next/image";
import type { TemplateDefinition } from "@nimantro/template-schema";
import { resolveSectionText } from "@nimantro/invitation-engine";

const STORY_TYPE_LABELS: Record<string, { en: string; bn: string }> = {
  "couple-journey": { en: "Couple Journey", bn: "যুগল যাত্রা" },
  "milestone-chapters": { en: "Milestones", bn: "স্মরণীয় অধ্যায়" },
  "ritual-heritage": { en: "Ritual Guide", bn: "সংস্কৃতি ও আচার" },
  "family-chronicle": { en: "Family Chronicle", bn: "পারিবারিক কথা" },
  "tribute-quote": { en: "Editorial Letter", bn: "হৃদয়ের কথা" },
};

export function TemplateThumbnailCard({
  template,
  locale = "en",
  className = "",
}: {
  template: TemplateDefinition;
  locale?: "bn" | "en";
  className?: string;
}) {
  const hero = template.sections.find((s) => s.type === "hero");
  const story = template.sections.find((s) => s.type === "story");

  const title = hero?.defaultContent
    ? resolveSectionText(hero.defaultContent.title, locale)
    : template.name;
  const names = hero?.defaultContent
    ? resolveSectionText(hero.defaultContent.primaryNames, locale) ||
      resolveSectionText(hero.defaultContent.subtitle, locale)
    : "";

  const artworkSrc =
    (typeof hero?.defaultContent?.artworkUrl === "string" && hero.defaultContent.artworkUrl) ||
    (template.thumbnail.startsWith("/art/") ? template.thumbnail : "");

  const storyTypeKey =
    typeof story?.defaultContent?.storyType === "string"
      ? story.defaultContent.storyType
      : "";
  const storyLabel = storyTypeKey ? STORY_TYPE_LABELS[storyTypeKey]?.[locale] : "";

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border select-none ${className}`}
      style={{
        backgroundColor: template.theme.background,
        borderColor: template.theme.border ?? "#E5E1DA",
        color: template.theme.text ?? "#1C1A18",
      }}
    >
      {artworkSrc ? (
        <div className="relative h-full w-full flex flex-col justify-between p-4">
          <div className="relative mx-auto w-[72%] flex-1 min-h-0">
            <Image
              src={artworkSrc}
              alt={`${template.name} 3D celebration artwork`}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-contain object-center"
              style={{
                maskImage: "radial-gradient(closest-side, #000 72%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(closest-side, #000 72%, transparent 100%)",
              }}
            />
          </div>

          <div
            className="relative z-10 rounded-md border px-3 py-2 text-center backdrop-blur-[2px]"
            style={{
              backgroundColor: `color-mix(in srgb, ${template.theme.surface ?? "#ffffff"} 90%, transparent)`,
              borderColor: template.theme.border ?? "#E5E1DA",
            }}
          >
            <p
              className="text-sm font-medium leading-snug line-clamp-1"
              lang={locale}
              style={{
                color: template.theme.primary,
                fontFamily:
                  locale === "bn"
                    ? "var(--font-noto-serif-bengali), serif"
                    : "var(--font-playfair), Georgia, serif",
              }}
            >
              {title}
            </p>
            {names && (
              <p
                className="mt-0.5 text-[11px] line-clamp-1"
                lang={locale}
                style={{ color: template.theme.muted ?? "#716C66" }}
              >
                {names}
              </p>
            )}
          </div>

          {storyLabel && (
            <span
              className="absolute right-2.5 top-2.5 z-10 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: template.theme.surface ?? "#FFFFFF",
                borderColor: template.theme.border ?? "#E5E1DA",
                color: template.theme.text ?? "#1C1A18",
              }}
            >
              {storyLabel}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center p-5 text-center">
          <div
            className="w-8 h-0.5 mb-3"
            style={{ backgroundColor: template.theme.secondary }}
            aria-hidden="true"
          />
          <p
            className="text-base font-medium leading-snug line-clamp-2"
            lang={locale}
            style={{
              color: template.theme.primary,
              fontFamily: "var(--font-playfair), var(--font-noto-serif-bengali), serif",
            }}
          >
            {title}
          </p>
          {names && (
            <p
              className="mt-1.5 text-xs line-clamp-1"
              lang={locale}
              style={{ color: template.theme.muted ?? "#716C66" }}
            >
              {names}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
