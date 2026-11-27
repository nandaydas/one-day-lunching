// ============================================================
// Nimantro — Create New Event (visual, step-by-step)
// apps/web/app/(dashboard)/dashboard/events/new/page.tsx
// Left: 3 simple steps. Right: the real invitation, updating live.
// ============================================================

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, ImagePlus, Pause, Play, X } from "lucide-react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { EventCategory, EventVisibility, Language } from "@nimantro/types";
import { templateToDesignDocument } from "@nimantro/invitation-engine";
import { Button, Input, Label, LoadingSpinner, Textarea, toast } from "@nimantro/ui";
import { TemplateThumbnailCard } from "@/components/invitation/TemplateThumbnailCard";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { InvitationExperience } from "@/components/invitation/InvitationExperience";
import { EXPERIENCE_FIELDS } from "@/components/editor/ThemeEditorPanel";
import { checkPhotos, uploadEventPhoto } from "@/components/editor/PhotoUploader";
import { getClientDb } from "@/lib/firebase-client";
import { useLocale } from "@/hooks/useLocale";
import { BUNDLED_TEMPLATES, getTemplateById } from "@/lib/templates";
import { EXPERIENCE_OPTIONS } from "@/lib/experience";
import { createInviteMusic, type InviteMusic, type MusicPresetId } from "@/lib/invite-music";

const STEPS = ["Pick a design", "Your details", "Photos", "Music & animation"] as const;
const MUSIC_STEP = 3;
const MAX_GALLERY = 12;

type LocalPhoto = { file: File; url: string };

const ICONS: Record<string, string> = {
  envelope: "💌",
  curtain: "🎭",
  doors: "🚪",
  marigold: "🌼",
  roses: "🌹",
  sparkles: "✨",
  fireflies: "🌙",
  confetti: "🎉",
  leaves: "🍂",
  diyas: "🪔",
  bubbles: "🫧",
  none: "⛔",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  wedding: "Wedding",
  reception: "Reception",
  engagement: "Engagement",
  birthday: "Birthday",
  anniversary: "Anniversary",
  housewarming: "Housewarming",
  annaprashan: "Annaprashan",
  religious_ceremony: "Ceremony",
  puja_festival: "Puja",
  corporate: "Corporate",
  other: "Other",
};

function nameOf(key: string, value?: string) {
  if (!value) return "—";
  return EXPERIENCE_FIELDS.find((f) => f.key === key)?.names?.[value] ?? value;
}

