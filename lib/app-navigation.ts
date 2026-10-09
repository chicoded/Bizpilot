import type { LucideIcon } from "lucide-react";
import {
  Home,
  Package,
  Receipt,
  Truck,
  BarChart3,
  Sparkles,
  Settings,
  History,
  LayoutGrid,
  ClipboardList,
  ClipboardCheck,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import type { Capability } from "@/lib/industries/types";

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  /**
   * Only shown to trades whose industry pack declares this capability.
   * Role permissions still apply on top — this only ever removes.
   */
  requiresCapability?: Capability;
}

export const mainNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, description: "Overview & health score" },
  { href: "/sales/history", label: "Sales History", icon: History, description: "Past sales & receipts" },
  { href: "/inventory", label: "Inventory", icon: Package, description: "Products & stock" },
  { href: "/expenses", label: "Expenses", icon: Receipt, description: "Track spending" },
  { href: "/suppliers", label: "Suppliers", icon: Truck, description: "Supplier contacts" },
  { href: "/reports", label: "Reports", icon: BarChart3, description: "Business reports" },
  {
    href: "/prescriptions",
    label: "Controlled register",
    icon: ClipboardList,
    description: "Controlled drugs and dispensing",
    requiresCapability: "controlled_register",
  },
  {
    href: "/hotel/reports",
    label: "Hotel Reports",
    icon: ClipboardCheck,
    description: "Department daily reports",
  },
  {
    href: "/hotel/expenses",
    label: "Hotel Expenses",
    icon: FileSpreadsheet,
    description: "Operational expenses",
  },
  {
    href: "/hotel/management",
    label: "Hotel Management",
    icon: Layers,
    description: "Consolidated dashboard",
  },
  { href: "/ai", label: "AI Assistant", icon: Sparkles, description: "Ask your AI advisor" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Business & billing" },
];

export const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales/history", label: "History", icon: History },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/menu", label: "Menu", icon: LayoutGrid },
] as const;
