import { NextResponse } from "next/server";
import { validateTwilioSignature } from "@/services/twilio";
import { processInboundWhatsApp } from "@/services/whatsapp";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/env";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twimlResponse() {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`whatsapp-webhook:${ip}`, 120, 60_000);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const signature = request.headers.get("x-twilio-signature");
    const url = `${getAppUrl()}/api/webhooks/whatsapp`;

    if (!validateTwilioSignature(url, params, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const from = params.From ?? "";
    const to = params.To ?? "";
    const body = params.Body ?? "";
    const messageSid = params.MessageSid;

    if (!from || !body) {
      return twimlResponse();
    }

    // Process async — reply via Twilio REST API (AI may take a few seconds)
    processInboundWhatsApp({ from, to, body, messageSid }).catch((err) => {
      console.error("[WhatsApp webhook]", err);
    });

    return twimlResponse();
  } catch (err) {
    console.error("[WhatsApp webhook error]", err);
    return twimlResponse();
  }
}

// Twilio may send GET to verify webhook URL
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Zaplex WhatsApp AI",
  });
}
