"use server";

import { revalidatePath } from "next/cache";
import { requireSectionAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { personalizeBroadcastMessage } from "@/lib/customers";
import { resolveCustomerPhone } from "@/lib/phone";
import { customerBroadcastSchema } from "@/lib/validations";
import { sendManualWhatsAppReply } from "@/services/whatsapp";
import { isTwilioConfigured } from "@/services/twilio";

const SEND_DELAY_MS = 350;
const MAX_RECIPIENTS = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendCustomerBroadcast(data: {
  message: string;
  audience: "all" | "debtors" | "selected";
  customerIds?: string[];
}) {
  const ctx = await requireSectionAccess("customers");
  const parsed = customerBroadcastSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.message?.[0] ??
        parsed.error.flatten().fieldErrors.customerIds?.[0] ??
        "Invalid broadcast",
    };
  }

  const config = await prisma.whatsAppConfig.findUnique({
    where: { businessId: ctx.businessId },
  });

  if (!isTwilioConfigured()) {
    return {
      error:
        "Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER.",
    };
  }

  if (!config?.isEnabled) {
    return {
      error: "Enable WhatsApp AI in Settings before sending broadcasts.",
    };
  }

  const customers = await prisma.customer.findMany({
    where: {
      businessId: ctx.businessId,
      ...(parsed.data.audience === "debtors" ? { debt: { gt: 0 } } : {}),
      ...(parsed.data.audience === "selected" && parsed.data.customerIds?.length
        ? { id: { in: parsed.data.customerIds } }
        : {}),
      phone: { not: null },
    },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  const recipients = customers
    .map((customer) => ({
      ...customer,
      normalizedPhone: resolveCustomerPhone(customer.phone),
    }))
    .filter(
      (customer): customer is typeof customer & { normalizedPhone: string } =>
        Boolean(customer.normalizedPhone)
    );

  if (recipients.length === 0) {
    return {
      error: "No customers with valid WhatsApp phone numbers match this audience.",
    };
  }

  if (recipients.length > MAX_RECIPIENTS) {
    return {
      error: `Too many recipients (${recipients.length}). Send to at most ${MAX_RECIPIENTS} customers at a time.`,
    };
  }

  let sent = 0;
  let failed = 0;
  const failures: { name: string; error: string }[] = [];

  for (const [index, recipient] of recipients.entries()) {
    const body = personalizeBroadcastMessage(
      parsed.data.message,
      recipient.name,
      ctx.business.name
    );

    const result = await sendManualWhatsAppReply(
      ctx.businessId,
      recipient.normalizedPhone,
      body
    );

    if (result.success) {
      sent += 1;
    } else {
      failed += 1;
      if (failures.length < 5) {
        failures.push({
          name: recipient.name,
          error: result.error ?? "Failed to send",
        });
      }
    }

    if (index < recipients.length - 1) {
      await sleep(SEND_DELAY_MS);
    }
  }

  revalidatePath("/whatsapp");
  revalidatePath("/customers");
  revalidatePath("/customers/broadcast");

  return {
    success: true,
    sent,
    failed,
    total: recipients.length,
    failures,
  };
}
