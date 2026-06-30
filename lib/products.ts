import { cache } from "react";
import { prisma } from "@/lib/db";

const inventoryListSelect = {
  id: true,
  name: true,
  category: true,
  sellingPrice: true,
  quantity: true,
  reorderLevel: true,
  expiryDate: true,
} as const;

const inventoryDetailSelect = {
  ...inventoryListSelect,
  barcode: true,
  purchasePrice: true,
} as const;

export type InventoryListProduct = {
  id: string;
  name: string;
  category: string | null;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: Date | null;
  imageUrl: string | null;
};

export type InventoryDetailProduct = InventoryListProduct & {
  barcode: string | null;
  purchasePrice: number;
};

const supportsProductImages = cache(async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT "imageUrl" FROM "products" LIMIT 0`;
    return true;
  } catch {
    return false;
  }
});

export async function listInventoryProducts(
  businessId: string
): Promise<InventoryListProduct[]> {
  const withImages = await supportsProductImages();

  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
    select: withImages
      ? { ...inventoryListSelect, imageUrl: true }
      : inventoryListSelect,
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    sellingPrice: Number(product.sellingPrice),
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    expiryDate: product.expiryDate,
    imageUrl:
      withImages && "imageUrl" in product
        ? (product.imageUrl as string | null)
        : null,
  }));
}

export async function getInventoryProduct(
  businessId: string,
  productId: string
): Promise<InventoryDetailProduct | null> {
  const withImages = await supportsProductImages();

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId, isActive: true },
    select: withImages
      ? { ...inventoryDetailSelect, imageUrl: true }
      : inventoryDetailSelect,
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    barcode: product.barcode,
    purchasePrice: Number(product.purchasePrice),
    sellingPrice: Number(product.sellingPrice),
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    expiryDate: product.expiryDate,
    imageUrl:
      withImages && "imageUrl" in product
        ? (product.imageUrl as string | null)
        : null,
  };
}

export async function updateProductImageUrl(
  productId: string,
  imageUrl: string | null
): Promise<boolean> {
  if (!(await supportsProductImages())) {
    return false;
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });
    return true;
  } catch {
    return false;
  }
}

const productSaleSelect = {
  id: true,
  name: true,
  quantity: true,
  sellingPrice: true,
  purchasePrice: true,
} as const;

export async function getProductsForSale(
  businessId: string,
  productIds: string[]
) {
  return prisma.product.findMany({
    where: { id: { in: productIds }, businessId },
    select: productSaleSelect,
  });
}

const productCreateSelect = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  category: true,
  purchasePrice: true,
  sellingPrice: true,
  quantity: true,
  reorderLevel: true,
  batchNumber: true,
  expiryDate: true,
  businessId: true,
} as const;

export async function createInventoryProduct(
  data: Parameters<typeof prisma.product.create>[0]["data"]
) {
  return prisma.product.create({
    data,
    select: productCreateSelect,
  });
}
