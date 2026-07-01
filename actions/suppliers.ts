"use server";

import { revalidatePath } from "next/cache";
import { requireSectionAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/validations";

function formatSupplierErrors(fieldErrors: Record<string, string[] | undefined>) {
  return (
    fieldErrors.name?.[0] ??
    fieldErrors.email?.[0] ??
    fieldErrors.contact?.[0] ??
    "Invalid supplier data"
  );
}

export async function createSupplier(data: {
  name: string;
  contact?: string;
  email?: string;
  address?: string;
}) {
  const ctx = await requireSectionAccess("suppliers");
  const parsed = supplierSchema.safeParse(data);

  if (!parsed.success) {
    return { error: formatSupplierErrors(parsed.error.flatten().fieldErrors) };
  }

  const supplier = await prisma.supplier.create({
    data: {
      businessId: ctx.businessId,
      name: parsed.data.name,
      contact: parsed.data.contact || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  return { success: true, supplier };
}

export async function updateSupplier(
  supplierId: string,
  data: {
    name: string;
    contact?: string;
    email?: string;
    address?: string;
  }
) {
  const ctx = await requireSectionAccess("suppliers");
  const parsed = supplierSchema.safeParse(data);

  if (!parsed.success) {
    return { error: formatSupplierErrors(parsed.error.flatten().fieldErrors) };
  }

  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId: ctx.businessId },
    select: { id: true },
  });

  if (!existing) {
    return { error: "Supplier not found" };
  }

  const supplier = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: parsed.data.name,
      contact: parsed.data.contact || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/inventory");
  return { success: true, supplier };
}

export async function deleteSupplier(supplierId: string) {
  const ctx = await requireSectionAccess("suppliers");

  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId: ctx.businessId },
    include: { _count: { select: { purchaseOrders: true } } },
  });

  if (!existing) {
    return { error: "Supplier not found" };
  }

  if (existing._count.purchaseOrders > 0) {
    return {
      error: "Cannot delete a supplier with purchase orders. Remove or reassign orders first.",
    };
  }

  await prisma.supplier.delete({ where: { id: supplierId } });

  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  return { success: true };
}
