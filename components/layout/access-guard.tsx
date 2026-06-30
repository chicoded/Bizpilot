"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { canAccessPath } from "@/lib/permissions";

interface AccessGuardProps {
  role: Role;
  rolePermissions: Prisma.JsonValue | null;
}

export function AccessGuard({ role, rolePermissions }: AccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessPath(role, rolePermissions, pathname)) {
      router.replace("/menu?denied=1");
    }
  }, [pathname, role, rolePermissions, router]);

  return null;
}
