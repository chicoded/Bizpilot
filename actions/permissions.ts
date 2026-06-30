"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth";
import {
  APP_SECTIONS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  type AppSectionId,
  type ConfigurableRole,
  type RolePermissionsMap,
} from "@/lib/permissions";

function isValidPermissionsMap(value: unknown): value is RolePermissionsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const validIds = new Set(APP_SECTIONS.map((s) => s.id));

  for (const role of CONFIGURABLE_ROLES) {
    const sections = (value as Record<string, unknown>)[role];
    if (!Array.isArray(sections)) return false;
    if (!sections.every((s) => typeof s === "string" && validIds.has(s as AppSectionId))) {
      return false;
    }
  }

  return true;
}

export async function updateRolePermissions(permissions: RolePermissionsMap) {
  try {
    const ctx = await requireBusinessContext();

    if (ctx.role !== Role.OWNER) {
      return { error: "Only the business owner can change page access" };
    }

    if (!isValidPermissionsMap(permissions)) {
      return { error: "Invalid access settings" };
    }

    await prisma.business.update({
      where: { id: ctx.businessId },
      data: { rolePermissions: permissions },
    });

    revalidatePath("/settings");
    revalidatePath("/menu");
    for (const section of APP_SECTIONS) {
      revalidatePath(section.pathPrefix);
    }

    return { success: true };
  } catch (error) {
    console.error("updateRolePermissions:", error);
    return { error: "Failed to save access settings" };
  }
}

export async function resetRolePermissions() {
  try {
    const ctx = await requireBusinessContext();

    if (ctx.role !== Role.OWNER) {
      return { error: "Only the business owner can reset page access" };
    }

    await prisma.business.update({
      where: { id: ctx.businessId },
      data: { rolePermissions: DEFAULT_ROLE_PERMISSIONS },
    });

    revalidatePath("/settings");
    revalidatePath("/menu");

    return { success: true };
  } catch (error) {
    console.error("resetRolePermissions:", error);
    return { error: "Failed to reset access settings" };
  }
}
