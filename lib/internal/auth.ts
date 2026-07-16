import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { InternalAdminRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { syncClerkUser } from "@/lib/auth";
import {
  canInternal,
  type InternalPermission,
} from "@/lib/internal/permissions";

export type InternalAdminContext = {
  userId: string;
  email: string;
  role: InternalAdminRole;
  adminId: string;
  source: "database" | "allowlist";
};

function bootstrapEmails(): string[] {
  return (process.env.INTERNAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getInternalAdmin(): Promise<InternalAdminContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser().catch(() => null);
  if (!clerkUser) return null;

  await syncClerkUser({
    id: clerkUser.id,
    emailAddresses: clerkUser.emailAddresses,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
  }).catch(() => null);

  const email =
    clerkUser.emailAddresses[0]?.emailAddress?.trim().toLowerCase() ?? "";

  const row = await prisma.internalAdmin
    .findUnique({ where: { userId } })
    .catch(() => null);

  if (row && !row.disabled) {
    return {
      userId,
      email,
      role: row.role,
      adminId: row.id,
      source: "database",
    };
  }

  // Bootstrap allowlist → SUPER_ADMIN until staff rows exist in DB.
  if (email && bootstrapEmails().includes(email)) {
    try {
      const upserted = await prisma.internalAdmin.upsert({
        where: { userId },
        update: { disabled: false, role: "SUPER_ADMIN" },
        create: { userId, role: "SUPER_ADMIN", disabled: false },
      });
      return {
        userId,
        email,
        role: upserted.role,
        adminId: upserted.id,
        source: "allowlist",
      };
    } catch {
      // Table may not exist yet on first deploys — still allow via allowlist.
      return {
        userId,
        email,
        role: "SUPER_ADMIN",
        adminId: "allowlist",
        source: "allowlist",
      };
    }
  }

  return null;
}

export async function requireInternalAdmin(
  permission?: InternalPermission
): Promise<InternalAdminContext> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/internal/sign-in?redirect_url=/internal");
  }

  const admin = await getInternalAdmin();
  if (!admin) {
    redirect("/internal/forbidden");
  }
  if (permission && !canInternal(admin.role, permission)) {
    redirect("/internal/forbidden");
  }
  return admin;
}

export async function writeInternalAudit(params: {
  actorUserId: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.internalAuditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error("[internal-audit]", error);
  }
}
