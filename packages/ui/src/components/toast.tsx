// ============================================================
// Nimantro — Toast Primitive & Toaster
// packages/ui/src/components/toast.tsx
// ============================================================

"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export const ToastProvider = RadixToast.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof RadixToast.Viewport>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Viewport>
>(({ className, ...props }, ref) => (
  <RadixToast.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[400px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border p-4 shadow-elevated transition-all",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        success: "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950 dark:text-green-50",
        destructive: "border-destructive/40 bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const Toast = React.forwardRef<
  React.ElementRef<typeof RadixToast.Root>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <RadixToast.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
));
Toast.displayName = "Toast";

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof RadixToast.Action>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Action>
>(({ className, ...props }, ref) => (
  <RadixToast.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof RadixToast.Close>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Close>
>(({ className, ...props }, ref) => (
  <RadixToast.Close
    ref={ref}
    aria-label="Dismiss notification"
    className={cn(
      "rounded-md p-1 text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" aria-hidden="true" />
  </RadixToast.Close>
));
ToastClose.displayName = "ToastClose";

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof RadixToast.Title>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Title>
>(({ className, ...props }, ref) => (
  <RadixToast.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-snug", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof RadixToast.Description>,
  React.ComponentPropsWithoutRef<typeof RadixToast.Description>
>(({ className, ...props }, ref) => (
  <RadixToast.Description
    ref={ref}
    className={cn("text-xs opacity-90 leading-relaxed", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
export type ToastActionElement = React.ReactElement<typeof ToastAction>;

// ─── Minimal Toast Store ─────────────────────────────────────

export interface ToastItem {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "success" | "destructive";
  duration?: number;
}

type ToastListener = (items: ToastItem[]) => void;

let toastItems: ToastItem[] = [];
const listeners = new Set<ToastListener>();
let nextId = 0;

function notify() {
  for (const listener of listeners) {
    listener(toastItems);
  }
}

export function dismissToast(id?: string) {
  toastItems = id ? toastItems.filter((item) => item.id !== id) : [];
  notify();
}

export function toast(input: Omit<ToastItem, "id">) {
  const id = `nimantro-toast-${++nextId}`;
  const item: ToastItem = { id, duration: 4500, ...input };
  toastItems = [...toastItems.slice(-4), item];
  notify();
  return {
    id,
    dismiss: () => dismissToast(id),
  };
}

export function useToast() {
  const [items, setItems] = React.useState<ToastItem[]>(toastItems);

  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return {
    toasts: items,
    toast,
    dismiss: dismissToast,
  };
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, action, variant, duration }) => (
        <Toast
          key={id}
          variant={variant}
          duration={duration}
          onOpenChange={(open) => {
            if (!open) dismiss(id);
          }}
        >
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
