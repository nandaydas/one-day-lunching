// ============================================================
// Nimantro — Create New Event Wizard
// apps/web/app/(dashboard)/dashboard/events/new/page.tsx
// ============================================================

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import type { EventCategory, EventVisibility, Language } from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@nimantro/ui";
import { TemplateThumbnailCard } from "@/components/invitation/TemplateThumbnailCard";
import { useLocale } from "@/hooks/useLocale";
import { BUNDLED_TEMPLATES } from "@/lib/templates";

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const initialTemplate = searchParams.get("template") || BUNDLED_TEMPLATES[0].id;

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<EventCategory>("wedding");
  const [hostNames, setHostNames] = React.useState("");
  const [startAt, setStartAt] = React.useState(() => {
    const d = new Date(Date.now() + 30 * 86400 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [language, setLanguage] = React.useState<Language>("both");
  const [visibility, setVisibility] = React.useState<EventVisibility>("public");
  const [venueName, setVenueName] = React.useState("");
  const [venueAddress, setVenueAddress] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [templateId, setTemplateId] = React.useState(initialTemplate);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const hosts = hostNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          description: description.trim() || undefined,
          hostNames: hosts.length > 0 ? hosts : [title.trim()],
          startAt: new Date(startAt).toISOString(),
          timezone: "Asia/Kolkata",
          language,
          visibility,
          venue:
            venueName.trim() && venueAddress.trim()
              ? { name: venueName.trim(), address: venueAddress.trim() }
              : undefined,
          templateId,
        }),
      });

      const raw = await res.text();
      let data: { eventId?: string; invitationId?: string; error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          throw new Error(res.ok ? "Invalid server response." : `Server error (${res.status}).`);
        }
      }
      if (!res.ok || !data.eventId) {
        throw new Error(data.error ?? `Failed to create event (${res.status}).`);
      }

      toast({ title: "Event created", variant: "success" });
      if (data.invitationId) {
        router.push(`/editor/${data.eventId}/${data.invitationId}`);
      } else {
        router.push(`/dashboard/events/${data.eventId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/events">
          <Button variant="ghost" size="icon" aria-label="Back to events">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </Link>
        <div>
          <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
            {t("newEvent.heading")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("newEvent.subheading")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("newEvent.detailsTitle")}</CardTitle>
            <CardDescription>
              {t("newEvent.detailsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ev-title">{t("newEvent.eventTitle")}</Label>
              <Input
                id="ev-title"
                required
                minLength={2}
                placeholder="e.g. Anindita & Soumya Wedding / শুভ বিবাহ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-category">{t("newEvent.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as EventCategory)}
              >
                <SelectTrigger id="ev-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding / বিবাহ</SelectItem>
                  <SelectItem value="engagement">Engagement / আশীর্বাদ</SelectItem>
                  <SelectItem value="birthday">Birthday / জন্মদিন</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="housewarming">Housewarming / গৃহপ্রবেশ</SelectItem>
                  <SelectItem value="annaprashan">Annaprashan / অন্নপ্রাশন</SelectItem>
                  <SelectItem value="religious_ceremony">Religious Ceremony</SelectItem>
                  <SelectItem value="puja_festival">Puja &amp; Festival</SelectItem>
                  <SelectItem value="corporate">Corporate Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-start">{t("newEvent.startDate")}</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ev-hosts">{t("newEvent.hostNames")}</Label>
              <Input
                id="ev-hosts"
                required
                placeholder="e.g. Mukherjee Family, Sarkar Family"
                value={hostNames}
                onChange={(e) => setHostNames(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-lang">{t("newEvent.language")}</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as Language)}
              >
                <SelectTrigger id="ev-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t("newEvent.langBoth")}</SelectItem>
                  <SelectItem value="bn">{t("newEvent.langBn")}</SelectItem>
                  <SelectItem value="en">{t("newEvent.langEn")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-visibility">{t("newEvent.visibility")}</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as EventVisibility)}
              >
                <SelectTrigger id="ev-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (anyone with link)</SelectItem>
                  <SelectItem value="unlisted">Unlisted (not indexed)</SelectItem>
                  <SelectItem value="private">Private (personal guest token only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-venue-name">{t("newEvent.venueName")}</Label>
              <Input
                id="ev-venue-name"
                placeholder="e.g. Utsav Bhavan, Salt Lake"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-venue-addr">{t("newEvent.venueAddress")}</Label>
              <Input
                id="ev-venue-addr"
                placeholder="e.g. Sector I, Kolkata 700064"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ev-desc">{t("newEvent.description")}</Label>
              <Textarea
                id="ev-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief note about this celebration…"
              />
            </div>
          </CardContent>
        </Card>

        {/* Template selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t("newEvent.chooseTemplate")}</CardTitle>
            <CardDescription>
              {t("newEvent.chooseTemplateDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUNDLED_TEMPLATES.map((tpl) => {
              const selected = tpl.id === templateId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateId(tpl.id)}
                  className={`relative rounded-lg border p-2 text-left transition-[border-color,background-color] duration-150 ${
                    selected
                      ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  )}
                  <TemplateThumbnailCard template={tpl} />
                  <p className="mt-2 px-1 text-sm font-medium text-foreground">
                    {tpl.name}
                  </p>
                  <p className="px-1 text-xs text-muted-foreground">
                    {tpl.category} · {tpl.eventCategories.join(", ")}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/events">
            <Button type="button" variant="outline">
              {t("common.cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("newEvent.submitting") : t("newEvent.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <React.Suspense fallback={<LoadingSpinner size="lg" className="py-12" />}>
      <NewEventForm />
    </React.Suspense>
  );
}
