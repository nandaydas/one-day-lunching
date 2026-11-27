// ============================================================
// Nimantro — Alpona & Floral Ornamental SVG Motifs
// apps/web/components/invitation/AlponaMotif.tsx
// ============================================================

import * as React from "react";

export function AlponaCrest({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M60 4C64 11 71 14 78 14C71 18 67 25 60 32C53 25 49 18 42 14C49 14 56 11 60 4Z"
        stroke="var(--inv-secondary)"
        strokeWidth="1.5"
        fill="var(--inv-secondary)"
        fillOpacity="0.16"
      />
      <circle cx="60" cy="17" r="3" fill="var(--inv-primary)" />
      <path
        d="M12 20H40M80 20H108"
        stroke="var(--inv-secondary)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <circle cx="34" cy="20" r="2" fill="var(--inv-secondary)" />
      <circle cx="86" cy="20" r="2" fill="var(--inv-secondary)" />
    </svg>
  );
}

export function AlponaDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`my-6 flex items-center justify-center gap-3 ${className}`}
      aria-hidden="true"
    >
      <span
        className="h-px flex-1 max-w-[96px]"
        style={{ backgroundColor: "var(--inv-border)" }}
      />
      <svg width="26" height="16" viewBox="0 0 26 16" fill="none">
        <path
          d="M13 2C15 5.5 18 7 22 8C18 9 15 10.5 13 14C11 10.5 8 9 4 8C8 7 11 5.5 13 2Z"
          stroke="var(--inv-secondary)"
          strokeWidth="1.3"
          fill="var(--inv-secondary)"
          fillOpacity="0.2"
        />
      </svg>
      <span
        className="h-px flex-1 max-w-[96px]"
        style={{ backgroundColor: "var(--inv-border)" }}
      />
    </div>
  );
}
