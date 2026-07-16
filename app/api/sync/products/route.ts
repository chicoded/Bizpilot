import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { prisma } from "@/lib/db";
import { ensureProductSchemaReady } from "@/lib/schema";
import { normalizeProductType } from "@/lib/product-types";

export const dynamic = "force-dynamic";

type IncomingProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  productType?: string | null;
  description?: string | null;
  unit?: string | null;
  prepTimeMinutes?: number | null;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  tracksStock?: boolean;
  recipeLines?: { componentId: string; quantity: number }[];
  purchasePrice?: number;
  sellingPrice: number;
  unitsPerPack?: number;
  quantity: number;
  reorderLevel?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  updatedAt?: string;
};

async function replaceRecipeLines(
  parentProductId: string,
  lines: { componentId: string; quantity: number }[] | undefined
) {
  if (!lines) return;
  try {
    await prisma.recipeLine.deleteMany({ where: { parentProductId } });
    const valid = lines.filter(
      (l) => l.componentId && Number(l.quantity) > 0 && l.componentId !== parentProductId
    );
    if (valid.length === 0) return;
    await prisma.recipeLine.createMany({
      data: valid.map((l) => ({
        parentProductId,
        componentId: l.componentId,
        quantity: new Prisma.Decimal(Number(l.quantity)),
      })),
    });
  } catch {
    // recipe_lines table may not exist yet
  }
}

/**
 * Upsert local device products into the shared team database.
 * Uses the same product id so sales sync and other devices can share stock.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireBusinessDataAccess(["inventory", "sales"]);
    await ensureProductSchemaReady();

    const body = (await request.json()) as { products?: IncomingProduct[] };
    const products = Array.isArray(body.products) ? body.products : [];
    if (products.length === 0) {
      return NextResponse.json({ ok: true, upserted: 0, ids: [] });
    }

    const upserted: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const product of products.slice(0, 200)) {
      if (!product?.id || !product.name?.trim()) {
        errors.push({ id: product?.id ?? "unknown", error: "Invalid product" });
        continue;
      }

      const productType = normalizeProductType(product.productType);
      const baseData = {
        name: product.name.trim(),
        sku: product.sku?.trim() || null,
        barcode: product.barcode?.trim() || null,
        category: product.category?.trim() || null,
        purchasePrice: new Prisma.Decimal(Number(product.purchasePrice ?? 0)),
        sellingPrice: new Prisma.Decimal(Number(product.sellingPrice ?? 0)),
        unitsPerPack: Math.max(1, Number(product.unitsPerPack ?? 1)),
        quantity: Math.max(0, Math.floor(Number(product.quantity ?? 0))),
        reorderLevel: Math.max(0, Math.floor(Number(product.reorderLevel ?? 5))),
        batchNumber: product.batchNumber?.trim() || null,
        expiryDate: product.expiryDate ? new Date(product.expiryDate) : null,
        imageUrl: product.imageUrl ?? null,
        isActive: product.isActive !== false,
      };

      const hybridData = {
        ...baseData,
        productType: productType as
          | "MENU_ITEM"
          | "READY_MADE"
          | "INGREDIENT"
          | "PACKAGING"
          | "SERVICE",
        description: product.description?.trim() || null,
        unit: product.unit?.trim() || null,
        prepTimeMinutes:
          product.prepTimeMinutes != null
            ? Math.max(0, Math.floor(Number(product.prepTimeMinutes)))
            : null,
        isPopular: Boolean(product.isPopular),
        isChefSpecial: Boolean(product.isChefSpecial),
        tracksStock:
          product.tracksStock != null
            ? Boolean(product.tracksStock)
            : productType !== "MENU_ITEM",
      };

      try {
        const existing = await prisma.product.findFirst({
          where: { id: product.id, businessId: ctx.businessId },
          select: { id: true, updatedAt: true },
        });

        const write = async (data: typeof hybridData | typeof baseData) => {
          if (existing) {
            const incomingUpdated = product.updatedAt
              ? new Date(product.updatedAt).getTime()
              : Date.now();
            if (
              !product.updatedAt ||
              incomingUpdated >= existing.updatedAt.getTime() - 1000
            ) {
              await prisma.product.update({
                where: { id: product.id },
                data,
              });
            }
          } else {
            await prisma.product.create({
              data: {
                id: product.id,
                businessId: ctx.businessId,
                ...data,
              },
            });
          }
        };

        try {
          await write(hybridData);
        } catch (hybridError) {
          const detail =
            hybridError instanceof Error ? hybridError.message : String(hybridError);
          if (!/productType|recipe|column|P2022|does not exist/i.test(detail)) {
            throw hybridError;
          }
          await write(baseData);
        }

        await replaceRecipeLines(product.id, product.recipeLines);
        upserted.push(product.id);
      } catch (error) {
        const isUnique =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (isUnique) {
          try {
            await prisma.product.create({
              data: {
                id: product.id,
                businessId: ctx.businessId,
                ...baseData,
                sku: null,
              },
            });
            upserted.push(product.id);
            continue;
          } catch (retryError) {
            errors.push({
              id: product.id,
              error:
                retryError instanceof Error
                  ? retryError.message
                  : "Could not create product",
            });
            continue;
          }
        }
        errors.push({
          id: product.id,
          error: error instanceof Error ? error.message : "Upsert failed",
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      upserted: upserted.length,
      ids: upserted,
      errors,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/sync/products]", error);
    return NextResponse.json(
      { error: "Could not sync products" },
      { status: 500 }
    );
  }
}
