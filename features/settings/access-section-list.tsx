"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  History,
  Home,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { AccessToggle } from "@/components/ui/access-toggle";
import type { AppSectionId } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const SECTION_ICONS: Record<AppSectionId, LucideIcon> = {
  dashboard: Home,
  sales: ShoppingCart,
  sales_history: History,
  inventory: Package,
  expenses: Receipt,
  customers: Users,
  debts: CreditCard,
  suppliers: Truck,
  reports: BarChart3,
  ai: Sparkles,
  settings: Settings,
  billing: CreditCard,
};

export interface AccessSectionItem {
  id: AppSectionId;
  label: string;
  description: string;
}

interface AccessSectionListProps {
  sections: AccessSectionItem[];
  allowed: AppSectionId[];
  onToggle: (sectionId: AppSectionId) => void;
  disabled?: boolean;
  className?: string;
}

export function AccessSectionList({
  sections,
  allowed,
  onToggle,
  disabled,
  className,
}: AccessSectionListProps) {
  const allowedSet = new Set(allowed);

  return (
    <ul className={cn("space-y-2", className)}>
      {sections.map((section) => {
        const checked = allowedSet.has(section.id);
        const Icon = SECTION_ICONS[section.id];
        const toggleId = `access-${section.id}`;

        return (
          <li key={section.id}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors min-h-[56px]",
                checked
                  ? "border-biz-blue/30 bg-biz-blue/5 dark:border-primary/30 dark:bg-primary/10"
                  : "border-border bg-card",
                disabled && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  checked
                    ? "bg-biz-blue/15 text-brand dark:bg-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold leading-tight">
                  {section.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {section.description}
                </p>
              </div>
              <AccessToggle
                id={toggleId}
                checked={checked}
                onChange={() => onToggle(section.id)}
                disabled={disabled}
                label={`${checked ? "Revoke" : "Grant"} ${section.label}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function accessCountLabel(allowed: number, total: number) {
  return `${allowed} of ${total} page${total === 1 ? "" : "s"}`;
}
