import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/** App sections the owner can grant per role */
export type AppSectionId =
  | "dashboard"
  | "sales"
  | "sales_history"
  | "inventory"
  | "expenses"
  | "customers"
  | "debts"
  | "suppliers"
  | "reports"
  | "whatsapp"
  | "ai"
  | "settings"
  | "billing";

export type ConfigurableRole = "MANAGER" | "CASHIER" | "STAFF";

export const CONFIGURABLE_ROLES: ConfigurableRole[] = [
  "MANAGER",
  "CASHIER",
  "STAFF",
];

export type RolePermissionsMap = Record<ConfigurableRole, AppSectionId[]>;

export const APP_SECTIONS: {
  id: AppSectionId;
  label: string;
  description: string;
  pathPrefix: string;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview, KPIs, and health score",
    pathPrefix: "/dashboard",
  },
  {
    id: "sales",
    label: "Point of Sale",
    description: "Record sales and checkout",
    pathPrefix: "/sales",
  },
  {
    id: "sales_history",
    label: "Sales History",
    description: "Past sales and receipts",
    pathPrefix: "/sales/history",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Products, stock, and barcodes",
    pathPrefix: "/inventory",
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Track business spending",
    pathPrefix: "/expenses",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer list and profiles",
    pathPrefix: "/customers",
  },
  {
    id: "debts",
    label: "Debts",
    description: "Credit sales and payments",
    pathPrefix: "/debts",
  },
  {
    id: "suppliers",
    label: "Suppliers",
    description: "Supplier contacts",
    pathPrefix: "/suppliers",
  },
  {
    id: "reports",
    label: "Reports",
    description: "Business reports and exports",
    pathPrefix: "/reports",
  },
  {
    id: "whatsapp",
    label: "WhatsApp AI",
    description: "WhatsApp shop assistant",
    pathPrefix: "/whatsapp",
  },
  {
    id: "ai",
    label: "AI Assistant",
    description: "Chat with BizPilot AI",
    pathPrefix: "/ai",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Business profile and team",
    pathPrefix: "/settings",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Subscription and payments",
    pathPrefix: "/settings/billing",
  },
];

const ALL_SECTIONS = APP_SECTIONS.map((s) => s.id);

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  MANAGER: ALL_SECTIONS.filter((id) => id !== "billing"),
  CASHIER: [
    "dashboard",
    "sales",
    "sales_history",
    "customers",
    "debts",
  ],
  STAFF: ["dashboard", "inventory"],
};

/** Paths always reachable (navigation hub, invite accept is outside app layout) */
export const UNGUARDED_PATH_PREFIXES = ["/menu"];

const PATH_RULES = [
  ...APP_SECTIONS.map((s) => ({ prefix: s.pathPrefix, section: s.id })),
].sort((a, b) => b.prefix.length - a.prefix.length);

export function parseRolePermissions(
  value: Prisma.JsonValue | null | undefined
): RolePermissionsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_ROLE_PERMISSIONS };
  }

  const raw = value as Record<string, unknown>;
  const result = { ...DEFAULT_ROLE_PERMISSIONS };

  for (const role of CONFIGURABLE_ROLES) {
    const sections = raw[role];
    if (!Array.isArray(sections)) continue;
    result[role] = sections.filter((s): s is AppSectionId =>
      typeof s === "string" && ALL_SECTIONS.includes(s as AppSectionId)
    );
  }

  return result;
}

export function getAllowedSections(
  role: Role,
  rolePermissions: Prisma.JsonValue | null | undefined
): AppSectionId[] {
  if (role === "OWNER") {
    return ALL_SECTIONS;
  }

  const map = parseRolePermissions(rolePermissions);
  const configurable = role as ConfigurableRole;

  if (CONFIGURABLE_ROLES.includes(configurable)) {
    return map[configurable];
  }

  return [];
}

export function resolveSectionFromPath(pathname: string): AppSectionId | null {
  if (UNGUARDED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  for (const rule of PATH_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      if (rule.section === "sales" && pathname.startsWith("/sales/history")) {
        continue;
      }
      if (rule.section === "settings" && pathname.startsWith("/settings/billing")) {
        continue;
      }
      return rule.section;
    }
  }

  return null;
}

export function canAccessSection(
  role: Role,
  rolePermissions: Prisma.JsonValue | null | undefined,
  section: AppSectionId
): boolean {
  return getAllowedSections(role, rolePermissions).includes(section);
}

export function canAccessPath(
  role: Role,
  rolePermissions: Prisma.JsonValue | null | undefined,
  pathname: string
): boolean {
  if (UNGUARDED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }

  const section = resolveSectionFromPath(pathname);
  if (!section) {
    return true;
  }

  return canAccessSection(role, rolePermissions, section);
}

export function sectionForNavHref(href: string): AppSectionId | null {
  if (href === "/sales/history") return "sales_history";
  if (href.startsWith("/settings/billing")) return "billing";
  if (href.startsWith("/settings")) return "settings";
  if (href === "/sales") return "sales";
  const match = APP_SECTIONS.find((s) => s.pathPrefix === href);
  return match?.id ?? null;
}

export function filterNavItemsByAccess<T extends { href: string }>(
  items: T[],
  role: Role,
  rolePermissions: Prisma.JsonValue | null | undefined
): T[] {
  return items.filter((item) => {
    const section = sectionForNavHref(item.href);
    if (!section) return true;
    return canAccessSection(role, rolePermissions, section);
  });
}
