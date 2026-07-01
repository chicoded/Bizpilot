"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Users,
  Shield,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const settingsLinks = [
  { href: "/settings/profile", label: "Business profile", icon: Building2 },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/access", label: "Page access", icon: Shield, ownerOnly: true },
  { href: "/settings/launch", label: "Launch checklist", icon: Rocket, ownerOnly: true },
  { href: "/settings/billing", label: "Billing", icon: CreditCard, billingOnly: true },
];

interface SettingsNavProps {
  isOwner: boolean;
  canAccessBilling: boolean;
}

export function SettingsNav({ isOwner, canAccessBilling }: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Settings">
      {settingsLinks.map((link) => {
        if (link.ownerOnly && !isOwner) return null;
        if (link.billingOnly && !canAccessBilling) return null;
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-biz-blue text-white"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.label}
            <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
          </Link>
        );
      })}
    </nav>
  );
}
