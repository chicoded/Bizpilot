import type { InternalAdminRole } from "@prisma/client";

export type InternalPermission =
  | "dashboard:view"
  | "businesses:view"
  | "businesses:write"
  | "businesses:delete"
  | "users:view"
  | "users:write"
  | "subscriptions:view"
  | "subscriptions:write"
  | "payments:view"
  | "admins:manage"
  | "logs:view"
  | "system:view";

const ROLE_PERMISSIONS: Record<InternalAdminRole, InternalPermission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "businesses:view",
    "businesses:write",
    "businesses:delete",
    "users:view",
    "users:write",
    "subscriptions:view",
    "subscriptions:write",
    "payments:view",
    "admins:manage",
    "logs:view",
    "system:view",
  ],
  ADMIN: [
    "dashboard:view",
    "businesses:view",
    "businesses:write",
    "users:view",
    "users:write",
    "subscriptions:view",
    "logs:view",
    "system:view",
  ],
  SUPPORT: [
    "dashboard:view",
    "businesses:view",
    "users:view",
    "subscriptions:view",
    "logs:view",
  ],
  FINANCE: [
    "dashboard:view",
    "businesses:view",
    "subscriptions:view",
    "payments:view",
    "logs:view",
  ],
  DEVELOPER: [
    "dashboard:view",
    "businesses:view",
    "logs:view",
    "system:view",
  ],
};

export function internalRolePermissions(
  role: InternalAdminRole
): InternalPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canInternal(
  role: InternalAdminRole,
  permission: InternalPermission
): boolean {
  return internalRolePermissions(role).includes(permission);
}
