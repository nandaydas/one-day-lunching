// ============================================================
// Nimantro — Event Attendance Analytics Page
// apps/web/app/(dashboard)/dashboard/events/[eventId]/analytics/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import {
  calculateEventAttendanceStats,
  calculateHouseholdSummary,
} from "@nimantro/guest-management";
import type {
  CheckInDocument,
  EventDocument,
  GuestGroupDocument,
  RSVPDocument,
} from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusBadge,
} from "@nimantro/ui";
import { useLocale } from "@/hooks/useLocale";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

export default function EventAnalyticsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { t, formatNumber } = useLocale();

  const [event, setEvent] = React.useState<EventDocument | null>(null);
  const [groups, setGroups] = React.useState<GuestGroupDocument[]>([]);
  const [rsvps, setRsvps] = React.useState<RSVPDocument[]>([]);
  const [checkIns, setCheckIns] = React.useState<CheckInDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isFirebaseClientConfigured() || !eventId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const db = getClientDb();
        const evRef = doc(db, "events", eventId);
        const [evSnap, grpSnap, rsvpSnap, chkSnap] = await Promise.all([
          getDoc(evRef),
          getDocs(collection(evRef, "guestGroups")),
          getDocs(collection(evRef, "rsvps")),
          getDocs(collection(evRef, "checkIns")),
        ]);

        if (evSnap.exists()) setEvent({ id: evSnap.id, ...evSnap.data() } as EventDocument);
        setGroups(grpSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as GuestGroupDocument));
        setRsvps(rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RSVPDocument));
        setCheckIns(chkSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CheckInDocument));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [eventId]);

  const stats = React.useMemo(
    () => calculateEventAttendanceStats(eventId, groups, rsvps, checkIns),
    [eventId, groups, rsvps, checkIns]
  );

  const households = React.useMemo(() => {
    const rsvpMap = new Map(rsvps.map((r) => [r.groupId, r]));
    return groups.map((g) => calculateHouseholdSummary(g, rsvpMap.get(g.id)));
  }, [groups, rsvps]);

  const kpis = [
    {
      label: t("analytics.totalInvited"),
      value: formatNumber(stats.totalInvitedPeople),
      sub: `${formatNumber(stats.totalInvitedAdults)} ${t("analytics.adults")} · ${formatNumber(
        stats.totalInvitedChildren
      )} ${t("analytics.children")}`,
    },
    {
      label: t("analytics.confirmed"),
      value: formatNumber(stats.totalConfirmedPeople),
      sub: `${formatNumber(stats.totalConfirmedAdults)} ${t("analytics.adults")} · ${formatNumber(
        stats.totalConfirmedChildren
      )} ${t("analytics.children")}`,
    },
    {
      label: t("analytics.pending"),
      value: formatNumber(stats.totalPending),
      sub: `${formatNumber(stats.totalMaybe)} ${t("analytics.maybe")}`,
    },
    {
      label: t("analytics.declined"),
      value: formatNumber(stats.totalDeclined),
      sub: `${formatNumber(Math.round(stats.rsvpResponseRate * 100))}% ${t(
        "analytics.responseRate"
      )}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/events/${eventId}`}>
          <Button variant="ghost" size="icon" aria-label={t("analytics.backToEvent")}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </Link>
        <div>
          <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
            {t("analytics.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {event?.title ?? t("nav.events")} · {formatNumber(stats.totalGuestGroups)}{" "}
            {t("dashboard.households")}
          </p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
            <div className="flex h-0.5 w-full bg-border/60" aria-hidden="true">
              <div className="w-24 bg-primary" />
              <div className="w-10 bg-accent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {kpis.map((k) => (
                <div key={k.label} className="p-5">
                  <p className="text-xs font-normal text-muted-foreground">{k.label}</p>
                  <p className="mt-2 text-[28px] leading-none font-medium tabular-nums text-foreground">
                    {k.value}
                  </p>
                  <p className="mt-2 text-xs tabular-nums text-muted-foreground">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.householdBreakdown")}</CardTitle>
              <CardDescription>
                {t("analytics.householdBreakdownDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {households.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("analytics.noHouseholds")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2.5 pr-4 font-medium">
                          {t("analytics.householdCol")}
                        </th>
                        <th className="py-2.5 pr-4 font-medium">
                          {t("analytics.statusCol")}
                        </th>
                        <th className="py-2.5 px-4 text-right font-medium">
                          {t("analytics.invitedCol")}
                        </th>
                        <th className="py-2.5 px-4 text-right font-medium">
                          {t("analytics.confirmedCol")}
                        </th>
                        <th className="py-2.5 pl-4 text-right font-medium">
                          {t("analytics.pendingCol")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {households.map((h) => (
                        <tr
                          key={h.groupId}
                          className="transition-colors hover:bg-secondary/40"
                        >
                          <td className="py-3 pr-4 font-medium text-foreground">
                            {h.groupName}
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={h.status} />
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                            {formatNumber(h.invitedPeople)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium tabular-nums text-foreground">
                            {formatNumber(h.expectedAttendance)}
                          </td>
                          <td className="py-3 pl-4 text-right tabular-nums text-muted-foreground">
                            {formatNumber(h.pendingPeople)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
