// ============================================================
// Nimantro — EmptyState Component
// packages/ui/src/components/empty-state.tsx
// ============================================================

import * as React from "react";
import { cn } from "../lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 gap-3",
        className
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.5]">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
