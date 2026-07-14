import crypto from "crypto";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/types";

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(
    process.env.PAYSTACK_SECRET_KEY && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
  );
}

async function paystackRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Paystack request failed");
  }
  return data.data as T;
}

export function generatePaymentReference(businessId: string): string {
  const slug = businessId.slice(-6).toUpperCase();
  return `BP-${slug}-${Date.now()}`;
}

export function getPlanAmountKobo(planId: SubscriptionPlanId): number {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");
  return plan.priceKobo;
}

export function getPaystackPlanCode(planId: SubscriptionPlanId): string | undefined {
  const envMap: Record<SubscriptionPlanId, string | undefined> = {
    STARTER: process.env.PAYSTACK_PLAN_STARTER,
    BUSINESS: process.env.PAYSTACK_PLAN_BUSINESS,
    AI_PRO: process.env.PAYSTACK_PLAN_AI_PRO,
  };
  return envMap[planId];
}

export interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
  /** Paystack plan code (PLN_...) — enables recurring subscription after first charge */
  planCode?: string;
}

export interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResult> {
  return paystackRequest<InitializeTransactionResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      ...(params.planCode ? { plan: params.planCode } : {}),
      // Card is required for reliable recurring; keep bank options for one-off.
      channels: params.planCode
        ? ["card"]
        : ["card", "bank", "ussd", "bank_transfer"],
    }),
  });
}

export interface VerifyTransactionResult {
  status: string;
  reference: string;
  amount: number;
  paid_at: string;
  channel: string;
  customer: { email: string; customer_code?: string; id?: number };
  authorization?: {
    authorization_code?: string;
    reusable?: boolean;
    channel?: string;
  };
  metadata: Record<string, string>;
  plan?: string | null;
}

export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResult> {
  return paystackRequest<VerifyTransactionResult>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export interface CreateCustomerResult {
  customer_code: string;
  email: string;
}

export async function createPaystackCustomer(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<CreateCustomerResult> {
  return paystackRequest<CreateCustomerResult>("/customer", {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
    }),
  });
}

export interface CreateSubscriptionResult {
  subscription_code: string;
  email_token: string;
  next_payment_date: string;
}

export async function createPaystackSubscription(
  customerCode: string,
  planCode: string,
  authorizationCode?: string
): Promise<CreateSubscriptionResult> {
  return paystackRequest<CreateSubscriptionResult>("/subscription", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      plan: planCode,
      ...(authorizationCode ? { authorization: authorizationCode } : {}),
    }),
  });
}

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

export function ngnFromKobo(kobo: number): number {
  return kobo / 100;
}