/** Big tappable choice used everywhere on this page. */
function Choice({
  selected,
  onClick,
  children,
  badge,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative rounded-xl border p-3 text-left text-sm transition-[border-color,background-color,box-shadow] ${
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/25" : "border-border bg-card hover:border-primary/40"
      } ${className}`}
    >
      {badge && (
        <span className="absolute -top-2 right-2 rounded-full border bg-background px-1.5 text-[10px] leading-4 text-muted-foreground">
          {badge}
        </span>
      )}
      {children}
    </button>
  );
}

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const initialTemplate = searchParams.get("template") || BUNDLED_TEMPLATES[0].id;

  const [step, setStep] = React.useState(0);
  const [filter, setFilter] = React.useState("all");
  const [templateId, setTemplateId] = React.useState(initialTemplate);
  const template = getTemplateById(templateId) ?? BUNDLED_TEMPLATES[0];
  const [category, setCategory] = React.useState<EventCategory>(
    (template.eventCategories[0] as EventCategory) ?? "wedding"
  );
  const [names, setNames] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [startAt, setStartAt] = React.useState(() =>
    new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 16)
  );
  const [language, setLanguage] = React.useState<Language>("both");
  const [visibility, setVisibility] = React.useState<EventVisibility>("public");
  const [venueName, setVenueName] = React.useState("");
  const [venueAddress, setVenueAddress] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [experience, setExperience] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [watchKey, setWatchKey] = React.useState(0);
  const [watching, setWatching] = React.useState(false);
  const [mobilePreview, setMobilePreview] = React.useState(false);
  const [heroPhoto, setHeroPhoto] = React.useState<LocalPhoto | null>(null);
  const [gallery, setGallery] = React.useState<LocalPhoto[]>([]);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  function pickPhotos(files: FileList | null, kind: "hero" | "gallery") {
    const picked = Array.from(files ?? []).slice(0, kind === "hero" ? 1 : MAX_GALLERY - gallery.length);
    if (!picked.length) return;
    const problem = checkPhotos(picked);
    setPhotoError(problem);
    if (problem) return;
    const local = picked.map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (kind === "hero") setHeroPhoto(local[0]);
    else setGallery((g) => [...g, ...local].slice(0, MAX_GALLERY));
  }

  const hasVenue = Boolean(venueName.trim() && venueAddress.trim()); // the API needs both
  const hosts = names
    .split(/,|&| and | ও /)
    .map((s) => s.trim())
    .filter(Boolean);
  const templateExp = (template.experience ?? {}) as Record<string, string>;
  const currentExp = { ...templateExp, ...experience };

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const tpl = getTemplateById(id);
    if (tpl && !tpl.eventCategories.includes(category)) setCategory(tpl.eventCategories[0] as EventCategory);
  }

  function chooseExperience(key: string, value: string) {
    // Picking the template's own value clears the override, so later template changes still apply.
    setExperience(({ [key]: _old, ...rest }) => (value === templateExp[key] ? rest : { ...rest, [key]: value }));
    if (key === "opening" || key === "effect") replay();
  }

  function replay() {
    setWatching(true);
    setWatchKey((k) => k + 1);
  }

  // Same overrides the API applies, so the preview matches what gets created.
  const design = React.useMemo(() => {
    const doc = templateToDesignDocument(template, {
      language,
      contentOverrides: {
        ...(hosts.length
          ? { hero: { primaryNames: { bn: hosts.join(" ও "), en: hosts.join(" & ") }, dateLabel: { bn: "", en: "" } } }
          : {}),
        countdown: { targetDate: startAt.slice(0, 16) },
        ...(hasVenue
          ? {
              venue: {
                venueName: { bn: venueName.trim(), en: venueName.trim() },
                address: { bn: venueAddress.trim(), en: venueAddress.trim() },
              },
            }
          : {}),
      },
    });
    const sections = doc.sections.map((s) =>
      s.type === "hero" && heroPhoto
        ? { ...s, content: { ...s.content, photoUrl: heroPhoto.url } }
        : s.type === "gallery" && gallery.length
          ? { ...s, content: { ...s.content, images: gallery.map((p) => p.url) } }
          : s
    );
    return { ...doc, sections, metadata: experience };
  }, [template, language, hosts.join("|"), startAt, venueName, venueAddress, hasVenue, experience, heroPhoto, gallery]); // eslint-disable-line react-hooks/exhaustive-deps

  const [locale, setLocale] = React.useState<"bn" | "en">("en");
  const eventMeta = React.useMemo(
    () => ({
      title: title || hosts.join(" & "),
      startAt: startAt ? new Date(startAt).toISOString() : null,
      timezone: "Asia/Kolkata",
      hostNames: hosts,
      venue: hasVenue ? { name: venueName.trim(), address: venueAddress.trim() } : null,
    }),
    [title, hosts.join("|"), startAt, venueName, venueAddress] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Short "listen" samples for the music tiles.
  const sample = React.useRef<{ music: InviteMusic; id: string; timer: number } | null>(null);
  const [listening, setListening] = React.useState<string | null>(null);
  const stopSample = React.useCallback(() => {
    if (!sample.current) return;
    sample.current.music.stop();
    window.clearTimeout(sample.current.timer);
    sample.current = null;
    setListening(null);
  }, []);
  function toggleSample(id: string) {
    const same = sample.current?.id === id;
    stopSample();
    if (same) return;
    const music = createInviteMusic(id as MusicPresetId);
    music.start();
    sample.current = { music, id, timer: window.setTimeout(stopSample, 10000) };
    setListening(id);
  }
  React.useEffect(() => stopSample, [stopSample]);

  function goTo(next: number) {
    if (next > 1 && step <= 1 && !hosts.length) {
      setStep(1);
      setError("Please enter whose celebration this is.");
      return;
    }
    setError(null);
    setStep(next);
    if (next !== MUSIC_STEP) {
      stopSample();
      setWatching(false);
    }
  }

  // Photos need the event to exist (storage rules check ownership), so they upload right after creation.
  async function attachPhotos(eventId: string, invitationId: string) {
    const total = (heroPhoto ? 1 : 0) + gallery.length;
    let done = 0;
    const upload = async (p: LocalPhoto) => {
      const url = await uploadEventPhoto(eventId, p.file);
      setStatus(`Uploading photos ${++done}/${total}…`);
      return url;
    };
    try {
      setStatus(`Uploading photos 0/${total}…`);
      const [heroUrl, galleryUrls] = await Promise.all([
        heroPhoto ? upload(heroPhoto) : Promise.resolve(""),
        Promise.all(gallery.map(upload)),
      ]);
      const ref = doc(getClientDb(), "events", eventId, "invitations", invitationId);
      const snap = await getDoc(ref);
      const saved = snap.data()?.designDocument as typeof design | undefined;
      if (!saved) return;
      const sections = saved.sections.map((s) =>
        s.type === "hero" && heroUrl
          ? { ...s, content: { ...s.content, photoUrl: heroUrl } }
          : s.type === "gallery" && galleryUrls.length
            ? { ...s, content: { ...s.content, images: galleryUrls } }
            : s
      );
      await updateDoc(ref, { designDocument: { ...saved, sections }, updatedAt: serverTimestamp() });
    } catch {
      // The event exists either way; don't block the host — they can re-add photos in the editor.
      toast({ title: "Some photos didn't upload", description: "You can add them again in the editor.", variant: "destructive" });
    } finally {
      setStatus(null);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!hosts.length) {
      setStep(1);
      setError("Please enter whose celebration this is.");
      return;
    }
    if (!startAt) {
      setStep(1);
      setError("Please choose the date and time.");
      return;
    }
    stopSample();
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: (title.trim() || hosts.join(" & ")).slice(0, 200),
          category,
          description: description.trim() || undefined,
          hostNames: hosts,
          startAt: new Date(startAt).toISOString(),
          timezone: "Asia/Kolkata",
          language,
          visibility,
          venue: hasVenue
              ? { name: venueName.trim(), address: venueAddress.trim() }
              : undefined,
          templateId,
          experience,
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

      if (data.invitationId && (heroPhoto || gallery.length)) {
        await attachPhotos(data.eventId, data.invitationId);
      }
      toast({ title: "Event created", variant: "success" });
      router.push(data.invitationId ? `/editor/${data.eventId}/${data.invitationId}` : `/dashboard/events/${data.eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event.");
    } finally {
      setSubmitting(false);
    }
  }

  const filters = ["all", ...Array.from(new Set(BUNDLED_TEMPLATES.flatMap((tpl) => tpl.eventCategories)))];
  const shown = filter === "all" ? BUNDLED_TEMPLATES : BUNDLED_TEMPLATES.filter((tpl) => tpl.eventCategories.includes(filter as EventCategory));
  const heroNames = hosts.join(locale === "bn" ? " ও " : " & ");

  const preview = (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Live preview</p>
          <p className="text-xs text-muted-foreground">This is what your guests will see</p>
        </div>
        <Button type="button" size="sm" variant={watching ? "outline" : "default"} onClick={() => (watching ? setWatching(false) : replay())}>
          {watching ? <X className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span className="ml-1">{watching ? "Close guest view" : "Watch as guest"}</span>
        </Button>
      </div>
      {/* transform makes the experience's fixed-position cover/particles stay inside this phone frame */}
      <div
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-[2rem] border-[6px] border-foreground/85 bg-background shadow-xl"
        style={{ transform: "translateZ(0)" }}
      >
        {watching ? (
          <InvitationExperience key={watchKey} design={design} names={heroNames} guestName="Guest" locale={locale}>
            <InvitationRenderer design={design} eventMeta={eventMeta} locale={locale} onLocaleChange={setLocale} interactive />
          </InvitationExperience>
        ) : (
          <InvitationRenderer design={design} eventMeta={eventMeta} locale={locale} onLocaleChange={setLocale} interactive />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header + stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="icon" aria-label="Back to events">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.015em]">{t("newEvent.heading")}</h1>
            <p className="text-sm text-muted-foreground">4 easy steps — you can change everything later.</p>
          </div>
        </div>
        <ol className="flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={step === i ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  step === i ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === i ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Step content */}
        <div className="min-w-0 space-y-5 pb-24 lg:pb-4">
          {error && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-medium">Pick a design you love</h2>
                <p className="text-sm text-muted-foreground">Tap a card — the live preview changes instantly.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}
                  >
                    {CATEGORY_LABELS[f] ?? f}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {shown.map((tpl) => {
                  const exp = tpl.experience as Record<string, string> | undefined;
                  const selected = tpl.id === templateId;
                  return (
                    <Choice key={tpl.id} selected={selected} onClick={() => chooseTemplate(tpl.id)} className="p-2">
                      {selected && (
                        <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <TemplateThumbnailCard template={tpl} />
                      <p className="mt-2 px-1 font-medium leading-tight">{tpl.name}</p>
                      {exp && (
                        <p className="mt-0.5 px-1 text-xs text-muted-foreground">
                          {ICONS[exp.opening]} {ICONS[exp.effect]} ♪ {nameOf("music", exp.music)}
                        </p>
                      )}
                    </Choice>
                  );
                })}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-5">
              <div>
                <h2 className="text-lg font-medium">Tell us about the celebration</h2>
                <p className="text-sm text-muted-foreground">Type and watch your invitation fill in.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-hosts" className="text-base">Whose celebration is it?</Label>
                <Input
                  id="ev-hosts"
                  autoFocus
                  className="h-12 text-base"
                  placeholder="e.g. Rituparna & Anirban"
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Separate names with “&” or a comma.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ev-start">When?</Label>
                  <Input id="ev-start" type="datetime-local" className="h-11" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                {template.eventCategories.length > 1 && (
                  <div className="space-y-1.5">
                    <Label>What kind of event?</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {template.eventCategories.map((c) => (
                        <Choice key={c} selected={category === c} onClick={() => setCategory(c as EventCategory)} className="px-3 py-2">
                          {CATEGORY_LABELS[c] ?? c}
                        </Choice>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="ev-venue-name">Where? <span className="font-normal text-muted-foreground">(venue)</span></Label>
                  <Input id="ev-venue-name" className="h-11" placeholder="e.g. Utsav Bhavan, Salt Lake" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ev-venue-addr">Address</Label>
                  <Input id="ev-venue-addr" className="h-11" placeholder="e.g. Sector I, Kolkata 700064" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
                  {venueName.trim() && !venueAddress.trim() && (
                    <p className="text-xs text-muted-foreground">Add the address to show the venue on the invite.</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Invitation language</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["both", "বাংলা + English"],
                    ["bn", "শুধু বাংলা"],
                    ["en", "English only"],
                  ] as const).map(([v, label]) => (
                    <Choice
                      key={v}
                      selected={language === v}
                      onClick={() => {
                        setLanguage(v);
                        if (v !== "both") setLocale(v);
                      }}
                      className="text-center"
                    >
                      {label}
                    </Choice>
                  ))}
                </div>
              </div>

              <details className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium">More options (title, note, privacy)</summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-title">Event title <span className="font-normal text-muted-foreground">(only you see this)</span></Label>
                    <Input id="ev-title" placeholder={hosts.length ? hosts.join(" & ") : "e.g. Anindita & Soumya Wedding"} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-desc">A short note</Label>
                    <Textarea id="ev-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief note about this celebration…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Who can open the invitation?</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ["public", "Anyone with the link"],
                        ["unlisted", "Link only, hidden from search"],
                        ["private", "Only invited guests"],
                      ] as const).map(([v, label]) => (
                        <Choice key={v} selected={visibility === v} onClick={() => setVisibility(v)} className="text-xs">
                          {label}
                        </Choice>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">Add your photos</h2>
                <p className="text-sm text-muted-foreground">
                  Optional — your photos make the invite feel personal. You can also add or change them later.
                </p>
              </div>
              {photoError && <p role="alert" className="text-sm text-destructive">{photoError}</p>}

              <div className="space-y-2">
                <Label className="text-base">Main photo <span className="font-normal text-muted-foreground">(shown at the top, replaces the artwork)</span></Label>
                <div className="flex items-center gap-4">
                  <label className="relative flex aspect-[4/5] w-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-t-full rounded-b-xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
                    {heroPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroPhoto.url} alt="Main photo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-1 text-xs font-medium">
                        <ImagePlus className="h-6 w-6" /> Add photo
                      </span>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { pickPhotos(e.target.files, "hero"); e.target.value = ""; }} />
                  </label>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>A photo of the couple or family works best.</p>
                    {heroPhoto && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setHeroPhoto(null)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label className="text-base">Photo gallery</Label>
                  <span className="text-xs text-muted-foreground">{gallery.length}/{MAX_GALLERY}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {gallery.map((p, i) => (
                    <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`Gallery photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        onClick={() => setGallery((g) => g.filter((x) => x !== p))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {gallery.length < MAX_GALLERY && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10">
                      <ImagePlus className="h-6 w-6" />
                      Add photos
                      <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { pickPhotos(e.target.files, "gallery"); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Pick several at once. Guests can tap a photo to see it full screen.</p>
              </div>
            </section>
          )}

          {step === MUSIC_STEP && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">Make it magical</h2>
                <p className="text-sm text-muted-foreground">
                  Choose how the invite opens, what plays and what floats on screen. Tap <b>Open</b> in the preview to see it.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base">How it opens</Label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPERIENCE_OPTIONS.opening.map((v) => (
                    <Choice key={v} selected={currentExp.opening === v} onClick={() => chooseExperience("opening", v)} badge={templateExp.opening === v ? "Default" : undefined} className="text-center">
                      <span className="block text-3xl">{ICONS[v]}</span>
                      <span className="mt-1 block text-xs font-medium">{nameOf("opening", v)}</span>
                    </Choice>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Background music</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {EXPERIENCE_OPTIONS.music.map((v) => (
                    <Choice key={v} selected={currentExp.music === v} onClick={() => chooseExperience("music", v)} badge={templateExp.music === v ? "Default" : undefined}>
                      <span className="block font-medium">♪ {nameOf("music", v)}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={listening === v ? `Stop ${nameOf("music", v)}` : `Listen to ${nameOf("music", v)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSample(v);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSample(v);
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
                      >
                        {listening === v ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {listening === v ? "Stop" : "Listen"}
                      </span>
                    </Choice>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Floating on screen</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {EXPERIENCE_OPTIONS.effect.map((v) => (
                    <Choice key={v} selected={currentExp.effect === v} onClick={() => chooseExperience("effect", v)} badge={templateExp.effect === v ? "Default" : undefined} className="px-2 text-center">
                      <span className="block text-2xl">{ICONS[v]}</span>
                      <span className="mt-1 block text-[11px] leading-tight">{nameOf("effect", v)}</span>
                    </Choice>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(["pattern", "frame"] as const).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label>{key === "pattern" ? "Background pattern" : "Card border"}</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(EXPERIENCE_OPTIONS[key] as readonly string[]).map((v) => (
                        <Choice key={v} selected={currentExp[key] === v} onClick={() => chooseExperience(key, v)} className="px-3 py-1.5 text-xs capitalize">
                          {v}
                        </Choice>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                ✏️ Next you&apos;ll land in the editor, where you can fine-tune any text, section or photo.
              </p>
            </section>
          )}

          {/* Step navigation */}
          <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
            <Button type="button" variant="outline" onClick={() => (step === 0 ? router.push("/dashboard/events") : goTo(step - 1))}>
              {step === 0 ? t("common.cancel") : "Back"}
            </Button>
            <Button type="button" variant="outline" className="lg:hidden" onClick={() => setMobilePreview(true)}>
              <Eye className="mr-1 h-4 w-4" /> Preview
            </Button>
            {step < MUSIC_STEP ? (
              <Button type="button" onClick={() => goTo(step + 1)}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" disabled={submitting} onClick={handleSubmit}>
                {status ?? (submitting ? t("newEvent.submitting") : "Create invitation")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Live preview (desktop) */}
        <aside className="sticky top-4 hidden h-[calc(100vh-7rem)] lg:block">{!mobilePreview && preview}</aside>
      </div>

      {/* Live preview (mobile overlay) */}
      {mobilePreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-3">
          <Button type="button" variant="outline" className="mb-2 self-end" onClick={() => setMobilePreview(false)}>
            <X className="mr-1 h-4 w-4" /> Close preview
          </Button>
          <div className="min-h-0 flex-1">{preview}</div>
        </div>
      )}
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
