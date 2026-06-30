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
  MessageCircle,
  History,
} from "lucide-react";

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
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
  { href: "/whatsapp", label: "WhatsApp AI", icon: MessageCircle, description: "AI on WhatsApp" },
  { href: "/ai", label: "AI Assistant", icon: Sparkles, description: "Ask your AI advisor" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Business & billing" },
];

export const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales", label: "Sales", icon: ShoppingCart, primary: true },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/menu", label: "Menu", icon: Settings },
] as const;
