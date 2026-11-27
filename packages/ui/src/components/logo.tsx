// ============================================================
// Nimantro — NimantroLogo Component
// packages/ui/src/components/logo.tsx
// ============================================================

import * as React from "react";
import { cn } from "../lib/utils";

interface NimantroLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "mark" | "wordmark";
  className?: string;
}

const sizes = {
  sm: { mark: 24, text: "text-base" },
  md: { mark: 32, text: "text-xl" },
  lg: { mark: 48, text: "text-3xl" },
};

export function NimantroLogo({
  size = "md",
  variant = "full",
  className,
}: NimantroLogoProps) {
  const { mark, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Logomark — flat seal 'ন' in Bengali */}
      {(variant === "full" || variant === "mark") && (
        <div
          className="flex items-center justify-center rounded-md bg-primary text-primary-foreground font-medium leading-none shrink-0"
          style={{
            width: mark,
            height: mark,
            fontSize: Math.round(mark * 0.56),
            fontFamily: "var(--font-noto-serif-bengali), serif",
          }}
          aria-hidden="true"
        >
          ন
        </div>
      )}

      {/* Wordmark */}
      {(variant === "full" || variant === "wordmark") && (
        <div className={cn("flex flex-col leading-none", text)}>
          <span
            className="font-medium tracking-normal text-foreground"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Nimantro
          </span>
          {size === "lg" && (
            <span
              className="text-xs text-muted-foreground font-normal mt-1"
              style={{ fontFamily: "var(--font-noto-sans-bengali), sans-serif" }}
            >
              নিমন্ত্রণ
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default NimantroLogo;
