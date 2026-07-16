"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InternalAdminRole } from "@prisma/client";
import type { InternalPermission } from "@/lib/internal/permissions";
import { canInternal } from "@/lib/internal/permissions";
import { cn } from "@/lib/utils";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  ScrollText,
  Server,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: InternalPermission;
}[] = [
  {
    href: "/internal",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },
  {
    href: "/internal/businesses",
    label: "Businesses",
    icon: Building2,
    permission: "businesses:view",
  },
  {
    href: "/internal/users",
    label: "Users",
    icon: Users,
    permission: "users:view",
  },
  {
    href: "/internal/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    permission: "subscriptions:view",
  },
  {
    href: "/internal/payments",
    label: "Payments",
    icon: Receipt,
    permission: "payments:view",
  },
  {
    href: "/internal/support",
    label: "Support",
    icon: LifeBuoy,
    permission: "support:view",
  },
  {
    href: "/internal/admins",
    label: "Staff",
    icon: UserCog,
    permission: "admins:manage",
  },
  {
    href: "/internal/logs",
    label: "Audit logs",
    icon: ScrollText,
    permission: "logs:view",
  },
  {
    href: "/internal/system",
    label: "System",
    icon: Server,
    permission: "system:view",
  },
];

export function InternalShell({
  children,
  role,
  email,
}: {
  children: React.ReactNode;
  role: InternalAdminRole;
  email: string;
}) {
  const pathname = usePathname();
  const links = NAV.filter((item) => canInternal(role, item.permission));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950 md:flex md:flex-col">
          <div className="border-b border-slate-800 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Zaplex Ops
            </p>
            <p className="mt-1 text-sm text-slate-400">Internal console</p>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {links.map((item) => {
              const active =
                item.href === "/internal"
                  ? pathname === "/internal"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-800 p-4 text-xs text-slate-500">
            <p className="flex items-center gap-1 font-medium text-slate-300">
              <Shield className="h-3.5 w-3.5" />
              {role}
            </p>
            <p className="mt-1 truncate">{email}</p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4 md:px-6">
            <div className="flex gap-2 overflow-x-auto md:hidden">
              {links.slice(0, 4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="hidden text-sm text-slate-500 md:block">
              Staff-only · not linked from customer app
            </p>
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Exit to app
            </Link>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
