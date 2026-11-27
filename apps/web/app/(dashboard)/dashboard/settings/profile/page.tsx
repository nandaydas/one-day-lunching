// ============================================================
// Nimantro — User Profile & Settings Page
// apps/web/app/(dashboard)/dashboard/settings/profile/page.tsx
// ============================================================

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getPlanEntitlements } from "@nimantro/guest-management";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@nimantro/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { getClientDb } from "@/lib/firebase-client";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { t, setLocale, formatNumber } = useLocale();

  const [displayName, setDisplayName] = React.useState("");
  const [preferredLanguage, setPreferredLanguage] = React.useState<"bn" | "en">("bn");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setPreferredLanguage(profile.preferredLanguage);
    } else if (user) {
      setDisplayName(user.displayName ?? "");
    }
  }, [profile, user]);

  const entitlements = getPlanEntitlements("free");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const db = getClientDb();
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        preferredLanguage,
        updatedAt: serverTimestamp(),
      });
      await setLocale(preferredLanguage, false);
      await refreshProfile();
      toast({ title: t("common.success"), variant: "success" });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground">
          {t("settings.heading")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.subheading")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.hostProfile")}</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">{t("settings.displayName")}</Label>
              <Input
                id="prof-name"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-lang">{t("settings.preferredLanguage")}</Label>
              <Select
                value={preferredLanguage}
                onValueChange={(v) => setPreferredLanguage(v as "bn" | "en")}
              >
                <SelectTrigger id="prof-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("settings.saving") : t("settings.saveChanges")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
              >
                {t("auth.signOut")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("settings.currentPlan")}</CardTitle>
            <CardDescription>{t("settings.freeTier")}</CardDescription>
          </div>
          <Badge variant="accent">{t("settings.freeBadge")}</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("settings.activeEventsLimit")}</p>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {formatNumber(entitlements.maxActiveEvents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("settings.guestLimit")}</p>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {formatNumber(entitlements.maxGuestGroups)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
