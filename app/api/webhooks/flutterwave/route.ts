import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyFlutterwaveWebhookSignature } from "@/services/flutterwave";
import { handleFlutterwaveWebhookEvent } from "@/services/subscription";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limit = rateLimit(`flutterwave-webhook:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const signature = request.headers.get("verif-hash");
    if (!verifyFlutterwaveWebhookSignature(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = await request.json();
    const event = String(payload?.event ?? payload?.["event.type"] ?? "");
    const data = (payload?.data ?? payload) as Record<string, unknown>;

    await handleFlutterwaveWebhookEvent(event, data);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Flutterwave webhook]", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Zaplex Flutterwave Webhook",
  });
}
