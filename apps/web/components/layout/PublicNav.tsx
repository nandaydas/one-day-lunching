// ============================================================
// Nimantro — Shared Public Navigation Header
// apps/web/components/layout/PublicNav.tsx
// ============================================================

"use client";

import Link from "next/link";
import { Button, NimantroLogo } from "@nimantro/ui";
import { useLocale } from "@/hooks/useLocale";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function PublicNav() {
  const { t } = useLocale();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Nimantro home">
          <NimantroLogo size="md" />
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/templates" className="transition-colors hover:text-foreground">
            {t("nav.templates")}
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            {t("nav.pricing")}
          </Link>
          <Link href="/docs" className="transition-colors hover:text-foreground">
            {t("nav.docs")}
          </Link>
        </div>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t("auth.signIn")}
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">{t("auth.getStartedFree")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
