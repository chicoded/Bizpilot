import { NextResponse } from "next/server";
import { requireBusinessDataAccess } from "@/lib/api-access";
import { prisma } from "@/lib/db";
import { allocateReceiptNumber } from "@/lib/receipt-number";
import { saleSchema } from "@/lib/validations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const syncSaleSchema = saleSchema.and(
  z.object({
    clientSaleId: z.string().min(8).max(80),
    createdAt: z.string().datetime().optional(),
    deviceId: z.string().min(4).max(80).optional(),
    customer: z
      .object({
        name: z.string().min(1).max(120),
        phone: z.string().max(40).optional().nullable(),
        email: z
          .string()
          .max(120)
          .optional()
          .nullable()
          .transform((v) => (v && v.trim() ? v.trim() : null)),
      })
      .optional()
      .nullable(),
  })
);

export async function POST(request: Request) {
  try {
    const ctx = await requireBusinessDataAccess(["sales"]);
    const body = await request.json();
    const parsed = syncSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten().fieldErrors.customerId?.[0] ??
            parsed.error.flatten().fieldErrors.clientSaleId?.[0] ??
            "Invalid sale sync payload",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Ensure clientSaleId column exists (preview/prod schema drift).
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "clientSaleId" TEXT`
      );
    } catch {
      // Column may already exist or DB user lacks ALTER — continue.
    }

    const existing = await prisma.sale.findFirst({
      where: {
        businessId: ctx.businessId,
        clientSaleId: data.clientSaleId,
      },
      select: {
        id: true,
        receiptNumber: true,
        total: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadySynced: true,
        saleId: existing.id,
        receiptNumber: existing.receiptNumber,
      });
    }

    let customerId = data.customerId;

    // Local-only customer ids won't exist on the server — create/find by phone.
    if (customerId) {
      const found = await prisma.customer.findFirst({
        where: { id: customerId, businessId: ctx.businessId },
        select: { id: true },
      });
      if (!found) {
        customerId = undefined;
      }
    }

    if (!customerId && data.customer?.name) {
      const phone = data.customer.phone?.trim() || null;
      if (phone) {
        const byPhone = await prisma.customer.findFirst({
          where: { businessId: ctx.businessId, phone },
          select: { id: true },
        });
        if (byPhone) customerId = byPhone.id;
      }

      if (!customerId) {
        const created = await prisma.customer.create({
          data: {
            businessId: ctx.businessId,
            name: data.customer.name.trim(),
            phone,
            email: data.customer.email?.trim() || null,
          },
        });
        customerId = created.id;
      }
    }

    if (data.paymentMethod === "CREDIT" && !customerId) {
      return NextResponse.json(
        { error: "Credit sale needs a customer on the shared shop database." },
        { status: 409 }
      );
    }

    try {
      const sale = await prisma.$transaction(async (tx) => {
        const productIds = data.items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: {
            id: { in: productIds },
            businessId: ctx.businessId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            quantity: true,
            sellingPrice: true,
            purchasePrice: true,
          },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));
        const missing = productIds.filter((id) => !productMap.has(id));
        if (missing.length > 0) {
          throw Object.assign(
            new Error(
              "Some products are only on this device. Add/sync products online first."
            ),
            { code: "MISSING_PRODUCTS", missing }
          );
        }

        let subtotal = 0;
        let totalCost = 0;
        const saleItems: {
          productId: string;
          quantity: number;
          cost: number;
          sellingPrice: number;
          total: number;
        }[] = [];

        for (const item of data.items) {
          const product = productMap.get(item.productId)!;
          const sellingPrice = Number(product.sellingPrice);
          const cost = Number(product.purchasePrice);
          const lineTotal = sellingPrice * item.quantity;
          subtotal += lineTotal;
          totalCost += cost * item.quantity;

          const stockUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              businessId: ctx.businessId,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });

          if (stockUpdate.count === 0) {
            throw Object.assign(
              new Error(
                `Stock conflict for ${product.name}. Cloud has ${product.quantity} left.`
              ),
              {
                code: "STOCK_CONFLICT",
                productId: product.id,
                available: product.quantity,
              }
            );
          }

          saleItems.push({
            productId: item.productId,
            quantity: item.quantity,
            cost,
            sellingPrice,
            total: lineTotal,
          });
        }

        const discount = data.discount ?? 0;
        const tax = data.tax ?? 0;
        const total = subtotal - discount + tax;
        const profit = total - totalCost - discount;
        const saleCreatedAt = data.createdAt
          ? new Date(data.createdAt)
          : new Date();
        const receiptNumber = await allocateReceiptNumber(
          tx,
          ctx.businessId,
          saleCreatedAt
        );

        const noteParts = [
          `offline-sync`,
          data.deviceId ? `device:${data.deviceId}` : null,
          `client:${data.clientSaleId}`,
        ].filter(Boolean);

        const newSale = await tx.sale.create({
          data: {
            businessId: ctx.businessId,
            customerId: customerId || null,
            clientSaleId: data.clientSaleId,
            receiptNumber,
            paymentMethod: data.paymentMethod,
            subtotal,
            discount,
            tax,
            total,
            profit,
            isCredit: data.paymentMethod === "CREDIT",
            notes: noteParts.join(" | "),
            createdBy: ctx.userId,
            createdAt: saleCreatedAt,
            items: { create: saleItems },
          },
          select: {
            id: true,
            receiptNumber: true,
            total: true,
          },
        });

        for (const item of data.items) {
          await tx.stockAdjustment.create({
            data: {
              productId: item.productId,
              businessId: ctx.businessId,
              type: "SALE",
              quantity: -item.quantity,
              createdBy: ctx.userId,
            },
          });
        }

        if (customerId) {
          if (data.paymentMethod === "CREDIT") {
            await tx.customer.updateMany({
              where: { id: customerId, businessId: ctx.businessId },
              data: {
                debt: { increment: total },
                lastPurchase: saleCreatedAt,
                lifetimeValue: { increment: total },
              },
            });
          } else {
            await tx.customer.updateMany({
              where: { id: customerId, businessId: ctx.businessId },
              data: {
                lastPurchase: saleCreatedAt,
                lifetimeValue: { increment: total },
              },
            });
          }
        }

        return newSale;
      });

      return NextResponse.json({
        ok: true,
        alreadySynced: false,
        saleId: sale.id,
        receiptNumber: sale.receiptNumber,
      });
    } catch (error) {
      const err = error as Error & {
        code?: string;
        missing?: string[];
        available?: number;
        productId?: string;
      };

      if (err.code === "STOCK_CONFLICT") {
        return NextResponse.json(
          {
            error: err.message,
            code: "STOCK_CONFLICT",
            productId: err.productId,
            available: err.available,
          },
          { status: 409 }
        );
      }

      if (err.code === "MISSING_PRODUCTS") {
        return NextResponse.json(
          {
            error: err.message,
            code: "MISSING_PRODUCTS",
            missing: err.missing,
          },
          { status: 409 }
        );
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message.includes("do not have access")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("[api/sync/sales]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not sync sale",
      },
      { status: 500 }
    );
  }
}
