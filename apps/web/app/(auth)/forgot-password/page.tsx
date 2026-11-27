// ============================================================
// Nimantro — Forgot Password Page
// apps/web/app/(auth)/forgot-password/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@nimantro/ui";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isFirebaseClientConfigured()) {
      setError("Firebase client credentials are not configured.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(getClientAuth(), email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <CardTitle className="text-2xl font-playfair">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            Check your inbox for a password reset link sent to <strong>{email}</strong>.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-4">
        <Link href="/login" className="text-xs font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
