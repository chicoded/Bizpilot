import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import type { SubscriptionPlan } from "@prisma/client";
import type { SubscriptionPlanId } from "@/types";
import {
  createPaystackCustomer,
  createPaystackSubscription,
  generatePaymentReference,
  getPaystackPlanCode,
  getPlanAmountKobo,
  initializeTransaction,
  ngnFromKobo,
  verifyTransaction,
} from "@/services/paystack";

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
  paystackCustomerCode?: string,
  paystackSubCode?: string
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
        paystackCustomerCode: paystackCustomerCode ?? undefined,
        paystackSubCode: paystackSubCode ?? undefined,
      },
      create: {
        businessId,
        plan,
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
        lastPaymentReference: reference,
        paystackCustomerCode,
        paystackSubCode,
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
  const amountKobo = getPlanAmountKobo(planId);
  const appUrl = getAppUrl();

  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
  });

  const transaction = await prisma.paymentTransaction.create({
    data: {
      businessId,
      subscriptionId: subscription?.id,
      reference,
      plan: planId,
      amount: amountKobo / 100,
      status: "pending",
      metadata: { plan: planId, businessId },
    },
  });

  const paystackPlanCode = getPaystackPlanCode(planId);

  const result = await initializeTransaction({
    email,
    amountKobo,
    reference,
    callbackUrl: `${appUrl}/settings/billing/callback`,
    planCode: paystackPlanCode,
    metadata: {
      businessId,
      plan: planId,
      transactionId: transaction.id,
      ...(paystackPlanCode ? { paystackPlanCode } : {}),
    },
  });

  return {
    authorizationUrl: result.authorization_url,
    reference: result.reference,
  };
}

export async function verifyAndActivatePayment(reference: string) {
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

  const verified = await verifyTransaction(reference);

  if (verified.status !== "success") {
    await prisma.paymentTransaction.update({
      where: { reference },
      data: { status: "failed" },
    });
    return { success: false, error: "Payment not successful" };
  }

  const metadata = verified.metadata ?? {};
  const businessId = metadata.businessId ?? existing.businessId;
  const plan = (metadata.plan ?? existing.plan) as SubscriptionPlan;

  let customerCode: string | undefined = verified.customer?.customer_code;

  if (!customerCode) {
    try {
      const customer = await createPaystackCustomer(verified.customer.email);
      customerCode = customer.customer_code;
    } catch {
      // Customer may already exist
    }
  }

  let paystackSubCode: string | undefined;
  const planCode =
    getPaystackPlanCode(plan as SubscriptionPlanId) ||
    metadata.paystackPlanCode;
  const authorizationCode = verified.authorization?.authorization_code;

  // After first charge, register recurring subscription when plan codes are set.
  if (planCode && customerCode && authorizationCode) {
    try {
      const sub = await createPaystackSubscription(
        customerCode,
        planCode,
        authorizationCode
      );
      paystackSubCode = sub.subscription_code;
    } catch (error) {
      console.warn(
        "[billing] Could not create Paystack subscription (payment still counted):",
        error instanceof Error ? error.message : error
      );
    }
  }

  const subscription = await activateSubscription(
    businessId,
    plan,
    reference,
    ngnFromKobo(verified.amount),
    verified.channel,
    customerCode,
    paystackSubCode
  );

  await prisma.auditLog.create({
    data: {
      businessId,
      action: "subscription.activated",
      entity: "subscription",
      entityId: subscription.id,
      metadata: { plan, reference, amount: ngnFromKobo(verified.amount) },
    },
  });

  return { success: true, subscription };
}

export async function handlePaystackWebhookEvent(event: string, data: Record<string, unknown>) {
  switch (event) {
    case "charge.success": {
      const reference = data.reference as string;
      if (reference) {
        return verifyAndActivatePayment(reference);
      }
      break;
    }
    case "subscription.create": {
      const subCode = data.subscription_code as string;
      const customer = data.customer as { customer_code?: string };
      const plan = data.plan as { plan_code?: string };
      // Match business by customer code if possible
      if (customer?.customer_code) {
        const subscription = await prisma.subscription.findFirst({
          where: { paystackCustomerCode: customer.customer_code },
        });
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              paystackSubCode: subCode,
              status: "ACTIVE",
              currentPeriodEnd: addDays(new Date(), BILLING_PERIOD_DAYS),
            },
          });
        }
      }
      void plan;
      break;
    }
    case "invoice.payment_failed": {
      const subscriptionCode = data.subscription as { subscription_code?: string };
      if (subscriptionCode?.subscription_code) {
        const sub = await prisma.subscription.findFirst({
          where: { paystackSubCode: subscriptionCode.subscription_code },
        });
        if (sub) await markSubscriptionPastDue(sub.businessId);
      }
      break;
    }
    case "invoice.update":
    case "invoice.create": {
      // Successful recurring invoice — extend access window.
      const paid = data.status === "success" || data.paid === true || data.paid === 1;
      const subscriptionCode =
        (data.subscription as { subscription_code?: string } | undefined)
          ?.subscription_code ??
        (typeof data.subscription === "string" ? data.subscription : undefined);
      if (paid && subscriptionCode) {
        const sub = await prisma.subscription.findFirst({
          where: { paystackSubCode: subscriptionCode },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: addDays(new Date(), BILLING_PERIOD_DAYS),
            },
          });
        }
      }
      break;
    }
    case "subscription.disable": {
      const code = data.subscription_code as string;
      const sub = await prisma.subscription.findFirst({
        where: { paystackSubCode: code },
      });
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "CANCELLED" },
        });
      }
      break;
    }
  }
  return { handled: true };
}
