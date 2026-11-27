// ============================================================
// Nimantro — Event Detail Page
// apps/web/app/(dashboard)/dashboard/events/[eventId]/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Copy,
  Edit3,
  Plus,
  Printer,
  Share2,
  Users,
} from "lucide-react";
import type {
  EventDocument,
  EventSessionDocument,
  InvitationDocument,
} from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Skeleton,
  StatusBadge,
  toast,
} from "@nimantro/ui";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [event, setEvent] = React.useState<EventDocument | null>(null);
  const [invitations, setInvitations] = React.useState<InvitationDocument[]>([]);
  const [sessions, setSessions] = React.useState<EventSessionDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [sessionDialogOpen, setSessionDialogOpen] = React.useState(false);
  const [sessionTitle, setSessionTitle] = React.useState("");
  const [sessionStart, setSessionStart] = React.useState("");
  const [sessionVenue, setSessionVenue] = React.useState("");
  const [savingSession, setSavingSession] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!isFirebaseClientConfigured() || !eventId) {
      setLoading(false);
      return;
    }
    try {
      const db = getClientDb();
      const eventRef = doc(db, "events", eventId);
      const [evSnap, invSnap, sessSnap] = await Promise.all([
        getDoc(eventRef),
        getDocs(collection(eventRef, "invitations")),
        getDocs(query(collection(eventRef, "sessions"), orderBy("startAt", "asc"))),
      ]);

      if (evSnap.exists()) {
        setEvent({ id: evSnap.id, ...evSnap.data() } as EventDocument);
      }
      setInvitations(
        invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as InvitationDocument)
      );
      setSessions(
        sessSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventSessionDocument)
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    setSavingSession(true);
    try {
      const db = getClientDb();
      await addDoc(collection(db, "events", eventId, "sessions"), {
        title: sessionTitle.trim(),
        startAt: new Date(sessionStart),
        ...(sessionVenue.trim()
          ? { venue: { name: sessionVenue.trim(), address: event?.venue?.address ?? "" } }
          : {}),
        allowRSVP: true,
        status: "active",
      });
      toast({ title: "Ceremony session added", variant: "success" });
      setSessionTitle("");
      setSessionStart("");
      setSessionVenue("");
      setSessionDialogOpen(false);
      await loadData();
    } catch (err) {
      toast({
        title: "Could not add session",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingSession(false);
    }
  }

  async function copyPublicUrl(slug: string) {
    const url = `${window.location.origin}/i/${slug}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Invitation link copied", description: url, variant: "success" });
  }

  async function sharePublicInvitation(title: string, slug: string) {
    const url = `${window.location.origin}/i/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await copyPublicUrl(slug);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <p className="font-medium">Event not found</p>
          <Link href="/dashboard/events">
            <Button variant="outline">Back to events</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const languageText = (lang: string) =>
    lang === "bn" ? "Bengali" : lang === "en" ? "English" : "Bilingual";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="icon" aria-label="Back to events">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
                {event.title}
              </h1>
              <StatusBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {event.category.replace("_", " ")} · Hosted by {event.hostNames.join(", ")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/events/${event.id}/guests`}>
            <Button variant="outline">
              <Users className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="tabular-nums">Guests ({event.guestGroupCount ?? 0})</span>
            </Button>
          </Link>
          <Link href={`/dashboard/events/${event.id}/analytics`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Design the invitation in the visual editor and publish to share
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-border p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{inv.title}</p>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  <code className="font-mono text-foreground">/i/{inv.slug}</code> ·{" "}
                  {languageText(inv.language)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/editor/${event.id}/${inv.id}`}>
                  <Button size="sm">
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    Open editor
                  </Button>
                </Link>
                {inv.status === "published" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => sharePublicInvitation(event.title, inv.slug)}
                    >
                      <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      Share
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyPublicUrl(inv.slug)}
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      Copy URL
                    </Button>
                    <Link href={`/i/${inv.slug}`} target="_blank">
                      <Button size="sm" variant="outline">
                        <Printer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        Print / Live
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Ceremony Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Ceremonies &amp; sessions</CardTitle>
            <CardDescription>
              Add sub-events such as Haldi, Sangeet, Wedding, or Boubhat
            </CardDescription>
          </div>
          <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                Add ceremony
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add ceremony session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSession} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sess-title">Ceremony name</Label>
                  <Input
                    id="sess-title"
                    required
                    placeholder="e.g. Gaye Holud / শুভ গায়ে হলুদ"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sess-start">Date &amp; time</Label>
                  <Input
                    id="sess-start"
                    type="datetime-local"
                    required
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sess-venue">Venue (optional)</Label>
                  <Input
                    id="sess-venue"
                    placeholder="e.g. Lawn Courtyard"
                    value={sessionVenue}
                    onChange={(e) => setSessionVenue(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSessionDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingSession}>
                    {savingSession ? "Saving…" : "Save ceremony"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No extra ceremony sessions added yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="font-medium">{s.title}</span>
                  </div>
                  {s.venue?.name && (
                    <span className="text-xs text-muted-foreground">{s.venue.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
