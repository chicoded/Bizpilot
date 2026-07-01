import { prisma } from "@/lib/db";

export async function listSuppliersForBusiness(businessId: string) {
  return prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getSupplierWithProducts(
  businessId: string,
  supplierId: string
) {
  return prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
    include: {
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          quantity: true,
          sellingPrice: true,
          category: true,
        },
        orderBy: { name: "asc" },
      },
      _count: { select: { purchaseOrders: true } },
    },
  });
}
