import { prisma } from "@/lib/db";

export type LowStockProduct = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  reorderLevel: number;
  suggestedOrderQty: number;
  shortfall: number;
  supplierId: string | null;
  supplier: {
    id: string;
    name: string;
    contact: string | null;
  } | null;
};

export type LowStockSupplierGroup = {
  supplierId: string;
  supplierName: string;
  supplierContact: string | null;
  hasPhone: boolean;
  products: LowStockProduct[];
};

export function suggestReorderQuantity(
  quantity: number,
  reorderLevel: number
): number {
  if (reorderLevel <= 0) return Math.max(1, 10 - quantity);
  return Math.max(reorderLevel * 2 - quantity, reorderLevel, 1);
}

export function supplierHasPhone(contact: string | null | undefined): boolean {
  return Boolean(contact && /(?:\+?234|0)\d{9,10}/.test(contact));
}

export async function listLowStockProducts(
  businessId: string
): Promise<LowStockProduct[]> {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      quantity: true,
      reorderLevel: true,
      supplierId: true,
      supplier: {
        select: { id: true, name: true, contact: true },
      },
    },
    orderBy: [{ quantity: "asc" }, { name: "asc" }],
  });

  return products
    .filter((product) => product.quantity <= product.reorderLevel)
    .map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      suggestedOrderQty: suggestReorderQuantity(
        product.quantity,
        product.reorderLevel
      ),
      shortfall: Math.max(product.reorderLevel - product.quantity, 0),
      supplierId: product.supplierId,
      supplier: product.supplier,
    }));
}

export function groupLowStockBySupplier(products: LowStockProduct[]) {
  const unassigned = products.filter((product) => !product.supplierId);
  const groups = new Map<string, LowStockSupplierGroup>();

  for (const product of products) {
    if (!product.supplierId || !product.supplier) continue;

    const existing = groups.get(product.supplierId);
    if (existing) {
      existing.products.push(product);
      continue;
    }

    groups.set(product.supplierId, {
      supplierId: product.supplierId,
      supplierName: product.supplier.name,
      supplierContact: product.supplier.contact,
      hasPhone: supplierHasPhone(product.supplier.contact),
      products: [product],
    });
  }

  return {
    unassigned,
    supplierGroups: Array.from(groups.values()).sort((a, b) =>
      a.supplierName.localeCompare(b.supplierName)
    ),
  };
}
