"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { requireSectionAccess } from "@/lib/auth";
import {
  expireStalePendingPayments,
  getBusinessSubscription,
  initializePlanCheckout,
  verifyAndActivatePayment,
} from "@/services/subscription";
import { isFlutterwaveConfigured } from "@/services/flutterwave";
import type { SubscriptionPlanId } from "@/types";
import { z } from "zod";

const planSchema = z.enum(["STARTER", "BUSINESS", "AI_PRO"]);

export async function getBillingData() {
  const ctx = await requireSectionAccess("billing");
  const user = await currentUser();
  await expireStalePendingPayments(ctx.businessId);
  const subscription = await getBusinessSubscription(ctx.businessId);

  return {
    subscription,
    paymentsConfigured: isFlutterwaveConfigured(),
    email: user?.emailAddresses[0]?.emailAddress ?? "",
    businessName: ctx.business.name,
  };
}

export async function startCheckout(planId: string) {
  const parsed = planSchema.safeParse(planId);
  if (!parsed.success) {
    return { error: "Invalid plan selected" };
  }

  if (!isFlutterwaveConfigured()) {
    return {
      error: "Online payments are temporarily unavailable. Please try again later.",
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
    // Next.js redirect() throws; must rethrow or checkout "fails" after payment URL is ready.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Checkout failed";
    return { error: message };
  }
}

export async function verifyCheckout(
  reference: string,
  transactionId?: string,
  options?: { forceFail?: boolean }
) {
  if (!reference) {
    return { success: false, error: "Missing payment reference" };
  }

  try {
    const result = await verifyAndActivatePayment(
      reference,
      transactionId,
      options
    );
    revalidatePath("/settings");
    revalidatePath("/settings/billing");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return { success: false, error: message };
  }
}
