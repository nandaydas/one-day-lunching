// ============================================================
// Nimantro — StatusBadge Component
// packages/ui/src/components/status-badge.tsx
// ============================================================

import * as React from "react";
import { cn } from "../lib/utils";

type StatusVariant =
  | "draft"
  | "published"
  | "unpublished"
  | "archived"
  | "active"
  | "cancelled"
  | "pending"
  | "invited"
  | "responded"
  | "accepted"
  | "declined"
  | "maybe"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-secondary/70 text-muted-foreground",
  },
  published: {
    label: "Published",
    className: "border-[#16a34a]/25 bg-[#16a34a]/10 text-[#15803d]",
  },
  unpublished: {
    label: "Unpublished",
    className: "border-border bg-secondary/70 text-muted-foreground",
  },
  archived: {
    label: "Archived",
    className: "border-border bg-muted text-muted-foreground",
  },
  active: {
    label: "Active",
    className: "border-[#16a34a]/25 bg-[#16a34a]/10 text-[#15803d]",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-[#dc2626]/25 bg-[#dc2626]/10 text-[#b91c1c]",
  },
  pending: {
    label: "Pending",
    className: "border-[#b47814]/25 bg-[#b47814]/10 text-[#8c5a0b]",
  },
  invited: {
    label: "Invited",
    className: "border-border bg-secondary text-foreground",
  },
  responded: {
    label: "Responded",
    className: "border-[#16a34a]/25 bg-[#16a34a]/10 text-[#15803d]",
  },
  accepted: {
    label: "Accepted",
    className: "border-[#16a34a]/25 bg-[#16a34a]/10 text-[#15803d]",
  },
  declined: {
    label: "Declined",
    className: "border-[#dc2626]/25 bg-[#dc2626]/10 text-[#b91c1c]",
  },
  maybe: {
    label: "Maybe",
    className: "border-accent/40 bg-accent/15 text-foreground",
  },
  queued: {
    label: "Queued",
    className: "border-border bg-secondary/70 text-muted-foreground",
  },
  processing: {
    label: "Processing",
    className: "border-[#b47814]/25 bg-[#b47814]/10 text-[#8c5a0b]",
  },
  completed: {
    label: "Completed",
    className: "border-[#16a34a]/25 bg-[#16a34a]/10 text-[#15803d]",
  },
  failed: {
    label: "Failed",
    className: "border-[#dc2626]/25 bg-[#dc2626]/10 text-[#b91c1c]",
  },
};

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "border-border bg-secondary/70 text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium leading-4",
        config.className,
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {label ?? config.label}
    </span>
  );
}
