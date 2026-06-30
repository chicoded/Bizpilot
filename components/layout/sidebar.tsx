"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { mainNavItems } from "@/lib/app-navigation";
import { AppNavLink } from "@/components/layout/app-nav-link";
import { filterNavItemsByAccess } from "@/lib/permissions";

interface SidebarProps {
  businessName?: string;
  role: Role;
  rolePermissions: Prisma.JsonValue | null;
}

export function Sidebar({ businessName, role, rolePermissions }: SidebarProps) {
  const navItems = filterNavItemsByAccess(mainNavItems, role, rolePermissions);
  const homeHref =
    navItems.find((item) => item.href === "/dashboard")?.href ??
    navItems[0]?.href ??
    "/menu";

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-border/50 bg-white/80 backdrop-blur-xl pointer-events-auto">
      <Link
        href={homeHref}
        className="flex h-16 items-center gap-2 border-b border-border/50 px-6 hover:bg-accent/50 transition-colors touch-manipulation"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-biz-gradient text-white font-bold text-sm">
          BP
        </div>
        <div className="min-w-0">
          <p className="font-bold text-biz-blue truncate">BizPilot AI</p>
          {businessName && (
            <p className="text-xs text-muted-foreground truncate">
              {businessName}
            </p>
          )}
        </div>
      </Link>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <AppNavLink key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>
    </aside>
  );
}
