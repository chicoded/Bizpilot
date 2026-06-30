"use client";

import Link from "next/link";
import { mainNavItems } from "@/lib/app-navigation";
import { AppNavLink } from "@/components/layout/app-nav-link";

interface SidebarProps {
  businessName?: string;
}

export function Sidebar({ businessName }: SidebarProps) {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-border/50 bg-white/80 backdrop-blur-xl pointer-events-auto">
      <Link
        href="/dashboard"
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
        {mainNavItems.map((item) => (
          <AppNavLink key={item.href} item={item} variant="sidebar" />
        ))}
      </nav>
    </aside>
  );
}
