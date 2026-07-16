import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { prisma } from "@/lib/db";
import { ensureProductSchemaReady } from "@/lib/schema";

export const dynamic = "force-dynamic";

type IncomingProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
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

      const data = {
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

      try {
        const existing = await prisma.product.findFirst({
          where: { id: product.id, businessId: ctx.businessId },
          select: { id: true, updatedAt: true },
        });

        if (existing) {
          const incomingUpdated = product.updatedAt
            ? new Date(product.updatedAt).getTime()
            : Date.now();
          // Prefer newer client write; always accept push for team share.
          if (
            !product.updatedAt ||
            incomingUpdated >= existing.updatedAt.getTime() - 1000
          ) {
            await prisma.product.update({
              where: { id: product.id },
              data,
            });
          }
          upserted.push(product.id);
          continue;
        }

        await prisma.product.create({
          data: {
            id: product.id,
            businessId: ctx.businessId,
            ...data,
          },
        });
        upserted.push(product.id);
      } catch (error) {
        // Duplicate SKU within business — clear sku and retry once.
        const isUnique =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (isUnique) {
          try {
            await prisma.product.create({
              data: {
                id: product.id,
                businessId: ctx.businessId,
                ...data,
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
