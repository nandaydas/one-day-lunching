// ============================================================
// Nimantro — Household Guest Management & RSVP Links Page
// apps/web/app/(dashboard)/dashboard/events/[eventId]/guests/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import {
  ArrowLeft,
  Copy,
  Download,
  Link2,
  MessageCircle,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  buildWhatsAppShareUrl,
  exportGuestsToCSV,
  parseGuestCSV,
} from "@nimantro/guest-management";
import type {
  EventDocument,
  GuestGroupDocument,
  InvitationDocument,
  RSVPDocument,
} from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Skeleton,
  StatusBadge,
  Textarea,
  toast,
} from "@nimantro/ui";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

export default function EventGuestsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [event, setEvent] = React.useState<EventDocument | null>(null);
  const [invitations, setInvitations] = React.useState<InvitationDocument[]>([]);
  const [groups, setGroups] = React.useState<GuestGroupDocument[]>([]);
  const [rsvps, setRsvps] = React.useState<RSVPDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Generated personal share links (in memory per session)
  const [generatedLinks, setGeneratedLinks] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Add Household Dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [adults, setAdults] = React.useState(2);
  const [childrenCount, setChildrenCount] = React.useState(0);
  const [memberNames, setMemberNames] = React.useState("");

  // CSV Import Dialog
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState(
    "groupName,primaryContactName,phone,email,invitedAdults,invitedChildren\n"
  );

  const loadGuests = React.useCallback(async () => {
    if (!isFirebaseClientConfigured() || !eventId) {
      setLoading(false);
      return;
    }
    try {
      const db = getClientDb();
      const evRef = doc(db, "events", eventId);
      const [evSnap, invSnap, grpSnap, rsvpSnap] = await Promise.all([
        getDoc(evRef),
        getDocs(collection(evRef, "invitations")),
        getDocs(query(collection(evRef, "guestGroups"), orderBy("createdAt", "desc"))),
        getDocs(collection(evRef, "rsvps")),
      ]);

      if (evSnap.exists()) setEvent({ id: evSnap.id, ...evSnap.data() } as EventDocument);
      setInvitations(
        invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as InvitationDocument)
      );
      setGroups(grpSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as GuestGroupDocument));
      setRsvps(rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RSVPDocument));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    void loadGuests();
  }, [loadGuests]);

  const rsvpByGroup = React.useMemo(() => {
    const map = new Map<string, RSVPDocument>();
    for (const r of rsvps) map.set(r.groupId, r);
    return map;
  }, [rsvps]);

  const csvPreview = React.useMemo(() => parseGuestCSV(csvText), [csvText]);

  async function handleAddHousehold(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("add");
    try {
      const members = memberNames
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((fullName) => ({ fullName, type: "adult" as const }));

      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          groups: [
            {
              groupName: groupName.trim(),
              primaryContactName: contactName.trim(),
              phone: phone.trim() || undefined,
              email: email.trim() || undefined,
              invitedAdults: Number(adults),
              invitedChildren: Number(childrenCount),
              members: members.length > 0 ? members : undefined,
            },
          ],
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to add household.");

      toast({ title: "Household added!", variant: "success" });
      setGroupName("");
      setContactName("");
      setPhone("");
      setEmail("");
      setAdults(2);
      setChildrenCount(0);
      setMemberNames("");
      setAddOpen(false);
      await loadGuests();
    } catch (err) {
      toast({
        title: "Could not add household",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCSVImport() {
    if (csvPreview.validRows.length === 0) return;
    setBusyId("csv");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          groups: csvPreview.validRows,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "CSV import failed.");

      toast({
        title: `Imported ${csvPreview.validRows.length} household(s)`,
        variant: "success",
      });
      setCsvOpen(false);
      await loadGuests();
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerateLink(group: GuestGroupDocument) {
    const primaryInv =
      invitations.find((i) => i.status === "published") ?? invitations[0];
    if (!primaryInv) {
      toast({
        title: "Create an invitation first",
        variant: "destructive",
      });
      return;
    }

    setBusyId(group.id);
    try {
      const res = await fetch("/api/guests/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          groupId: group.id,
          invitationId: primaryInv.id,
        }),
      });
      const json = (await res.json()) as {
        sharePath?: string | null;
        token?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to generate link.");

      const fullUrl = json.sharePath
        ? `${window.location.origin}${json.sharePath}`
        : `${window.location.origin}/i/${primaryInv.slug}?token=${json.token}`;

      setGeneratedLinks((prev) => ({ ...prev, [group.id]: fullUrl }));
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Personal guest link copied!",
        description:
          primaryInv.status !== "published"
            ? "Publish your invitation before sharing this link publicly."
            : fullUrl,
        variant: "success",
      });
      await loadGuests();
    } catch (err) {
      toast({
        title: "Failed to generate link",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setBusyId(groupId);
    try {
      const res = await fetch(
        `/api/guests?eventId=${encodeURIComponent(eventId)}&groupId=${encodeURIComponent(
          groupId
        )}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove household.");
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast({ title: "Household removed" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleExportCSV() {
    const csv = exportGuestsToCSV(groups, rsvps);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event?.title ?? "nimantro"}-guests.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/events/${eventId}`}>
            <Button variant="ghost" size="icon" aria-label="Back to event">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
              Household guest list
            </h1>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {event?.title ?? "Event"} · {groups.length}{" "}
              {groups.length === 1 ? "household" : "households"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={groups.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>

          <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Import guest households from CSV</DialogTitle>
                <DialogDescription>
                  Required columns: <code>groupName,primaryContactName</code>. Optional:{" "}
                  <code>phone,email,invitedAdults,invitedChildren</code>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-700 font-medium">
                    {csvPreview.validRows.length} valid row(s)
                  </span>
                  {csvPreview.errors.length > 0 && (
                    <span className="text-destructive">
                      {csvPreview.errors.length} row(s) with errors
                    </span>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCsvOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCSVImport}
                  disabled={csvPreview.validRows.length === 0 || busyId === "csv"}
                >
                  {busyId === "csv"
                    ? "Importing…"
                    : `Import ${csvPreview.validRows.length} households`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add household
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add guest household</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddHousehold} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="g-name">Household / Family name</Label>
                  <Input
                    id="g-name"
                    required
                    placeholder="e.g. Chatterjee Family"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-contact">Primary contact name</Label>
                  <Input
                    id="g-contact"
                    required
                    placeholder="e.g. Arjun Chatterjee"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="g-phone">Phone / WhatsApp</Label>
                    <Input
                      id="g-phone"
                      placeholder="+91 98300 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="g-email">Email (optional)</Label>
                    <Input
                      id="g-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="g-adults">Invited adults</Label>
                    <Input
                      id="g-adults"
                      type="number"
                      min={0}
                      max={500}
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="g-children">Invited children</Label>
                    <Input
                      id="g-children"
                      type="number"
                      min={0}
                      max={100}
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-members">
                    Individual member names (comma-separated, optional)
                  </Label>
                  <Input
                    id="g-members"
                    placeholder="e.g. Arjun Chatterjee, Poulomi Chatterjee"
                    value={memberNames}
                    onChange={(e) => setMemberNames(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busyId === "add"}>
                    {busyId === "add" ? "Saving…" : "Save household"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users />}
            title="No guest households yet"
            description="Add families manually or bulk import a CSV to generate personal RSVP links."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add first household
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invited Households</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {groups.map((g) => {
              const rsvp = rsvpByGroup.get(g.id);
              const link = generatedLinks[g.id];
              const whatsappUrl = link
                ? buildWhatsAppShareUrl(
                    `নমস্কার ${g.primaryContactName}, "${event?.title ?? "Nimantro"}" অনুষ্ঠানে আপনার সপরিবার আমন্ত্রণ: ${link}`,
                    g.phone
                  )
                : null;

              return (
                <div
                  key={g.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{g.groupName}</span>
                      <StatusBadge status={rsvp ? rsvp.status : g.status} />
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {g.primaryContactName}
                      {g.phone ? ` · ${g.phone}` : ""} · Invited:{" "}
                      {g.invitedAdults} {g.invitedAdults === 1 ? "adult" : "adults"},{" "}
                      {g.invitedChildren}{" "}
                      {g.invitedChildren === 1 ? "child" : "children"}
                      {rsvp?.status === "accepted" &&
                        ` · Confirmed: ${rsvp.confirmedAdults} ${
                          rsvp.confirmedAdults === 1 ? "adult" : "adults"
                        }, ${rsvp.confirmedChildren} ${
                          rsvp.confirmedChildren === 1 ? "child" : "children"
                        }`}
                    </p>
                    {rsvp?.message && (
                      <p className="text-xs text-foreground/80">
                        &ldquo;{rsvp.message}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === g.id}
                      onClick={() => handleGenerateLink(g)}
                    >
                      <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      {link ? "Regenerate link" : "Generate RSVP link"}
                    </Button>

                    {link && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await navigator.clipboard.writeText(link);
                            toast({ title: "Copied", variant: "success" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          Copy
                        </Button>
                        {whatsappUrl && (
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <Button type="button" size="sm" variant="gold">
                              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                      </>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busyId === g.id}
                      onClick={() => handleDeleteGroup(g.id)}
                      aria-label={`Remove ${g.groupName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
