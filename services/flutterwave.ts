import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/types";

const FLW_BASE = "https://api.flutterwave.com/v3";

function getSecretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
  return key;
}

export function isFlutterwaveConfigured(): boolean {
  return Boolean(
    process.env.FLUTTERWAVE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY
  );
}

export function generatePaymentReference(businessId: string): string {
  const slug = businessId.slice(-6).toUpperCase();
  return `ZX-${slug}-${Date.now()}`;
}

export function getPlanAmountNgn(planId: SubscriptionPlanId): number {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");
  return plan.price;
}

export function getFlutterwavePaymentPlanId(
  planId: SubscriptionPlanId
): string | undefined {
  const envMap: Record<SubscriptionPlanId, string | undefined> = {
    STARTER: process.env.FLUTTERWAVE_PLAN_STARTER,
    BUSINESS: process.env.FLUTTERWAVE_PLAN_BUSINESS,
    AI_PRO: process.env.FLUTTERWAVE_PLAN_AI_PRO,
  };
  const value = envMap[planId]?.trim();
  return value || undefined;
}

async function flwRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message ?? "Flutterwave request failed");
  }
  return data.data as T;
}

export interface InitializeFlutterwavePaymentParams {
  email: string;
  name?: string;
  amountNgn: number;
  reference: string;
  callbackUrl: string;
  planId: SubscriptionPlanId;
  metadata: Record<string, string>;
  /** Optional Flutterwave payment plan id for recurring billing */
  paymentPlanId?: string;
}

export interface InitializeFlutterwavePaymentResult {
  link: string;
}

export async function initializeFlutterwavePayment(
  params: InitializeFlutterwavePaymentParams
): Promise<InitializeFlutterwavePaymentResult> {
  return flwRequest<InitializeFlutterwavePaymentResult>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: params.reference,
      amount: params.amountNgn,
      currency: "NGN",
      redirect_url: params.callbackUrl,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: params.email,
        name: params.name || params.email,
      },
      customizations: {
        title: "Zaplex",
        description: `${params.planId} subscription`,
        logo: undefined,
      },
      meta: params.metadata,
      ...(params.paymentPlanId
        ? { payment_plan: Number(params.paymentPlanId) || params.paymentPlanId }
        : {}),
    }),
  });
}

export interface VerifyFlutterwaveTransactionResult {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  status: string;
  payment_type?: string;
  customer?: {
    id?: number;
    email?: string;
    name?: string;
  };
  meta?: Record<string, string> | null;
}

export async function verifyFlutterwaveByReference(
  reference: string
): Promise<VerifyFlutterwaveTransactionResult> {
  return flwRequest<VerifyFlutterwaveTransactionResult>(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`
  );
}

export async function verifyFlutterwaveById(
  transactionId: string | number
): Promise<VerifyFlutterwaveTransactionResult> {
  return flwRequest<VerifyFlutterwaveTransactionResult>(
    `/transactions/${transactionId}/verify`
  );
}

/** Flutterwave dashboard → Settings → Webhooks → Secret hash */
export function verifyFlutterwaveWebhookSignature(signature: string | null): boolean {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash || !signature) return false;
  return signature === secretHash;
}
