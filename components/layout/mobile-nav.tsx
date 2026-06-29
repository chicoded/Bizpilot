"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  Package,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Stock", icon: Package },
  { href: "/sales", label: "Sales", icon: ShoppingCart, primary: true },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/settings", label: "More", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="border-t border-border/40 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,58,95,0.06)] safe-area-pb">
        <div className="flex items-end justify-around px-1 pt-1 pb-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-5 touch-manipulation"
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
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 min-w-[56px] touch-manipulation active:scale-95 transition-transform",
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
