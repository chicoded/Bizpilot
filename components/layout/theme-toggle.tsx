"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  /** compact = icon only; full = light / night / system */
  variant?: "compact" | "full";
};

export function ThemeToggle({
  className,
  variant = "compact",
}: ThemeToggleProps) {
  const { theme, resolved, setTheme } = useTheme();

  if (variant === "full") {
    const options = [
      { value: "light" as const, label: "Light", icon: Sun },
      { value: "dark" as const, label: "Night", icon: Moon },
      { value: "system" as const, label: "Auto", icon: Monitor },
    ];

    return (
      <div
        className={cn(
          "inline-flex items-center rounded-xl border border-border bg-card p-1",
          className
        )}
        role="group"
        aria-label="Color theme"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/80 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label={
        resolved === "dark" ? "Switch to light mode" : "Switch to night mode"
      }
      title={resolved === "dark" ? "Light mode" : "Night mode"}
    >
      {resolved === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
