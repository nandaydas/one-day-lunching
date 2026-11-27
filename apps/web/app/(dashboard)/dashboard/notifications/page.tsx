// ============================================================
// Nimantro — Notifications Inbox Page
// apps/web/app/(dashboard)/dashboard/notifications/page.tsx
// ============================================================

"use client";

import * as React from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationDocument } from "@nimantro/types";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
  toast,
} from "@nimantro/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { getClientDb, isFirebaseClientConfigured } from "@/lib/firebase-client";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [items, setItems] = React.useState<NotificationDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadNotifications = React.useCallback(async () => {
    if (!user || !isFirebaseClientConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const db = getClientDb();
      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
      );
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationDocument)
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!authLoading) void loadNotifications();
  }, [authLoading, loadNotifications]);

  async function markRead(id: string) {
    const db = getClientDb();
    await updateDoc(doc(db, "notifications", id), { read: true });
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  async function markAllRead() {
    const unread = items.filter((i) => !i.read);
    if (unread.length === 0) return;
    const db = getClientDb();
    const batch = writeBatch(db);
    for (const item of unread) {
      batch.update(doc(db, "notifications", item.id), { read: true });
    }
    await batch.commit();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    toast({ title: t("notifications.allReadToast") });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
            {t("notifications.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notifications.subtitle")}
          </p>
        </div>
        {items.some((i) => !i.read) && (
          <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell strokeWidth={1.5} />}
            title={t("notifications.emptyTitle")}
            description={t("notifications.emptyDesc")}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border pt-5">
            {items.map((n) => (
              <div
                key={n.id}
                className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => markRead(n.id)}
                  >
                    {t("notifications.markRead")}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
