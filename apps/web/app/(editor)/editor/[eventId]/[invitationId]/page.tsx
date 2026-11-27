// ============================================================
// Nimantro — 3-Pane Visual Invitation Editor Page
// apps/web/app/(editor)/editor/[eventId]/[invitationId]/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  ExternalLink,
  Globe,
  Plus,
  Printer,
  Redo2,
  Save,
  Share2,
  Trash2,
  Undo2,
  LayoutList,
  Palette,
  Pencil,
  X,
} from "lucide-react";
import { useEditorStore } from "@nimantro/editor";
import { SECTION_CATALOG } from "@nimantro/invitation-engine";
import type { EventVisibility, InvitationDocument } from "@nimantro/types";
import { generateSlug } from "@nimantro/validation";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@nimantro/ui";
import { InvitationRenderer, type PublicEventMeta } from "@/components/invitation/InvitationRenderer";
import { SectionInspector } from "@/components/editor/SectionInspector";
import { ThemeEditorPanel } from "@/components/editor/ThemeEditorPanel";
import { useLocale } from "@/hooks/useLocale";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";
import { withGallery } from "@/lib/templates";

export default function InvitationEditorPage() {
  const params = useParams<{ eventId: string; invitationId: string }>();
  const { eventId, invitationId } = params;
  const { t, locale: uiLocale } = useLocale();

  const {
    design,
    activeSectionId,
    isDirty,
    isSaving,
    initialise,
    setActiveSection,
    toggleSectionEnabled,
    moveSectionUp,
    moveSectionDown,
    addSection,
    removeSection,
    duplicateSection,
    undo,
    redo,
    canUndo,
    canRedo,
    pushHistory,
    markSaving,
    markSaved,
  } = useEditorStore();

  const [invitation, setInvitation] = React.useState<InvitationDocument | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [leftTab, setLeftTab] = React.useState("sections");
  const [mobilePanel, setMobilePanel] = React.useState<null | "sections" | "theme" | "edit">(null);
  const [eventMeta, setEventMeta] = React.useState<PublicEventMeta | undefined>();
  const [previewLocale, setPreviewLocale] = React.useState<"bn" | "en">("bn");
  const [addDrawerOpen, setAddDrawerOpen] = React.useState(false);

  // Publish modal state
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [slug, setSlug] = React.useState("");
  const [visibility, setVisibility] = React.useState<EventVisibility>("public");
  const [passwordProtected, setPasswordProtected] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);
  const [publishedUrl, setPublishedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isFirebaseClientConfigured() || !eventId || !invitationId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const db = getClientDb();
        const [invSnap, eventSnap] = await Promise.all([
          getDoc(doc(db, "events", eventId, "invitations", invitationId)),
          getDoc(doc(db, "events", eventId)),
        ]);
        const ev = eventSnap.data();
        if (ev) {
          const toIso = (v: unknown) =>
            v && typeof (v as { toDate?: () => Date }).toDate === "function"
              ? (v as { toDate: () => Date }).toDate().toISOString()
              : typeof v === "string" ? v : null;
          setEventMeta({
            title: ev.title,
            startAt: toIso(ev.startAt),
            endAt: toIso(ev.endAt),
            timezone: ev.timezone,
            venue: ev.venue ?? null,
            hostNames: ev.hostNames,
          });
        }
        if (invSnap.exists()) {
          const raw = { id: invSnap.id, ...invSnap.data() } as InvitationDocument;
          const inv = { ...raw, designDocument: withGallery(raw.designDocument) };
          setInvitation(inv);
          initialise(inv.designDocument);
          setSlug(inv.slug || generateSlug(inv.title));
          setVisibility(inv.visibility ?? "public");
          setPasswordProtected(Boolean(inv.passwordProtected));
          setPreviewLocale(
            inv.designDocument.language === "en"
              ? "en"
              : inv.designDocument.language === "bn"
              ? "bn"
              : uiLocale
          );
          if (inv.status === "published" && inv.slug) {
            setPublishedUrl(`/i/${inv.slug}`);
          }
          if (inv.designDocument.sections.length > 0) {
            setActiveSection(inv.designDocument.sections[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [eventId, invitationId, initialise, setActiveSection, uiLocale]);

  React.useEffect(() => {
    if (design?.language === "bn") setPreviewLocale("bn");
    else if (design?.language === "en") setPreviewLocale("en");
  }, [design?.language]);

  async function handleSaveDraft() {
    if (!design) return;
    markSaving();
    try {
      const db = getClientDb();
      const sanitisedDesign = JSON.parse(JSON.stringify(design));
      await updateDoc(doc(db, "events", eventId, "invitations", invitationId), {
        language: design.language,
        designDocument: sanitisedDesign,
        updatedAt: serverTimestamp(),
      });
      markSaved();
      toast({ title: t("editor.saved"), variant: "success" });
    } catch (err) {
      useEditorStore.setState({ isSaving: false });
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!design) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/invitations/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          invitationId,
          slug: generateSlug(slug),
          visibility,
          passwordProtected,
          password: passwordProtected && password ? password : undefined,
          designDocument: design,
        }),
      });
      const raw = await res.text();
      const json = (raw ? JSON.parse(raw) : {}) as {
        url?: string;
        slug?: string;
        version?: number;
        error?: string;
      };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Failed to publish invitation.");
      }
      markSaved();
      setPublishedUrl(json.url);
      setInvitation((prev) =>
        prev ? { ...prev, status: "published", slug: json.slug ?? prev.slug } : prev
      );
      toast({
        title: `Published v${json.version ?? 1}!`,
        description: `Live at ${json.url}`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Publish failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!design || !invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="font-semibold">{t("editor.notLoaded")}</p>
        <Link href={`/dashboard/events/${eventId}`}>
          <Button variant="outline">{t("editor.backToEvent")}</Button>
        </Link>
      </div>
    );
  }

  const activeSection =
    design.sections.find((s) => s.id === activeSectionId) ?? design.sections[0] ?? null;


  const leftPanel = (
    <Tabs value={leftTab} onValueChange={setLeftTab} className="flex flex-col h-full">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="sections">{t("editor.sections")}</TabsTrigger>
        <TabsTrigger value="theme">{t("editor.theme")}</TabsTrigger>
      </TabsList>

      <TabsContent value="sections" className="flex-1 space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {design.sections.length} {t("editor.sections")}
          </span>
          <Dialog open={addDrawerOpen} onOpenChange={setAddDrawerOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3 w-3" />
                {t("editor.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editor.addSectionTitle")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                {SECTION_CATALOG.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      const sec = item.createDefaultSection(design.sections.length);
                      addSection(sec);
                      setActiveSection(sec.id);
                      pushHistory(`Add ${item.type} section`);
                      setAddDrawerOpen(false);
                    }}
                    className="flex flex-col items-start rounded-xl border border-border p-3 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-semibold">
                      {uiLocale === "bn" ? item.label.bn : item.label.en}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {design.sections.map((sec, index) => {
          const selected = activeSection?.id === sec.id;
          const catalogMatch = SECTION_CATALOG.find((c) => c.type === sec.type);
          const sectionLabel =
            uiLocale === "bn" && catalogMatch
              ? catalogMatch.label.bn
              : catalogMatch?.label.en ?? sec.type;

          return (
            <div
              key={sec.id}
              onClick={() => {
          setActiveSection(sec.id);
          if (mobilePanel) setMobilePanel("edit");
        }}
              className={`rounded-xl border p-2.5 cursor-pointer transition-colors ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate">
                  {sectionLabel}
                </span>
                <Switch
                  checked={sec.enabled}
                  onCheckedChange={() => {
                    toggleSectionEnabled(sec.id);
                    pushHistory(`Toggle ${sec.type}`);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Toggle ${sec.type}`}
                />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSectionUp(sec.id);
                    pushHistory("Move section up");
                  }}
                  title="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  disabled={index === design.sections.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSectionDown(sec.id);
                    pushHistory("Move section down");
                  }}
                  title="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSection(sec.id);
                    pushHistory("Duplicate section");
                  }}
                  title="Duplicate"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {design.sections.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(sec.id);
                      pushHistory("Remove section");
                    }}
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </TabsContent>

      <TabsContent value="theme" className="overflow-y-auto pr-1">
        <ThemeEditorPanel />
      </TabsContent>
    </Tabs>
  );

  const inspectorPanel = (
    <>
    {activeSection ? (
      <div className="space-y-3 h-full flex flex-col">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("editor.editing")}: {activeSection.type}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <SectionInspector
            section={activeSection}
            invitationLanguage={design.language}
            eventId={eventId}
          />
        </div>
      </div>
    ) : (
      <p className="text-xs text-muted-foreground p-4 text-center">
        {t("editor.selectSectionHint")}
      </p>
    )}
    </>
  );

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden print:h-auto print:overflow-visible print:block">
      {/* ─── Top Toolbar ─────────────────────────────────────── */}
      <header className="no-print h-14 shrink-0 border-b border-border bg-card px-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="ghost" size="icon" aria-label={t("editor.backToEvent")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold truncate">{invitation.title}</h1>
              <Badge variant={isDirty ? "accent" : "outline"} className="text-[10px]">
                {isDirty ? t("editor.unsaved") : t("editor.saved")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Center controls */}
        <div className="hidden md:flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo()}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo()}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>


          <div className="mx-2 h-5 w-px bg-border" />

          {design.language === "both" ? (
            <div
              className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 text-xs font-medium"
              role="group"
              aria-label="Preview language"
            >
              <Globe className="h-3.5 w-3.5 ml-1.5 mr-0.5 text-muted-foreground" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setPreviewLocale("bn")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 transition-colors",
                  previewLocale === "bn"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setPreviewLocale("en")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 transition-colors",
                  previewLocale === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                English
              </button>
            </div>
          ) : (
            <Badge variant="outline" className="gap-1.5">
              <Globe className="h-3 w-3" aria-hidden="true" />
              {design.language === "bn" ? "বাংলা" : "English"}
            </Badge>
          )}
        </div>

        {/* Save & Publish */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            title="Print or save PDF"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            <span className="hidden xl:inline">Print / PDF</span>
          </Button>

          {publishedUrl && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const full = `${window.location.origin}${publishedUrl}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: invitation.title, url: full });
                      return;
                    } catch {
                      // fallback to clipboard
                    }
                  }
                  await navigator.clipboard.writeText(full);
                  toast({ title: t("common.copied"), variant: "success" });
                }}
                title={t("common.share")}
              >
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                <span className="hidden xl:inline">{t("common.share")}</span>
              </Button>
              <Link href={publishedUrl} target="_blank" className="hidden sm:block">
                <Button type="button" variant="ghost" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  {t("editor.live")}
                </Button>
              </Link>
            </>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {isSaving ? t("editor.saving") : t("editor.save")}
          </Button>

          <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                {t("editor.publish")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("editor.publishTitle")}</DialogTitle>
                <DialogDescription>{t("editor.publishDesc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePublish} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pub-slug">{t("editor.slugLabel")}</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">/i/</span>
                    <Input
                      id="pub-slug"
                      required
                      minLength={3}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("editor.visibility")}</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as EventVisibility)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (anyone with URL)</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="private">Private (guest token only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{t("editor.passwordProtection")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("editor.passwordDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={passwordProtected}
                    onCheckedChange={setPasswordProtected}
                  />
                </div>

                {passwordProtected && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pub-pass">{t("editor.passcodeLabel")}</Label>
                    <Input
                      id="pub-pass"
                      type="password"
                      minLength={4}
                      required={!invitation.passwordProtected}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        invitation.passwordProtected
                          ? "Leave blank to keep existing passcode"
                          : "Enter passcode"
                      }
                    />
                  </div>
                )}

                {publishedUrl && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs flex items-center justify-between gap-2 text-green-900">
                    <span className="truncate font-medium">
                      {t("editor.live")}: {publishedUrl}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}${publishedUrl}`
                        );
                        toast({ title: t("common.copied"), variant: "success" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      {t("common.copy")}
                    </Button>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPublishOpen(false)}
                  >
                    {t("editor.close")}
                  </Button>
                  <Button type="submit" disabled={publishing}>
                    {publishing ? t("editor.publishing") : t("editor.publishSnapshot")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ─── 3-Pane Workspace ────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[270px_1fr_320px] min-h-0 print:block">
        {/* Left: Sections + Theme */}
        <aside className="no-print hidden lg:flex flex-col border-r border-border bg-card p-3 overflow-y-auto">
          {leftPanel}
        </aside>

        {/* Center: Live Canvas */}
        <main className="overflow-y-auto bg-muted/40 p-3 pb-24 sm:p-8 lg:pb-8 flex justify-center print:overflow-visible print:bg-white print:p-0">
          {/* Invitations are built for phones, so the canvas is always phone-width */}
          <div className="w-full max-w-[400px] h-fit overflow-hidden rounded-[2rem] border-[6px] border-foreground/85 shadow-xl print:max-w-2xl print:rounded-none print:border-0 print:shadow-none">
            <InvitationRenderer
              design={design}
              eventMeta={eventMeta}
              locale={previewLocale}
              onLocaleChange={setPreviewLocale}
              interactive={false}
              showLanguageToggle={false}
              activeSectionId={activeSection?.id}
              onSelectSection={(id) => {
                setActiveSection(id);
                if (window.matchMedia("(max-width: 1023px)").matches) setMobilePanel("edit");
              }}
            />
          </div>
        </main>

        {/* Right: Inspector */}
        <aside className="no-print hidden lg:flex flex-col border-l border-border bg-card p-3 overflow-y-auto">
          {inspectorPanel}
        </aside>
      </div>

      {/* ─── Mobile: bottom bar + sheet (desktop uses the side panes) ─── */}
      <nav className="no-print lg:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {([
          ["sections", t("editor.sections"), LayoutList],
          ["theme", t("editor.theme"), Palette],
          ["edit", t("editor.editing"), Pencil],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key !== "edit") setLeftTab(key);
              setMobilePanel(mobilePanel === key ? null : key);
            }}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${mobilePanel === key ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      {mobilePanel && (
        <div className="no-print lg:hidden fixed inset-0 z-40 flex flex-col justify-end bg-black/30" onClick={() => setMobilePanel(null)}>
          <div
            role="dialog"
            aria-label={mobilePanel === "edit" ? t("editor.editing") : t("editor.sections")}
            className="flex max-h-[75vh] min-h-[45vh] flex-col rounded-t-2xl bg-card p-3 pb-20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <button type="button" aria-label="Close" className="absolute right-4 p-1" onClick={() => setMobilePanel(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{mobilePanel === "edit" ? inspectorPanel : leftPanel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
