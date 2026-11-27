// ============================================================
// Nimantro — Family RSVP Form Component
// apps/web/components/invitation/RSVPFormCard.tsx
// ============================================================

"use client";

import * as React from "react";
import { CheckCircle2, HelpCircle, Minus, Plus, XCircle } from "lucide-react";
import { toBengaliDigits } from "@nimantro/i18n";
import { Button, Input, Label, Textarea, toast } from "@nimantro/ui";
import type { PublicInvitationPayload } from "@/lib/public-invitation-server";

interface RSVPFormCardProps {
  token: string;
  locale: "bn" | "en";
  guestContext: NonNullable<PublicInvitationPayload["guestContext"]>;
}

type RsvpChoice = "accepted" | "declined" | "maybe";

export function RSVPFormCard({ token, locale, guestContext }: RSVPFormCardProps) {
  const { group, guests, guestInvitation, existingRsvp } = guestContext;
  const maxAdults = guestInvitation.allowedAdults;
  const maxChildren = guestInvitation.allowedChildren;

  const [status, setStatus] = React.useState<RsvpChoice>(
    existingRsvp && existingRsvp.status !== "pending"
      ? existingRsvp.status
      : "accepted"
  );
  const [adults, setAdults] = React.useState<number>(
    existingRsvp?.status === "accepted"
      ? existingRsvp.confirmedAdults
      : Math.min(maxAdults, group.invitedAdults)
  );
  const [children, setChildren] = React.useState<number>(
    existingRsvp?.status === "accepted"
      ? existingRsvp.confirmedChildren
      : Math.min(maxChildren, group.invitedChildren)
  );
  const [memberAttendance, setMemberAttendance] = React.useState<Record<string, boolean>>(
    () => {
      const map: Record<string, boolean> = {};
      for (const g of guests) {
        const prev = existingRsvp?.memberResponses?.find((m) => m.guestId === g.id);
        map[g.id] = prev ? prev.attending : g.invitationStatus !== "declined";
      }
      return map;
    }
  );
  const [mealPreference, setMealPreference] = React.useState(
    existingRsvp?.mealPreference ?? ""
  );
  const [specialRequirements, setSpecialRequirements] = React.useState(
    existingRsvp?.specialRequirements ?? ""
  );
  const [message, setMessage] = React.useState(existingRsvp?.message ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(
    Boolean(existingRsvp && existingRsvp.status !== "pending")
  );
  const [error, setError] = React.useState<string | null>(null);

  const fmt = (n: number) => (locale === "bn" ? toBengaliDigits(n) : String(n));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const memberResponses =
        guests.length > 0
          ? guests.map((g) => ({
              guestId: g.id,
              attending: status === "accepted" ? Boolean(memberAttendance[g.id]) : false,
            }))
          : undefined;

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          status,
          confirmedAdults: status === "accepted" ? adults : 0,
          confirmedChildren: status === "accepted" ? children : 0,
          memberResponses,
          mealPreference: mealPreference.trim() || undefined,
          specialRequirements: specialRequirements.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit RSVP.");
      }

      setSubmitted(true);
      toast({
        title: locale === "bn" ? "ধন্যবাদ!" : "RSVP Confirmed",
        description: data.message,
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit response.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 rounded-xl border border-green-200 bg-green-50/70 p-5 text-center text-green-950">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-700" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-base">
            {locale === "bn"
              ? "আপনার সাড়া নথিভুক্ত হয়েছে"
              : "Your response has been recorded"}
          </p>
          <p className="text-xs text-green-900/80">
            {group.groupName} ·{" "}
            {status === "accepted"
              ? locale === "bn"
                ? `${fmt(adults)} জন বড়, ${fmt(children)} জন শিশু নিশ্চিত`
                : `${adults} adult(s), ${children} child(ren) confirmed`
              : status === "declined"
              ? locale === "bn"
                ? "অনুপস্থিতি জানানো হয়েছে"
                : "Marked as unable to attend"
              : locale === "bn"
              ? "সম্ভবত উপস্থিত থাকবেন"
              : "Marked as maybe"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSubmitted(false)}
        >
          {locale === "bn" ? "উত্তর পরিবর্তন করুন" : "Update response"}
        </Button>
      </div>
    );
  }

  const options: {
    id: RsvpChoice;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "accepted",
      label: locale === "bn" ? "আমি উপস্থিত থাকব" : "I will attend",
      icon: CheckCircle2,
    },
    {
      id: "maybe",
      label: locale === "bn" ? "এখনও নিশ্চিত নই" : "Maybe",
      icon: HelpCircle,
    },
    {
      id: "declined",
      label: locale === "bn" ? "আসতে পারব না" : "Unable to attend",
      icon: XCircle,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left">
      {/* Personalised greeting */}
      <div
        className="rounded-xl border px-4 py-3 text-center"
        style={{
          backgroundColor: "var(--inv-background)",
          borderColor: "var(--inv-border)",
        }}
      >
        <p className="text-xs font-medium" style={{ color: "var(--inv-muted)" }}>
          {locale === "bn" ? "আমন্ত্রিত পরিবার" : "Personal Invitation For"}
        </p>
        <p className="font-semibold text-base mt-0.5" style={{ color: "var(--inv-primary)" }}>
          {group.groupName}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--inv-muted)" }}>
          {locale === "bn"
            ? `অনুমোদিত অতিথি: ${fmt(maxAdults)} বড়, ${fmt(maxChildren)} শিশু`
            : `Reserved seats: ${maxAdults} adult(s), ${maxChildren} child(ren)`}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
        >
          {error}
        </div>
      )}

      {/* Attendance choice */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = status === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatus(opt.id)}
              className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-medium transition-all"
              style={
                active
                  ? {
                      borderColor: "var(--inv-primary)",
                      backgroundColor: "var(--inv-primary)",
                      color: "#FFFFFF",
                    }
                  : {
                      borderColor: "var(--inv-border)",
                      backgroundColor: "var(--inv-surface)",
                      color: "var(--inv-text)",
                    }
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Headcount & Member selection when accepted */}
      {status === "accepted" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--inv-border)" }}>
              <span className="text-xs font-medium block mb-2" style={{ color: "var(--inv-muted)" }}>
                {locale === "bn" ? "উপস্থিত বড়" : "Adults"} (max {fmt(maxAdults)})
              </span>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAdults((a) => Math.max(0, a - 1))}
                  disabled={adults <= 0}
                  aria-label="Decrease adults"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="text-base font-bold">{fmt(adults)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAdults((a) => Math.min(maxAdults, a + 1))}
                  disabled={adults >= maxAdults}
                  aria-label="Increase adults"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="rounded-xl border p-3" style={{ borderColor: "var(--inv-border)" }}>
              <span className="text-xs font-medium block mb-2" style={{ color: "var(--inv-muted)" }}>
                {locale === "bn" ? "উপস্থিত শিশু" : "Children"} (max {fmt(maxChildren)})
              </span>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChildren((c) => Math.max(0, c - 1))}
                  disabled={children <= 0}
                  aria-label="Decrease children"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="text-base font-bold">{fmt(children)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChildren((c) => Math.min(maxChildren, c + 1))}
                  disabled={children >= maxChildren}
                  aria-label="Increase children"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {guests.length > 0 && (
            <div className="space-y-2 rounded-xl border p-3.5" style={{ borderColor: "var(--inv-border)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--inv-muted)" }}>
                {locale === "bn" ? "পরিবারের সদস্যবৃন্দ" : "Family members attending"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {guests.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 text-sm cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(memberAttendance[g.id])}
                      onChange={(e) =>
                        setMemberAttendance((prev) => ({
                          ...prev,
                          [g.id]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span>{g.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rsvp-meal" className="text-xs">
                {locale === "bn" ? "খাবারের পছন্দ (ঐচ্ছিক)" : "Meal preference (optional)"}
              </Label>
              <Input
                id="rsvp-meal"
                value={mealPreference}
                onChange={(e) => setMealPreference(e.target.value)}
                placeholder={locale === "bn" ? "নিরামিষ / আমিষ" : "Veg / Non-veg"}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rsvp-notes" className="text-xs">
                {locale === "bn" ? "বিশেষ প্রয়োজন (ঐচ্ছিক)" : "Special notes (optional)"}
              </Label>
              <Input
                id="rsvp-notes"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder={locale === "bn" ? "হুইলচেয়ার / অ্যালার্জি" : "Allergies / accessibility"}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="rsvp-message" className="text-xs">
          {locale === "bn" ? "আপনার শুভেচ্ছা বার্তা" : "Message / Blessings (optional)"}
        </Label>
        <Textarea
          id="rsvp-message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            locale === "bn"
              ? "আপনার আন্তরিক শুভেচ্ছা লিখুন…"
              : "Share a warm wish for the hosts…"
          }
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={submitting}
        style={{ backgroundColor: "var(--inv-primary)", color: "#FFFFFF" }}
      >
        {submitting
          ? locale === "bn"
            ? "সংরক্ষণ করা হচ্ছে…"
            : "Submitting…"
          : locale === "bn"
          ? "উপস্থিতি নিশ্চিত করুন"
          : "Confirm RSVP"}
      </Button>
    </form>
  );
}
