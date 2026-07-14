import { NextResponse } from "next/server";

/**
 * Paystack billing is retired in favor of Flutterwave.
 * Keep this route so old dashboard webhook URLs don't 500 the build.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Paystack webhooks are disabled. Use Flutterwave.",
      flutterwave: "/api/webhooks/flutterwave",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({
    status: "disabled",
    service: "Zaplex Paystack Webhook (retired)",
    use: "/api/webhooks/flutterwave",
  });
}
