import { notFound, redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/features/customers/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePageAccess("customers");

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true, name: true, phone: true, email: true },
  });

  if (!customer) notFound();

  return (
    <CustomerForm
      mode="edit"
      customerId={customer.id}
      defaultValues={{
        name: customer.name,
        phone: customer.phone ?? "",
        email: customer.email ?? "",
      }}
    />
  );
}
