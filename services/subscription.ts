import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import type { SubscriptionPlan } from "@prisma/client";
import type { SubscriptionPlanId } from "@/types";
import {
  generatePaymentReference,
  getFlutterwavePaymentPlanId,
  getPlanAmountNgn,
  initializeFlutterwavePayment,
  verifyFlutterwaveById,
  verifyFlutterwaveByReference,
} from "@/services/flutterwave";

const BILLING_PERIOD_DAYS = 30;

export async function getBusinessSubscription(businessId: string) {
  return prisma.subscription.findUnique({
    where: { businessId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function activateSubscription(
  businessId: string,
  plan: SubscriptionPlan,
  reference: string,
  amountNgn: number,
  channel?: string,
  providerCustomerId?: string,
  providerSubId?: string
) {
  const periodEnd = addDays(new Date(), BILLING_PERIOD_DAYS);

  return prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.updateMany({
      where: { reference },
      data: {
        status: "success",
        channel,
        paidAt: new Date(),
      },
    });

    return tx.subscription.upsert({
      where: { businessId },
      update: {
        plan,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
        lastPaymentReference: reference,
        // Reuse existing columns for Flutterwave customer / plan ids.
        paystackCustomerCode: providerCustomerId ?? undefined,
        paystackSubCode: providerSubId ?? undefined,
      },
      create: {
        businessId,
        plan,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
        lastPaymentReference: reference,
        paystackCustomerCode: providerCustomerId,
        paystackSubCode: providerSubId,
      },
    });
  });
}

export async function markSubscriptionPastDue(businessId: string) {
  return prisma.subscription.update({
    where: { businessId },
    data: { status: "PAST_DUE" },
  });
}

export async function initializePlanCheckout(
  businessId: string,
  planId: SubscriptionPlanId,
  email: string,
  userName?: string
) {
  const reference = generatePaymentReference(businessId);
  const amountNgn = getPlanAmountNgn(planId);
  const appUrl = getAppUrl();
  const paymentPlanId = getFlutterwavePaymentPlanId(planId);

  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
  });

  const transaction = await prisma.paymentTransaction.create({
    data: {
      businessId,
      subscriptionId: subscription?.id,
      reference,
      plan: planId,
      amount: amountNgn,
      status: "pending",
      metadata: {
        plan: planId,
        businessId,
        provider: "flutterwave",
        ...(paymentPlanId ? { flutterwavePlanId: paymentPlanId } : {}),
      },
    },
  });

  const result = await initializeFlutterwavePayment({
    email,
    name: userName,
    amountNgn,
    reference,
    callbackUrl: `${appUrl}/settings/billing/callback`,
    planId,
    paymentPlanId,
    metadata: {
      businessId,
      plan: planId,
      transactionId: transaction.id,
      ...(paymentPlanId ? { flutterwavePlanId: paymentPlanId } : {}),
    },
  });

  return {
    authorizationUrl: result.link,
    reference,
  };
}

export async function verifyAndActivatePayment(
  reference: string,
  transactionId?: string
) {
  const existing = await prisma.paymentTransaction.findUnique({
    where: { reference },
  });

  if (!existing) {
    return { success: false, error: "Payment not found" };
  }

  if (existing.status === "success") {
    const sub = await prisma.subscription.findUnique({
      where: { businessId: existing.businessId },
    });
    return { success: true, alreadyProcessed: true, subscription: sub };
  }

  let verified;
  try {
    verified = transactionId
      ? await verifyFlutterwaveById(transactionId)
      : await verifyFlutterwaveByReference(reference);
  } catch (error) {
    // Fallback: if callback only has tx_ref, try reference verify once more.
    if (transactionId) {
      verified = await verifyFlutterwaveByReference(reference);
    } else {
      throw error;
    }
  }

  const ok =
    verified.status === "successful" ||
    verified.status === "success" ||
    String(verified.status).toLowerCase() === "successful";

  if (!ok || verified.tx_ref !== reference) {
    await prisma.paymentTransaction.update({
      where: { reference },
      data: { status: "failed" },
    });
    return { success: false, error: "Payment not successful" };
  }

  const meta = (verified.meta ?? {}) as Record<string, string>;
  const businessId = meta.businessId ?? existing.businessId;
  const plan = (meta.plan ?? existing.plan) as SubscriptionPlan;
  const customerId = verified.customer?.id
    ? String(verified.customer.id)
    : undefined;
  const paymentPlanId =
    meta.flutterwavePlanId || getFlutterwavePaymentPlanId(plan as SubscriptionPlanId);

  const subscription = await activateSubscription(
    businessId,
    plan,
    reference,
    Number(verified.amount),
    verified.payment_type,
    customerId,
    paymentPlanId
  );

  await prisma.auditLog.create({
    data: {
      businessId,
      action: "subscription.activated",
      entity: "subscription",
      entityId: subscription.id,
      metadata: {
        plan,
        reference,
        amount: Number(verified.amount),
        provider: "flutterwave",
      },
    },
  });

  return { success: true, subscription };
}

export async function handleFlutterwaveWebhookEvent(
  event: string,
  data: Record<string, unknown>
) {
  switch (event) {
    case "charge.completed": {
      const status = String(data.status ?? "").toLowerCase();
      if (status !== "successful" && status !== "success") {
        break;
      }
      const reference = String(data.tx_ref ?? "");
      const transactionId = data.id != null ? String(data.id) : undefined;
      if (reference) {
        return verifyAndActivatePayment(reference, transactionId);
      }
      break;
    }
    case "subscription.cancelled": {
      const id = data.id != null ? String(data.id) : undefined;
      if (id) {
        const sub = await prisma.subscription.findFirst({
          where: { paystackSubCode: id },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELLED" },
          });
        }
      }
      break;
    }
    default:
      break;
  }
  return { handled: true };
}
