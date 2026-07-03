import { prisma } from "@/lib/db";
import type { PaymentMethod } from "@prisma/client";
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subDays } from "date-fns";

export type SalePeriod = "today" | "week" | "month" | "all";

export type SaleListItem = {
  id: string;
  receiptNumber: string;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  createdAt: Date;
  itemCount: number;
  customerName: string | null;
};

export type SaleReceipt = {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  createdAt: Date;
  customer: { name: string; phone: string | null } | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    sellingPrice: number;
    total: number;
  }[];
};

function periodDateFilter(period: SalePeriod) {
  const now = new Date();
  if (period === "today") {
    return { gte: startOfDay(now), lte: endOfDay(now) };
  }
  if (period === "week") {
    return { gte: subDays(now, 7) };
  }
  if (period === "month") {
    return { gte: startOfMonth(now), lte: endOfMonth(now) };
  }
  return undefined;
}

export async function listSales(businessId: string, period: SalePeriod = "month") {
  const dateFilter = periodDateFilter(period);

  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      receiptNumber: true,
      total: true,
      profit: true,
      paymentMethod: true,
      isCredit: true,
      createdAt: true,
      customer: { select: { name: true } },
      _count: { select: { items: true } },
    },
    take: period === "all" ? 200 : 100,
  });

  const items: SaleListItem[] = sales.map((sale) => ({
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    total: Number(sale.total),
    profit: Number(sale.profit),
    paymentMethod: sale.paymentMethod,
    isCredit: sale.isCredit,
    createdAt: sale.createdAt,
    itemCount: sale._count.items,
    customerName: sale.customer?.name ?? null,
  }));

  const totalRevenue = items.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = items.reduce((sum, sale) => sum + sale.profit, 0);

  return { sales: items, totalRevenue, totalProfit, count: items.length };
}

export async function getSaleReceipt(
  businessId: string,
  saleId: string
): Promise<SaleReceipt | null> {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, businessId },
    select: {
      id: true,
      receiptNumber: true,
      subtotal: true,
      discount: true,
      tax: true,
      total: true,
      profit: true,
      paymentMethod: true,
      isCredit: true,
      createdAt: true,
      customer: { select: { name: true, phone: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          sellingPrice: true,
          total: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  if (!sale) return null;

  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    profit: Number(sale.profit),
    paymentMethod: sale.paymentMethod,
    isCredit: sale.isCredit,
    createdAt: sale.createdAt,
    customer: sale.customer,
    items: sale.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      sellingPrice: Number(item.sellingPrice),
      total: Number(item.total),
    })),
  };
}
