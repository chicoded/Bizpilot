import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

/** Date segment for receipt numbers: YYYYMMDD */
export function receiptDateKey(date: Date = new Date()): string {
  return format(date, "yyyyMMdd");
}

/** Industry-style receipt number: RCP-20250703-0001 */
export function formatReceiptNumber(dateKey: string, sequence: number): string {
  return `RCP-${dateKey}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Allocates the next receipt number for a business on the given day.
 * Must be called inside a Prisma transaction for concurrency safety.
 */
export async function allocateReceiptNumber(
  tx: TransactionClient,
  businessId: string,
  saleDate: Date = new Date()
): Promise<string> {
  const dateKey = receiptDateKey(saleDate);

  const counter = await tx.receiptCounter.upsert({
    where: {
      businessId_dateKey: { businessId, dateKey },
    },
    create: {
      businessId,
      dateKey,
      sequence: 1,
    },
    update: {
      sequence: { increment: 1 },
    },
    select: { sequence: true },
  });

  return formatReceiptNumber(dateKey, counter.sequence);
}

/** Fallback for legacy rows before receipt numbers existed */
export function displayReceiptNumber(sale: {
  id: string;
  receiptNumber?: string | null;
}): string {
  if (sale.receiptNumber) return sale.receiptNumber;
  return `RCP-LEGACY-${sale.id.slice(-8).toUpperCase()}`;
}
