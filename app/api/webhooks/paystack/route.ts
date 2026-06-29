import { NextResponse } from "next/server";
import { verifyPaystackWebhookSignature } from "@/services/paystack";
import { handlePaystackWebhookEvent } from "@/services/subscription";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`paystack-webhook:${ip}`, 60, 60_000);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      data: Record<string, unknown>;
    };

    await handlePaystackWebhookEvent(payload.event, payload.data);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Paystack webhook]", err);
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "BizPilot Paystack Webhook" });
}
