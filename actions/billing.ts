"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { requireSectionAccess } from "@/lib/auth";
import {
  getBusinessSubscription,
  initializePlanCheckout,
  verifyAndActivatePayment,
} from "@/services/subscription";
import { isPaystackConfigured } from "@/services/paystack";
import { getAppUrl } from "@/lib/env";
import type { SubscriptionPlanId } from "@/types";
import { z } from "zod";

const planSchema = z.enum(["STARTER", "BUSINESS", "AI_PRO"]);

export async function getBillingData() {
  const ctx = await requireSectionAccess("billing");
  const user = await currentUser();
  const subscription = await getBusinessSubscription(ctx.businessId);

  return {
    subscription,
    paystackConfigured: isPaystackConfigured(),
    webhookUrl: `${getAppUrl()}/api/webhooks/paystack`,
    email: user?.emailAddresses[0]?.emailAddress ?? "",
    businessName: ctx.business.name,
  };
}

export async function startCheckout(planId: string) {
  const parsed = planSchema.safeParse(planId);
  if (!parsed.success) {
    return { error: "Invalid plan selected" };
  }

  if (!isPaystackConfigured()) {
    return {
      error:
        "Paystack is not configured. Add PAYSTACK_SECRET_KEY and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to your environment.",
    };
  }

  const ctx = await requireSectionAccess("billing");
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  if (!email) {
    return { error: "No email on your account. Add an email in your profile." };
  }

  try {
    const { authorizationUrl } = await initializePlanCheckout(
      ctx.businessId,
      parsed.data as SubscriptionPlanId,
      email,
      user?.firstName ?? undefined
    );

    redirect(authorizationUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return { error: message };
  }
}

export async function verifyCheckout(reference: string) {
  if (!reference) {
    return { success: false, error: "Missing payment reference" };
  }

  try {
    const result = await verifyAndActivatePayment(reference);
    revalidatePath("/settings");
    revalidatePath("/settings/billing");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return { success: false, error: message };
  }
}
