"use client";

import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { mainNavItems } from "@/lib/app-navigation";
import { filterNavItemsByAccess } from "@/lib/permissions";
import { filterNavItemsByIndustry } from "@/lib/industries";
import { AppNavLink } from "@/components/layout/app-nav-link";

interface MenuNavListProps {
  role: Role;
  rolePermissions: Prisma.JsonValue | null;
  sectionOverrides?: Prisma.JsonValue | null;
  industry?: string | null;
}

export function MenuNavList({
  role,
  rolePermissions,
  sectionOverrides,
  industry,
}: MenuNavListProps) {
  const navItems = filterNavItemsByAccess(
    filterNavItemsByIndustry(mainNavItems, industry),
    role,
    rolePermissions,
    sectionOverrides
  ).filter((item) => item.href !== "/dashboard");

  return (
    <>
      {navItems.map((item) => (
        <AppNavLink key={item.href} item={item} variant="menu" />
      ))}
    </>
  );
}
