// ============================================================
// Nimantro — Login Page
// apps/web/app/(auth)/login/page.tsx
// ============================================================

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  Separator,
  toast,
} from "@nimantro/ui";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase-client";
import { useLocale } from "@/hooks/useLocale";

function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function exchangeSession(idToken: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to create session.");
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isFirebaseClientConfigured()) {
      setError("Firebase client credentials are not configured in .env.local.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const auth = getClientAuth();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken();
      await exchangeSession(idToken);
      toast({ title: "Welcome back!", variant: "success" });
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (!isFirebaseClientConfigured()) {
      setError("Firebase client credentials are not configured in .env.local.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      await exchangeSession(idToken);
      toast({ title: "Signed in with Google", variant: "success" });
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="shadow-elevated">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl font-playfair">{t("auth.signInTitle")}</CardTitle>
        <CardDescription>
          {t("auth.signInDesc")}
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
          onClick={handleGoogleLogin}
          disabled={submitting}
        >
          {t("auth.continueWithGoogle")}
        </Button>

        <div className="relative flex items-center gap-3 py-1">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("auth.or")}</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t("auth.email")}</Label>
            <Input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t("auth.password")}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline underline-offset-2"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {t("auth.newToNimantro")}{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            {t("auth.createAccount")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<LoadingSpinner size="lg" className="py-12" />}>
      <LoginForm />
    </React.Suspense>
  );
}
