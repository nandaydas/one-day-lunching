"use client";

import * as React from "react";
import Link from "next/link";
import { templateToDesignDocument } from "@nimantro/invitation-engine";
import { getTemplateById } from "@/lib/templates";
import { EXPERIENCE_OPTIONS } from "@/lib/experience";
import { MUSIC_PRESETS } from "@/lib/invite-music";
import { InvitationRenderer } from "./InvitationRenderer";
import { InvitationExperience } from "./InvitationExperience";

const LABELS: Record<string, string> = {
  envelope: "Envelope",
  curtain: "Curtain",
  doors: "Doors",
  marigold: "Marigold",
  roses: "Roses",
  sparkles: "Sparkles",
  fireflies: "Fireflies",
  confetti: "Confetti",
  leaves: "Leaves",
  diyas: "Diyas",
  bubbles: "Bubbles",
  none: "No effect",
  ...Object.fromEntries(MUSIC_PRESETS.map((m) => [m.id, m.en])),
};

const TRY = ["music", "effect", "opening"] as const;

export function DemoInvitation({ templateId }: { templateId: string }) {
  const template = getTemplateById(templateId)!;
  const [locale, setLocale] = React.useState<"bn" | "en">("en");
  const [meta, setMeta] = React.useState<Record<string, string>>({});
  const [replay, setReplay] = React.useState(0);
  const design = React.useMemo(
    () => ({ ...templateToDesignDocument(template), metadata: meta }),
    [template, meta]
  );
  const hero = design.sections.find((s) => s.type === "hero")?.content.primaryNames;
  const names =
    hero && typeof hero === "object" ? ((hero as Record<string, string>)[locale] ?? "") : String(hero ?? "");
  const current = { ...template.experience, ...meta } as Record<string, string>;

  return (
    <div className="mx-auto max-w-2xl px-3 pb-40 pt-4 sm:px-6">
      <InvitationExperience
        key={replay}
        design={design}
        names={names}
        guestName={locale === "bn" ? "অতিথি" : "Guest"}
        locale={locale}
      >
        <InvitationRenderer design={design} locale={locale} onLocaleChange={setLocale} interactive />
      </InvitationExperience>

      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground">Try:</span>
          {TRY.map((key) => (
            <select
              key={key}
              aria-label={`Choose ${key}`}
              className="h-8 rounded-full border bg-background px-3"
              value={current[key] ?? ""}
              onChange={(e) => {
                setMeta((m) => ({ ...m, [key]: e.target.value }));
                if (key === "opening") setReplay((r) => r + 1);
              }}
            >
              {(EXPERIENCE_OPTIONS[key] as readonly string[]).map((opt) => (
                <option key={opt} value={opt}>
                  {LABELS[opt] ?? opt}
                </option>
              ))}
            </select>
          ))}
          <button type="button" className="h-8 rounded-full border px-3" onClick={() => setReplay((r) => r + 1)}>
            ↺ Replay
          </button>
        </div>
        <div className="mx-auto mt-2 flex max-w-2xl items-center justify-center gap-2">
          <Link
            href={`/dashboard/events/new?template=${template.id}`}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow"
          >
            Use this design
          </Link>
          <Link href="/templates" className="rounded-full border px-4 py-2 text-sm">
            All designs
          </Link>
        </div>
      </div>
    </div>
  );
}
