import { requirePageAccess } from "@/lib/auth";
import { listCustomersForBroadcast } from "@/lib/customers";
import { prisma } from "@/lib/db";
import { CustomerBroadcastForm } from "@/features/customers/customer-broadcast-form";
import { isTwilioConfigured } from "@/services/twilio";

export default async function CustomerBroadcastPage() {
  const ctx = await requirePageAccess("customers");

  const [customers, whatsappConfig] = await Promise.all([
    listCustomersForBroadcast(ctx.businessId),
    prisma.whatsAppConfig.findUnique({
      where: { businessId: ctx.businessId },
      select: { isEnabled: true },
    }),
  ]);

  return (
    <CustomerBroadcastForm
      customers={customers}
      currency={ctx.business.currency}
      twilioConfigured={isTwilioConfigured()}
      whatsappEnabled={whatsappConfig?.isEnabled ?? false}
    />
  );
}
