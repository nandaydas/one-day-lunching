// ============================================================
// Nimantro — Dashboard Overview Page
// apps/web/app/(dashboard)/dashboard/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import type { EventDocument, Language } from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusBadge,
  cn,
} from "@nimantro/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

function formatLanguageLabel(language: Language, t: (key: string) => string): string {
  if (language === "bn") return t("newEvent.langBn");
  if (language === "en") return t("newEvent.langEn");
  return t("newEvent.langBoth");
}

function getEventAccentClass(status: EventDocument["status"]): string {
  if (status === "published") return "bg-primary";
  if (status === "draft") return "bg-accent";
  return "bg-border";
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, formatNumber } = useLocale();
  const [events, setEvents] = React.useState<EventDocument[]>([]);
  const [exportCount, setExportCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user || !isFirebaseClientConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const db = getClientDb();
        const [evSnap, exSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "events"),
              where("ownerId", "==", user!.uid),
              orderBy("createdAt", "desc")
            )
          ),
          getDocs(query(collection(db, "exports"), where("userId", "==", user!.uid))),
        ]);

        if (!cancelled) {
          setEvents(evSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventDocument));
          setExportCount(exSnap.size);
        }
      } catch {
        // Ignore offline/emulator errors cleanly
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const activeEventsList = events.filter((e) => e.status !== "archived");
  const publishedEvents = events.filter((e) => e.status === "published").length;
  const draftEvents = events.filter((e) => e.status === "draft").length;
  const totalHouseholds = events.reduce((acc, e) => acc + (e.guestGroupCount ?? 0), 0);
  const totalInvited = events.reduce((acc, e) => acc + (e.invitedPersonCount ?? 0), 0);
  const totalConfirmed = events.reduce(
    (acc, e) => acc + (e.confirmedPersonCount ?? 0),
    0
  );
  const totalAwaiting = Math.max(0, totalInvited - totalConfirmed);
  const confirmRate =
    totalInvited > 0 ? Math.round((totalConfirmed / totalInvited) * 100) : 0;

  const stats = [
    {
      label: t("dashboard.activeEvents"),
      value: formatNumber(activeEventsList.length),
      meta: `${formatNumber(publishedEvents)} ${t("dashboard.publishedCount")} · ${formatNumber(
        draftEvents
      )} ${t("dashboard.draftCount")}`,
    },
    {
      label: t("dashboard.totalGuestsInvited"),
      value: formatNumber(totalInvited),
      meta: `${formatNumber(totalHouseholds)} ${t("dashboard.households")}`,
    },
    {
      label: t("dashboard.confirmedRate"),
      value: `${formatNumber(confirmRate)}%`,
      meta:
        totalInvited > 0
          ? `${formatNumber(totalConfirmed)} / ${formatNumber(totalInvited)} ${t(
              "dashboard.confirmed"
            )}`
          : t("dashboard.noInvitedYet"),
    },
    {
      label: t("dashboard.exports"),
      value: formatNumber(exportCount),
      meta: t("dashboard.rendersReady"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
            {t("nav.overview")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.overviewSubtitle")}
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t("dashboard.createEvent")}
          </Button>
        </Link>
      </div>

      {/* Unified Stats Ledger */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="flex h-0.5 w-full bg-border/60" aria-hidden="true">
          <div className="w-24 bg-primary" />
          <div className="w-10 bg-accent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {stats.map((stat) => (
            <div key={stat.label} className="p-5">
              <p className="text-xs font-normal text-muted-foreground">{stat.label}</p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="mt-2 text-[28px] leading-none font-medium tabular-nums text-foreground">
                  {stat.value}
                </p>
              )}
              <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                {stat.meta}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Celebrations + Response Ledger */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">
            {t("dashboard.recentEvents")}
          </h2>
          <Link
            href="/dashboard/events"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-6">
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : events.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarDays strokeWidth={1.5} />}
              title={t("dashboard.noEventsYet")}
              description={t("dashboard.noEventsDesc")}
              action={
                <Link href="/dashboard/events/new">
                  <Button>
                    <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    {t("dashboard.createFirstEvent")}
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-6 items-start">
            {/* Celebration Folios */}
            <div className="space-y-3">
              {events.slice(0, 4).map((ev) => {
                const invited = ev.invitedPersonCount ?? 0;
                const confirmed = ev.confirmedPersonCount ?? 0;
                const eventRate = invited > 0 ? Math.round((confirmed / invited) * 100) : 0;

                return (
                  <Card key={ev.id} className="overflow-hidden">
                    <div className="flex">
                      <div
                        className={cn("w-1 shrink-0", getEventAccentClass(ev.status))}
                        aria-hidden="true"
                      />
                      <div className="flex-1 p-5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/dashboard/events/${ev.id}`}
                                className="text-base font-medium text-foreground hover:underline underline-offset-4 truncate"
                              >
                                {ev.title}
                              </Link>
                              <StatusBadge
                                status={ev.status}
                                label={t(`events.${ev.status}`)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t(`event.${ev.category}`)} ·{" "}
                              {formatLanguageLabel(ev.language, t)}
                            </p>
                          </div>

                          <div className="text-right tabular-nums">
                            <p className="text-sm font-medium text-foreground">
                              {formatNumber(confirmed)} / {formatNumber(invited)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(eventRate)}% {t("dashboard.confirmed")}
                            </p>
                          </div>
                        </div>

                        <div
                          className="h-1 w-full overflow-hidden rounded-[2px] bg-secondary"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full w-full origin-left bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{ transform: `scaleX(${Math.min(100, eventRate) / 100})` }}
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                          <Link
                            href={`/dashboard/events/${ev.id}`}
                            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-4"
                          >
                            {t("dashboard.openStudio")}
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          </Link>
                          <Link
                            href={`/dashboard/events/${ev.id}/guests`}
                            className="tabular-nums text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {formatNumber(ev.guestGroupCount ?? 0)}{" "}
                            {t("dashboard.households")} · {t("dashboard.guestsAndRsvps")}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Household Response Ledger */}
            <Card className="border-t-2 border-t-primary">
              <CardHeader>
                <CardTitle>{t("dashboard.responseSummary")}</CardTitle>
                <CardDescription>
                  {t("dashboard.responseSummaryDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("dashboard.confirmedRate")}
                    </span>
                    <span className="text-xl font-medium tabular-nums text-foreground">
                      {formatNumber(confirmRate)}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-[2px] bg-secondary"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full w-full origin-left bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ transform: `scaleX(${Math.min(100, confirmRate) / 100})` }}
                    />
                  </div>
                </div>

                <dl className="divide-y divide-border text-sm">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-muted-foreground">{t("dashboard.totalHouseholds")}</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {formatNumber(totalHouseholds)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-muted-foreground">{t("dashboard.confirmedPeople")}</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {formatNumber(totalConfirmed)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-muted-foreground">{t("dashboard.pendingPeople")}</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatNumber(totalAwaiting)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-muted-foreground">{t("events.published")}</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatNumber(publishedEvents)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <dt className="text-muted-foreground">{t("events.draft")}</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatNumber(draftEvents)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
