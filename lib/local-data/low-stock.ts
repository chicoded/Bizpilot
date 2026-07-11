import { listLocalProducts } from "@/lib/local-data/products";

export type LocalLowStockProduct = {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  suggestedOrderQty: number;
};

export async function listLocalLowStockProducts(
  businessId: string
): Promise<LocalLowStockProduct[]> {
  const products = await listLocalProducts(businessId);

  return products
    .filter((product) => product.quantity <= product.reorderLevel)
    .map((product) => ({
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      suggestedOrderQty: Math.max(product.reorderLevel * 2 - product.quantity, 1),
    }))
    .sort((a, b) => a.quantity - b.quantity);
}
