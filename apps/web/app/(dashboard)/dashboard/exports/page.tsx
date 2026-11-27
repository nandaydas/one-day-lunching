// ============================================================
// Nimantro — Exports Page
// apps/web/app/(dashboard)/dashboard/exports/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Download, ExternalLink, FileDown } from "lucide-react";
import type { EventDocument, ExportJob, InvitationDocument } from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
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

export default function ExportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [exportsList, setExportsList] = React.useState<ExportJob[]>([]);
  const [publishedInvitations, setPublishedInvitations] = React.useState<
    { eventId: string; eventTitle: string; inv: InvitationDocument }[]
  >([]);
  const [selectedInvKey, setSelectedInvKey] = React.useState("");
  const [format, setFormat] = React.useState<"pdf" | "png" | "jpg">("pdf");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const loadExports = React.useCallback(async () => {
    if (!user || !isFirebaseClientConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const db = getClientDb();
      const [expSnap, evSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "exports"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          )
        ),
        getDocs(query(collection(db, "events"), where("ownerId", "==", user.uid))),
      ]);

      setExportsList(expSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExportJob));

      const pubList: { eventId: string; eventTitle: string; inv: InvitationDocument }[] =
        [];
      await Promise.all(
        evSnap.docs.map(async (evDoc) => {
          const ev = evDoc.data() as EventDocument;
          const invSnap = await getDocs(collection(evDoc.ref, "invitations"));
          for (const d of invSnap.docs) {
            const inv = { id: d.id, ...d.data() } as InvitationDocument;
            if (inv.status === "published" && inv.publishedVersionId) {
              pubList.push({ eventId: evDoc.id, eventTitle: ev.title, inv });
            }
          }
        })
      );
      setPublishedInvitations(pubList);
      if (pubList.length > 0) {
        setSelectedInvKey(`${pubList[0].eventId}::${pubList[0].inv.id}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!authLoading) void loadExports();
  }, [authLoading, loadExports]);

  async function handleCreateExport() {
    const match = publishedInvitations.find(
      (item) => `${item.eventId}::${item.inv.id}` === selectedInvKey
    );
    if (!match || !match.inv.publishedVersionId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: match.eventId,
          invitationId: match.inv.id,
          versionId: match.inv.publishedVersionId,
          format,
          pageSize: "a4",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to queue export.");
      toast({ title: t("exports.queuedToast"), variant: "success" });
      await loadExports();
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
          {t("exports.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("exports.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("exports.newJob")}</CardTitle>
          <CardDescription>
            {t("exports.newJobDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedInvKey} onValueChange={setSelectedInvKey}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("exports.selectPublished")} />
            </SelectTrigger>
            <SelectContent>
              {publishedInvitations.map((item) => (
                <SelectItem
                  key={`${item.eventId}::${item.inv.id}`}
                  value={`${item.eventId}::${item.inv.id}`}
                >
                  {item.eventTitle} — {item.inv.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={format}
            onValueChange={(v) => setFormat(v as "pdf" | "png" | "jpg")}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            disabled={!selectedInvKey || submitting}
            onClick={handleCreateExport}
          >
            <FileDown className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {submitting ? t("exports.queueing") : t("exports.queue")}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : exportsList.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Download strokeWidth={1.5} />}
            title={t("exports.emptyTitle")}
            description={t("exports.emptyDesc")}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border pt-5">
            {exportsList.map((job) => (
              <div
                key={job.id}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      {job.format.toUpperCase()}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{job.id}</p>
                </div>
                {job.downloadUrl ? (
                  <Link href={job.downloadUrl} target="_blank">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      {t("exports.download")}
                    </Button>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {job.status === "queued" ? "Waiting for worker" : job.status}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
