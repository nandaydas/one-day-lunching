"use client";

import * as React from "react";
import Link from "next/link";
import { templateToDesignDocument } from "@nimantro/invitation-engine";
import { getTemplateById } from "@/lib/templates";
import { InvitationRenderer } from "./InvitationRenderer";
import { InvitationExperience } from "./InvitationExperience";

export function DemoInvitation({ templateId }: { templateId: string }) {
  const template = getTemplateById(templateId)!;
  const design = React.useMemo(() => templateToDesignDocument(template), [template]);
  const [locale, setLocale] = React.useState<"bn" | "en">("en");
  const hero = design.sections.find((s) => s.type === "hero")?.content.primaryNames;
  const names =
    hero && typeof hero === "object" ? ((hero as Record<string, string>)[locale] ?? "") : String(hero ?? "");

  return (
    <div className="mx-auto max-w-2xl px-3 pb-28 pt-4 sm:px-6">
      <InvitationExperience design={design} names={names} guestName={locale === "bn" ? "অতিথি" : "Guest"} locale={locale}>
        <InvitationRenderer design={design} locale={locale} onLocaleChange={setLocale} interactive />
      </InvitationExperience>
      <div className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur">
        <span className="hidden text-sm text-muted-foreground sm:inline">{template.name}</span>
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
  );
}
