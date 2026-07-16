"use server";

import { revalidatePath } from "next/cache";
import type {
  InternalAdminRole,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  requireInternalAdmin,
  writeInternalAudit,
} from "@/lib/internal/auth";

export async function suspendBusiness(businessId: string) {
  const admin = await requireInternalAdmin("businesses:write");
  await prisma.business.update({
    where: { id: businessId },
    data: { suspendedAt: new Date() },
  });
  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "business.suspend",
    entity: "business",
    entityId: businessId,
  });
  revalidatePath("/internal/businesses");
  revalidatePath(`/internal/businesses/${businessId}`);
  return { ok: true as const };
}

export async function activateBusiness(businessId: string) {
  const admin = await requireInternalAdmin("businesses:write");
  await prisma.business.update({
    where: { id: businessId },
    data: { suspendedAt: null },
  });
  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "business.activate",
    entity: "business",
    entityId: businessId,
  });
  revalidatePath("/internal/businesses");
  revalidatePath(`/internal/businesses/${businessId}`);
  return { ok: true as const };
}

export async function deleteBusiness(businessId: string) {
  const admin = await requireInternalAdmin("businesses:delete");
  await prisma.business.delete({ where: { id: businessId } });
  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "business.delete",
    entity: "business",
    entityId: businessId,
  });
  revalidatePath("/internal/businesses");
  return { ok: true as const };
}

export async function updateBusinessSubscription(input: {
  businessId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  periodDays?: number;
}) {
  const admin = await requireInternalAdmin("subscriptions:write");
  const periodEnd =
    input.periodDays != null
      ? new Date(Date.now() + input.periodDays * 24 * 60 * 60 * 1000)
      : undefined;

  await prisma.subscription.upsert({
    where: { businessId: input.businessId },
    update: {
      plan: input.plan,
      status: input.status,
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
    },
    create: {
      businessId: input.businessId,
      plan: input.plan,
      status: input.status,
      currentPeriodEnd:
        periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "subscription.update",
    entity: "business",
    entityId: input.businessId,
    metadata: {
      plan: input.plan,
      status: input.status,
      periodDays: input.periodDays ?? null,
    },
  });

  revalidatePath("/internal/subscriptions");
  revalidatePath(`/internal/businesses/${input.businessId}`);
  return { ok: true as const };
}

/** Extend trial / billing period from today (or current end if later). */
export async function extendBusinessTrial(input: {
  businessId: string;
  days: number;
}) {
  const admin = await requireInternalAdmin("subscriptions:write");
  const days = Math.min(365, Math.max(1, Math.floor(input.days)));
  const existing = await prisma.subscription.findUnique({
    where: { businessId: input.businessId },
  });

  const base =
    existing?.currentPeriodEnd && existing.currentPeriodEnd > new Date()
      ? existing.currentPeriodEnd
      : new Date();
  const periodEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { businessId: input.businessId },
    update: {
      status: "TRIAL",
      currentPeriodEnd: periodEnd,
    },
    create: {
      businessId: input.businessId,
      plan: "STARTER",
      status: "TRIAL",
      currentPeriodEnd: periodEnd,
    },
  });

  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "subscription.extend_trial",
    entity: "business",
    entityId: input.businessId,
    metadata: { days, periodEnd: periodEnd.toISOString() },
  });

  revalidatePath("/internal/subscriptions");
  revalidatePath(`/internal/businesses/${input.businessId}`);
  return { ok: true as const, periodEnd: periodEnd.toISOString() };
}

const STAFF_ROLES: InternalAdminRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "FINANCE",
  "DEVELOPER",
];

function parseStaffRole(value: unknown): InternalAdminRole | null {
  if (typeof value !== "string") return null;
  return STAFF_ROLES.includes(value as InternalAdminRole)
    ? (value as InternalAdminRole)
    : null;
}

/** Grant ops access to a user who has already signed into Zaplex once. */
export async function grantInternalAdmin(input: {
  email: string;
  role: InternalAdminRole;
}) {
  const admin = await requireInternalAdmin("admins:manage");
  const email = input.email.trim().toLowerCase();
  const role = parseStaffRole(input.role);
  if (!email || !role) {
    return { ok: false as const, error: "Valid email and role are required." };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!user) {
    return {
      ok: false as const,
      error:
        "No Zaplex user with that email yet. They must sign in once first, then you can grant access.",
    };
  }

  if (user.id === admin.userId && role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      error: "You cannot demote your own SUPER_ADMIN role from here.",
    };
  }

  const row = await prisma.internalAdmin.upsert({
    where: { userId: user.id },
    update: { role, disabled: false },
    create: { userId: user.id, role, disabled: false },
  });

  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "admin.grant",
    entity: "internal_admin",
    entityId: row.id,
    metadata: { email: user.email, role },
  });

  revalidatePath("/internal/admins");
  revalidatePath("/internal/users");
  return { ok: true as const };
}

export async function updateInternalAdminRole(input: {
  adminId: string;
  role: InternalAdminRole;
}) {
  const admin = await requireInternalAdmin("admins:manage");
  const role = parseStaffRole(input.role);
  if (!role) return { ok: false as const, error: "Invalid role." };

  const target = await prisma.internalAdmin.findUnique({
    where: { id: input.adminId },
  });
  if (!target) return { ok: false as const, error: "Staff record not found." };

  if (target.userId === admin.userId && role !== "SUPER_ADMIN") {
    return {
      ok: false as const,
      error: "You cannot demote your own account.",
    };
  }

  await prisma.internalAdmin.update({
    where: { id: input.adminId },
    data: { role },
  });

  await writeInternalAudit({
    actorUserId: admin.userId,
    action: "admin.role_update",
    entity: "internal_admin",
    entityId: input.adminId,
    metadata: { role },
  });

  revalidatePath("/internal/admins");
  return { ok: true as const };
}

export async function setInternalAdminDisabled(input: {
  adminId: string;
  disabled: boolean;
}) {
  const admin = await requireInternalAdmin("admins:manage");
  const target = await prisma.internalAdmin.findUnique({
    where: { id: input.adminId },
  });
  if (!target) return { ok: false as const, error: "Staff record not found." };

  if (target.userId === admin.userId && input.disabled) {
    return {
      ok: false as const,
      error: "You cannot disable your own staff access.",
    };
  }

  await prisma.internalAdmin.update({
    where: { id: input.adminId },
    data: { disabled: input.disabled },
  });

  await writeInternalAudit({
    actorUserId: admin.userId,
    action: input.disabled ? "admin.disable" : "admin.enable",
    entity: "internal_admin",
    entityId: input.adminId,
  });

  revalidatePath("/internal/admins");
  return { ok: true as const };
}
