"use client";

import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[200] flex max-w-sm flex-col gap-2 pointer-events-none md:bottom-auto md:top-4 md:left-auto md:right-4 md:w-full"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto rounded-xl border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200 md:slide-in-from-top-2",
            t.dismissed &&
              "animate-out fade-out slide-out-to-bottom-2 md:slide-out-to-top-2 duration-200 pointer-events-none",
            t.variant === "destructive" &&
              "border-destructive/30 bg-destructive/5 text-destructive",
            t.variant === "success" &&
              "border-success/30 bg-success/5 text-foreground"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              {t.title && (
                <p className="text-sm font-semibold leading-none">{t.title}</p>
              )}
              {t.description && (
                <p className="text-sm text-muted-foreground">{t.description}</p>
              )}
              {t.action && (
                <button
                  type="button"
                  onClick={t.action.onClick}
                  className="text-sm font-medium text-brand hover:underline mt-1"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
