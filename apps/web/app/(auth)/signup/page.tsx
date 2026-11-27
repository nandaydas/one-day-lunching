// ============================================================
// Nimantro — Sign Up Page
// apps/web/app/(auth)/signup/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
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
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  toast,
} from "@nimantro/ui";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase-client";
import { useLocale } from "@/hooks/useLocale";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, setLocale } = useLocale();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [preferredLanguage, setPreferredLanguage] = React.useState<"bn" | "en">("bn");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function createSession(idToken: string, name?: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        displayName: name,
        preferredLanguage,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to create session.");
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!isFirebaseClientConfigured()) {
      setError("Firebase client credentials are not configured.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const auth = getClientAuth();
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      const idToken = await cred.user.getIdToken();
      await createSession(idToken, displayName.trim());
      toast({ title: "Account created!", description: "Welcome to Nimantro.", variant: "success" });
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    if (!isFirebaseClientConfigured()) {
      setError("Firebase client credentials are not configured.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const auth = getClientAuth();
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      await createSession(idToken);
      toast({ title: "Welcome to Nimantro!", variant: "success" });
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="shadow-elevated">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl font-playfair">{t("auth.signUpTitle")}</CardTitle>
        <CardDescription>
          {t("auth.signUpDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
          >
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignup}
          disabled={submitting}
        >
          {t("auth.continueWithGoogle")}
        </Button>

        <div className="relative flex items-center gap-3 py-1">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("auth.or")}</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">{t("auth.yourName")}</Label>
            <Input
              id="signup-name"
              required
              minLength={2}
              placeholder="e.g. Anirban Mukherjee"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">{t("auth.email")}</Label>
            <Input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">{t("auth.password")}</Label>
            <Input
              id="signup-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-lang">{t("auth.preferredLanguage")}</Label>
            <Select
              value={preferredLanguage}
              onValueChange={(v) => {
                const next = v as "bn" | "en";
                setPreferredLanguage(next);
                void setLocale(next, false);
              }}
            >
              <SelectTrigger id="signup-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("auth.creatingAccount") : t("auth.createAccount")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<LoadingSpinner size="lg" className="py-12" />}>
      <SignupForm />
    </React.Suspense>
  );
}
