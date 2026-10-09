import type { LucideIcon } from "lucide-react";
import {
  Home,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  CreditCard,
  Truck,
  BarChart3,
  Sparkles,
  Settings,
  History,
  LayoutGrid,
  ClipboardList,
  Hotel,
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
  { href: "/sales", label: "Point of Sale", icon: ShoppingCart, description: "Record sales" },
  { href: "/sales/history", label: "Sales History", icon: History, description: "Past sales & receipts" },
  { href: "/inventory", label: "Inventory", icon: Package, description: "Products & stock" },
  { href: "/expenses", label: "Expenses", icon: Receipt, description: "Track spending" },
  { href: "/customers", label: "Customers", icon: Users, description: "Customer list" },
  { href: "/debts", label: "Debts", icon: CreditCard, description: "Credit & payments" },
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
    requiresCapability: "hotel_daily_reports",
  },
  {
    href: "/hotel/expenses",
    label: "Hotel Expenses",
    icon: FileSpreadsheet,
    description: "Operational expenses",
    requiresCapability: "hotel_expenses",
  },
  {
    href: "/hotel/management",
    label: "Hotel Management",
    icon: Layers,
    description: "Consolidated dashboard",
    requiresCapability: "hotel_management_dashboard",
  },
  { href: "/ai", label: "AI Assistant", icon: Sparkles, description: "Ask your AI advisor" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Business & billing" },
];

export const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales", label: "Sales", icon: ShoppingCart, primary: true },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/menu", label: "Menu", icon: LayoutGrid },
] as const;
