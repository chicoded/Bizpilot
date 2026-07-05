import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getProductSchemaStatus,
  ensureProductSchemaReady,
  checkProductColumn,
  type ProductColumnName,
} from "@/lib/schema";
import type {
  InventoryDetailProduct,
  InventoryListProduct,
  ProductApiItem,
} from "@/types";

export type { InventoryDetailProduct, InventoryListProduct, ProductApiItem };

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
  unitsPerPack: true,
  supplierId: true,
} as const;

const productApiSelect = {
  id: true,
  name: true,
  sellingPrice: true,
  quantity: true,
  barcode: true,
} as const;

function normalizeListProduct(
  product: {
    id: string;
    name: string;
    category: string | null;
    sellingPrice: { toString(): string } | number;
    quantity: number;
    reorderLevel: number;
    expiryDate: Date | null;
    imageUrl?: string | null;
  },
  withImages: boolean
): InventoryListProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category ?? null,
    sellingPrice: Number(product.sellingPrice),
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    expiryDate: product.expiryDate ?? null,
    imageUrl: withImages ? (product.imageUrl ?? null) : null,
  };
}

function normalizeDetailProduct(
  product: {
    id: string;
    name: string;
    category: string | null;
    barcode: string | null;
    purchasePrice: { toString(): string } | number;
    sellingPrice: { toString(): string } | number;
    unitsPerPack?: number;
    quantity: number;
    reorderLevel: number;
    expiryDate: Date | null;
    supplierId?: string | null;
    imageUrl?: string | null;
  },
  withImages: boolean
): InventoryDetailProduct {
  return {
    ...normalizeListProduct(product, withImages),
    barcode: product.barcode ?? null,
    purchasePrice: Number(product.purchasePrice),
    unitsPerPack: product.unitsPerPack ?? 1,
    supplierId: product.supplierId ?? null,
  };
}

async function fetchInventoryList(
  businessId: string,
  withImages: boolean
) {
  return prisma.product.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
    select: withImages
      ? { ...inventoryListSelect, imageUrl: true }
      : inventoryListSelect,
  });
}

export async function listInventoryProducts(
  businessId: string
): Promise<InventoryListProduct[]> {
  try {
    await ensureProductSchemaReady();

    const withImages = await checkProductColumn("imageUrl");

    try {
      const products = await fetchInventoryList(businessId, withImages);
      return products.map((product) =>
        normalizeListProduct(product, withImages)
      );
    } catch (error) {
      console.error("listInventoryProducts failed:", error);

      if (withImages) {
        try {
          const products = await fetchInventoryList(businessId, false);
          return products.map((product) => normalizeListProduct(product, false));
        } catch (retryError) {
          console.error("listInventoryProducts retry failed:", retryError);
        }
      }
    }

    return [];
  } catch (error) {
    console.error("listInventoryProducts unexpected failure:", error);
    return [];
  }
}

export async function getInventoryProduct(
  businessId: string,
  productId: string
): Promise<InventoryDetailProduct | null> {
  await ensureProductSchemaReady();

  const withImages = await checkProductColumn("imageUrl");

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId, isActive: true },
      select: withImages
        ? { ...inventoryDetailSelect, imageUrl: true }
        : inventoryDetailSelect,
    });

    if (!product) return null;
    return normalizeDetailProduct(product, withImages);
  } catch (error) {
    console.error("getInventoryProduct failed:", error);

    if (!withImages) return null;

    try {
      const product = await prisma.product.findFirst({
        where: { id: productId, businessId, isActive: true },
        select: inventoryDetailSelect,
      });

      if (!product) return null;
      return normalizeDetailProduct(product, false);
    } catch (retryError) {
      console.error("getInventoryProduct retry failed:", retryError);
      return null;
    }
  }
}

export async function listProductsForApi(
  businessId: string
): Promise<ProductApiItem[]> {
  const withImages = await checkProductColumn("imageUrl");

  try {
    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: "asc" },
      select: withImages
        ? { ...productApiSelect, imageUrl: true }
        : productApiSelect,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sellingPrice: Number(product.sellingPrice),
      quantity: product.quantity,
      barcode: product.barcode ?? null,
      imageUrl:
        withImages && "imageUrl" in product
          ? ((product as { imageUrl?: string | null }).imageUrl ?? null)
          : null,
    }));
  } catch (error) {
    console.error("listProductsForApi failed:", error);

    if (!withImages) return [];

    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: "asc" },
      select: productApiSelect,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sellingPrice: Number(product.sellingPrice),
      quantity: product.quantity,
      barcode: product.barcode ?? null,
      imageUrl: null,
    }));
  }
}

export async function updateProductImageUrl(
  productId: string,
  imageUrl: string | null
): Promise<boolean> {
  if (!(await checkProductColumn("imageUrl"))) {
    return false;
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
      select: { id: true },
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

const productMutationSelect = {
  id: true,
} as const;

export async function updateInventoryProduct(
  productId: string,
  data: Parameters<typeof prisma.product.update>[0]["data"],
  tx: Pick<typeof prisma, "product"> = prisma
) {
  await ensureProductSchemaReady();

  const status = await getProductSchemaStatus();
  const safeData = omitMissingProductColumns(
    data as Record<string, unknown>,
    status.missing
  ) as Parameters<typeof prisma.product.update>[0]["data"];

  return tx.product.update({
    where: { id: productId },
    data: safeData,
    select: productMutationSelect,
  });
}

function omitMissingProductColumns<T extends Record<string, unknown>>(
  payload: T,
  missing: ProductColumnName[]
): T {
  if (missing.length === 0) return payload;

  const next = { ...payload };
  for (const column of missing) {
    delete next[column];
  }
  return next;
}

export async function createInventoryProduct(
  data: Parameters<typeof prisma.product.create>[0]["data"]
) {
  await ensureProductSchemaReady();

  const status = await getProductSchemaStatus();
  const safeData = omitMissingProductColumns(
    data as Record<string, unknown>,
    status.missing
  ) as Parameters<typeof prisma.product.create>[0]["data"];
  const safeSelect = omitMissingProductColumns(
    { ...productCreateSelect },
    status.missing
  );

  try {
    return await prisma.product.create({
      data: safeData,
      select: safeSelect,
    });
  } catch (error) {
    const isMissingColumn =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2022") ||
      (error instanceof Error &&
        /column [`"]?(\w+)[`"]? .*does not exist|P2022/i.test(error.message));

    if (!isMissingColumn) {
      throw error;
    }

    const repaired = await ensureProductSchemaReady();
    if (!repaired) {
      throw error;
    }

    return prisma.product.create({
      data,
      select: productCreateSelect,
    });
  }
}
