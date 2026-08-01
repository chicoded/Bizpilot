import { prisma } from "@/lib/db";
import { checkProductColumn } from "@/lib/schema";
import type { StockAdjustmentType } from "@prisma/client";

/**
 * The controlled drugs register, assembled from records the app already keeps.
 *
 * No new table: a controlled drug is a Product whose industry attributes say
 * drugSchedule is CONTROLLED, and every movement is already a StockAdjustment
 * with a typed reason. That is the whole point of the industry packs — a
 * regulated surface built out of primitives that were there anyway.
 *
 * Pharmacists in Nigeria are required to keep a register of controlled
 * substances that shows every receipt and supply with a running balance. This
 * presents that from the existing ledger; it does not replace the legal record
 * a pharmacy is obliged to hold.
 */

export type RegisterMovement = {
  id: string;
  type: StockAdjustmentType;
  /** Signed: positive is stock in, negative is stock out. */
  quantity: number;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
  /** Balance after this movement, oldest to newest. */
  balance: number;
};

export type RegisterEntry = {
  productId: string;
  name: string;
  schedule: string;
  nafdacNumber: string | null;
  /** Stock on hand right now, per the product record. */
  onHand: number;
  movements: RegisterMovement[];
  /**
   * True when replaying the movements does not land on the recorded stock
   * level. That gap is exactly what a register is for — it means stock moved
   * without a corresponding entry.
   */
  unexplained: number;
};

export type ControlledRegister = {
  available: boolean;
  entries: RegisterEntry[];
  /** Set when the attributes column is missing on an older database. */
  reason?: string;
};

/** Movements that add stock; everything else reduces it. */
const INBOUND: StockAdjustmentType[] = ["PURCHASE", "RETURN"];

function readAttr(attributes: unknown, key: string): string | null {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }
  const value = (attributes as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export async function getControlledRegister(
  businessId: string
): Promise<ControlledRegister> {
  if (!(await checkProductColumn("attributes"))) {
    return {
      available: false,
      entries: [],
      reason:
        "This shop's database has not been updated for per-trade product fields yet.",
    };
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        attributes: { path: ["drugSchedule"], equals: "CONTROLLED" },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, quantity: true, attributes: true },
    });

    if (products.length === 0) return { available: true, entries: [] };

    const movements = await prisma.stockAdjustment.findMany({
      where: {
        businessId,
        productId: { in: products.map((product) => product.id) },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        productId: true,
        type: true,
        quantity: true,
        reason: true,
        createdBy: true,
        createdAt: true,
      },
    });

    const byProduct = new Map<string, typeof movements>();
    for (const movement of movements) {
      const list = byProduct.get(movement.productId) ?? [];
      list.push(movement);
      byProduct.set(movement.productId, list);
    }

    const entries: RegisterEntry[] = products.map((product) => {
      const rows = byProduct.get(product.id) ?? [];
      let balance = 0;

      const walked: RegisterMovement[] = rows.map((row) => {
        // StockAdjustment.quantity is stored unsigned for most types, so the
        // direction comes from the type rather than the sign.
        const magnitude = Math.abs(row.quantity);
        const signed = INBOUND.includes(row.type) ? magnitude : -magnitude;
        balance += signed;
        return {
          id: row.id,
          type: row.type,
          quantity: signed,
          reason: row.reason,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
          balance,
        };
      });

      return {
        productId: product.id,
        name: product.name,
        schedule: readAttr(product.attributes, "drugSchedule") ?? "CONTROLLED",
        nafdacNumber: readAttr(product.attributes, "nafdacNumber"),
        onHand: product.quantity,
        // Newest first for reading; the balance was walked oldest first.
        movements: walked.reverse(),
        unexplained: product.quantity - balance,
      };
    });

    return { available: true, entries };
  } catch (error) {
    console.error("getControlledRegister failed:", error);
    return {
      available: false,
      entries: [],
      reason: "Could not read the controlled register just now.",
    };
  }
}
