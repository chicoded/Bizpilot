"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNavItem } from "@/lib/app-navigation";

interface AppNavLinkProps {
  item: AppNavItem;
  variant?: "sidebar" | "menu" | "compact";
}

export function AppNavLink({ item, variant = "menu" }: AppNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  if (variant === "sidebar") {
    return (
      <Link
        href={item.href}
        prefetch
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
          isActive
            ? "bg-biz-blue text-white shadow-soft dark:bg-primary dark:text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={item.href}
        prefetch
        aria-current={isActive ? "page" : undefined}
        className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center hover:border-primary hover:shadow-soft transition-all touch-manipulation active:scale-[0.98] min-h-[96px]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-biz-blue/10">
          <Icon className="h-5 w-5 text-biz-blue dark:text-primary" />
        </div>
        <span className="text-sm font-semibold">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 hover:border-primary hover:shadow-soft transition-all touch-manipulation active:scale-[0.99]",
        isActive && "border-primary bg-primary/10 dark:bg-primary/15"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          isActive ? "bg-biz-blue text-white dark:bg-primary dark:text-primary-foreground" : "bg-biz-blue/10 text-biz-blue dark:bg-primary/15 dark:text-primary"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-semibold text-sm text-foreground">{item.label}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
