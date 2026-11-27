// ============================================================
// Nimantro — Public Invitation Interactive Shell
// apps/web/components/invitation/PublicInvitationView.tsx
// ============================================================

"use client";

import * as React from "react";
import { Lock, Printer, Share2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
} from "@nimantro/ui";
import type { PublicInvitationPayload } from "@/lib/public-invitation-server";
import { InvitationRenderer } from "./InvitationRenderer";
import { RSVPFormCard } from "./RSVPFormCard";

interface PublicInvitationViewProps {
  slug: string;
  token?: string;
  initialPayload: PublicInvitationPayload | null;
  requiresPassword: boolean;
}

export function PublicInvitationView({
  slug,
  token,
  initialPayload,
  requiresPassword,
}: PublicInvitationViewProps) {
  const [payload, setPayload] = React.useState<PublicInvitationPayload | null>(
    initialPayload
  );
  const [password, setPassword] = React.useState("");
  const [unlocking, setUnlocking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<"bn" | "en">(
    initialPayload?.invitation.designDocument.language === "bn" ? "bn" : "en"
  );

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnlocking(true);
    try {
      const res = await fetch("/api/invitations/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, token, password }),
      });
      const json = (await res.json()) as PublicInvitationPayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Incorrect password.");
      }
      setPayload(json);
      setLocale(json.invitation.designDocument.language === "bn" ? "bn" : "en");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock invitation.");
    } finally {
      setUnlocking(false);
    }
  }

  const canShareAndPrint = Boolean(payload?.viewer?.canShareAndPrint);

  async function handleShare() {
    if (!canShareAndPrint) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload?.event.title ?? "Nimantro Invitation",
          url,
        });
        return;
      } catch {
        // user cancelled or unsupported
      }
    }
    await navigator.clipboard.writeText(url);
    toast({ title: "Invitation link copied", variant: "success" });
  }

  if (!payload && requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-celebration px-4">
        <Card className="w-full max-w-md shadow-elevated">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle>Protected Invitation</CardTitle>
            <CardDescription>
              Enter the invitation passcode shared by your host.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="invite-passcode">Passcode</Label>
                <Input
                  id="invite-passcode"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode"
                />
              </div>
              <Button type="submit" className="w-full" disabled={unlocking}>
                {unlocking ? "Verifying…" : "View invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-3 sm:px-6 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Utility bar — visible only to the event creator and authorised inviters */}
        {canShareAndPrint && (
          <div className="no-print flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {payload.event.title}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                Share
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                Print / PDF
              </Button>
            </div>
          </div>
        )}

        {!canShareAndPrint && (
          <div className="hidden print:block rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Printing and sharing are restricted to the event host and authorised inviters.
          </div>
        )}

        <div className={!canShareAndPrint ? "print:hidden" : undefined}>
          <InvitationRenderer
            design={payload.invitation.designDocument}
            eventMeta={{
              title: payload.event.title,
              startAt: payload.event.startAt,
              endAt: payload.event.endAt,
              timezone: payload.event.timezone,
              venue: payload.event.venue,
              hostNames: payload.event.hostNames,
              sessions: payload.sessions,
            }}
            locale={locale}
            onLocaleChange={setLocale}
            interactive
            rsvpSlot={
              token && payload.guestContext ? (
                <RSVPFormCard
                  token={token}
                  locale={locale}
                  guestContext={payload.guestContext}
                />
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
