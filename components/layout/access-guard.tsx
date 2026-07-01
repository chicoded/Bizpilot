"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { canAccessPath } from "@/lib/permissions";

interface AccessGuardProps {
  role: Role;
  rolePermissions: Prisma.JsonValue | null;
  sectionOverrides?: Prisma.JsonValue | null;
}

export function AccessGuard({
  role,
  rolePermissions,
  sectionOverrides,
}: AccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessPath(role, rolePermissions, pathname, sectionOverrides)) {
      router.replace("/menu?denied=1");
    }
  }, [pathname, role, rolePermissions, sectionOverrides, router]);

  return null;
}
