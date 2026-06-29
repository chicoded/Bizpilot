"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Truck,
  BarChart3,
  Sparkles,
  Settings,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/sales", label: "Point of Sale", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/debts", label: "Debt Management", icon: CreditCard },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/whatsapp", label: "WhatsApp AI", icon: MessageCircle },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  businessName?: string;
}

export function Sidebar({ businessName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border/50 bg-white/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
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
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-biz-blue text-white shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
