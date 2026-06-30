"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";
import { mobileNavItems } from "@/lib/app-navigation";
import { filterNavItemsByAccess } from "@/lib/permissions";

interface MobileNavProps {
  role: Role;
  rolePermissions: Prisma.JsonValue | null;
}

export function MobileNav({ role, rolePermissions }: MobileNavProps) {
  const pathname = usePathname();
  const items = filterNavItemsByAccess(
    [...mobileNavItems],
    role,
    rolePermissions
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden pointer-events-auto">
      <div className="border-t border-border/40 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,58,95,0.06)] safe-area-pb">
        <div className="flex items-end justify-around px-1 pt-1 pb-1">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/menu" &&
                ["/settings", "/expenses", "/customers", "/debts", "/suppliers", "/reports", "/whatsapp"].some(
                  (path) =>
                    pathname === path || pathname.startsWith(`${path}/`)
                ));
            const Icon = item.icon;

            if ("primary" in item && item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className="relative z-10 flex flex-col items-center -mt-5 touch-manipulation"
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all active:scale-95",
                      isActive
                        ? "bg-biz-emerald text-white shadow-emerald-500/40"
                        : "bg-biz-emerald text-white shadow-emerald-500/30"
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold mt-1",
                      isActive ? "text-biz-emerald" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "relative z-10 flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 min-w-[56px] touch-manipulation active:scale-95 transition-transform",
                  isActive ? "text-biz-blue" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                    isActive && "bg-biz-blue/10"
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
                  />
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
