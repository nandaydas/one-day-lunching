// ============================================================
// Nimantro — Events List Page
// apps/web/app/(dashboard)/dashboard/events/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import type { EventDocument, EventStatus } from "@nimantro/types";
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
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  toast,
} from "@nimantro/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

export default function EventsListPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, formatNumber } = useLocale();
  const [events, setEvents] = React.useState<EventDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<EventStatus | "all">("all");
  const [deletingEvent, setDeletingEvent] = React.useState<EventDocument | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const loadEvents = React.useCallback(async () => {
    if (!user || !isFirebaseClientConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const db = getClientDb();
      const snap = await getDocs(
        query(
          collection(db, "events"),
          where("ownerId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
      );
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventDocument));
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!authLoading) void loadEvents();
  }, [authLoading, loadEvents]);

  async function handleArchive(ev: EventDocument) {
    setBusyId(ev.id);
    try {
      const nextStatus: EventStatus =
        ev.status === "archived" ? "draft" : "archived";
      const res = await fetch(`/api/events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update event status.");
      setEvents((prev) =>
        prev.map((item) =>
          item.id === ev.id ? { ...item, status: nextStatus } : item
        )
      );
      toast({
        title: nextStatus === "archived" ? "Event archived" : "Event restored",
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingEvent) return;
    setBusyId(deletingEvent.id);
    try {
      const res = await fetch(`/api/events/${deletingEvent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Could not delete event.");
      }
      setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
      toast({ title: "Event deleted", variant: "success" });
      setDeletingEvent(null);
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

  const filtered = events.filter((ev) => {
    if (statusFilter !== "all" && ev.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
            {t("events.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("events.subtitle")}
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t("events.newEvent")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Input
            placeholder={t("events.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as EventStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("events.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("events.draft")}</SelectItem>
            <SelectItem value="published">{t("events.published")}</SelectItem>
            <SelectItem value="archived">{t("events.archived")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays strokeWidth={1.5} />}
            title={t("events.noMatching")}
            description={t("events.noMatchingDesc")}
            action={
              <Link href="/dashboard/events/new">
                <Button>{t("events.createEvent")}</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => (
            <Card key={ev.id} className="overflow-hidden">
              <div className="flex">
                <div
                  className={`w-1 shrink-0 ${
                    ev.status === "published"
                      ? "bg-primary"
                      : ev.status === "draft"
                      ? "bg-accent"
                      : "bg-border"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/events/${ev.id}`}
                        className="text-base font-medium text-foreground hover:underline underline-offset-4 truncate"
                      >
                        {ev.title}
                      </Link>
                      <StatusBadge status={ev.status} label={t(`events.${ev.status}`)} />
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t(`event.${ev.category}`)} · {ev.hostNames.join(", ")} ·{" "}
                      {formatNumber(ev.guestGroupCount ?? 0)} {t("dashboard.households")} ·{" "}
                      {formatNumber(ev.confirmedPersonCount ?? 0)} /{" "}
                      {formatNumber(ev.invitedPersonCount ?? 0)} {t("dashboard.confirmed")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link href={`/dashboard/events/${ev.id}`}>
                      <Button size="sm" variant="default">
                        {t("events.open")}
                      </Button>
                    </Link>
                    <Link href={`/dashboard/events/${ev.id}/guests`}>
                      <Button size="sm" variant="outline">
                        <Users className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        {t("dashboard.guests")}
                      </Button>
                    </Link>
                    <Link href={`/dashboard/events/${ev.id}/analytics`}>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                        {t("dashboard.analytics")}
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busyId === ev.id}
                      onClick={() => handleArchive(ev)}
                      title={
                        ev.status === "archived"
                          ? t("events.restore")
                          : t("events.archive")
                      }
                    >
                      <Archive className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busyId === ev.id}
                      onClick={() => setDeletingEvent(ev)}
                      title={t("events.deleteForever")}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(deletingEvent)}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deletingEvent?.title}</DialogTitle>
            <DialogDescription>
              {t("events.deleteConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingEvent(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={Boolean(busyId)}
            >
              {busyId ? t("events.deleting") : t("events.deleteForever")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
