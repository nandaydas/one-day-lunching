// ============================================================
// Nimantro — Reusable UI Language Switcher (বাংলা | EN)
// apps/web/components/layout/LanguageSwitcher.tsx
// ============================================================

"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "@nimantro/ui";
import { useLocale } from "@/hooks/useLocale";

export function LanguageSwitcher({
  persistToProfile = false,
  variant = "pill",
  className,
}: {
  persistToProfile?: boolean;
  variant?: "pill" | "segmented";
  className?: string;
}) {
  const { locale, setLocale } = useLocale();
  const isSegmented = variant === "segmented";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 border border-border p-0.5 text-xs font-medium",
        isSegmented
          ? "h-8 rounded-md bg-secondary/70"
          : "rounded-full bg-card",
        className
      )}
      role="group"
      aria-label="Language switcher"
    >
      <Globe
        className="h-3.5 w-3.5 mx-1.5 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className={cn("flex items-center gap-0.5", isSegmented && "flex-1")}>
        <button
          type="button"
          onClick={() => void setLocale("bn", persistToProfile)}
          className={cn(
            "px-2.5 py-1 leading-none transition-[background-color,color] duration-150",
            isSegmented ? "flex-1 rounded-[4px]" : "rounded-full",
            locale === "bn"
              ? isSegmented
                ? "bg-card text-foreground shadow-card"
                : "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          বাংলা
        </button>
        <button
          type="button"
          onClick={() => void setLocale("en", persistToProfile)}
          className={cn(
            "px-2.5 py-1 leading-none transition-[background-color,color] duration-150",
            isSegmented ? "flex-1 rounded-[4px]" : "rounded-full",
            locale === "en"
              ? isSegmented
                ? "bg-card text-foreground shadow-card"
                : "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          EN
        </button>
      </div>
    </div>
  );
}
