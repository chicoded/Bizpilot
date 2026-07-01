import { prisma } from "@/lib/db";
import { resolveCustomerPhone } from "@/lib/phone";

export type BroadcastCustomer = {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
  hasValidPhone: boolean;
};

export async function listCustomersForBroadcast(
  businessId: string
): Promise<BroadcastCustomer[]> {
  const customers = await prisma.customer.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      debt: true,
    },
  });

  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    debt: Number(customer.debt),
    hasValidPhone: Boolean(resolveCustomerPhone(customer.phone)),
  }));
}

export function personalizeBroadcastMessage(
  template: string,
  customerName: string,
  businessName: string
): string {
  return template
    .replace(/\{name\}/gi, customerName)
    .replace(/\{business\}/gi, businessName);
}
