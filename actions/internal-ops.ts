"use server";

import { revalidatePath } from "next/cache";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
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
  return { ok: true };
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
  return { ok: true };
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
  return { ok: true };
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
  return { ok: true };
}
