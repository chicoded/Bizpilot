"use client";

import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { mainNavItems } from "@/lib/app-navigation";
import { filterNavItemsByAccess } from "@/lib/permissions";
import { AppNavLink } from "@/components/layout/app-nav-link";

interface MenuNavListProps {
  role: Role;
  rolePermissions: Prisma.JsonValue | null;
}

export function MenuNavList({ role, rolePermissions }: MenuNavListProps) {
  const navItems = filterNavItemsByAccess(
    mainNavItems,
    role,
    rolePermissions
  ).filter((item) => item.href !== "/dashboard");

  return (
    <>
      {navItems.map((item) => (
        <AppNavLink key={item.href} item={item} variant="menu" />
      ))}
    </>
  );
}
