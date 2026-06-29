import { prisma } from "@/lib/db";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  subMonths,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";
import type {
  ReportPeriod,
  FullReport,
  ReportSummary,
  DailyDataPoint,
  ExpenseBreakdown,
  TopProduct,
  InventoryValuationItem,
} from "@/types";
import { EXPENSE_CATEGORIES } from "@/types";

const expenseLabelMap = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);

function getDateRange(period: ReportPeriod): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (period) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: format(now, "EEEE, MMM d yyyy"),
      };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: `This week (${format(startOfWeek(now, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(now, { weekStartsOn: 1 }), "MMM d")})`,
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: format(now, "MMMM yyyy"),
      };
    case "quarter": {
      const start = startOfQuarter(now);
      const end = endOfQuarter(now);
      return {
        start,
        end,
        label: `${format(start, "MMM")} – ${format(end, "MMM yyyy")}`,
      };
    };
    case "year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: format(now, "yyyy"),
      };
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: format(now, "MMMM yyyy"),
      };
  }
}

export async function getSalesTrend(
  businessId: string,
  start: Date,
  end: Date
): Promise<DailyDataPoint[]> {
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true, total: true, profit: true },
    }),
    prisma.expense.findMany({
      where: { businessId, date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    }),
  ]);

  const days = eachDayOfInterval({ start, end });
  const salesByDay = new Map<string, { revenue: number; profit: number }>();
  const expensesByDay = new Map<string, number>();

  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    salesByDay.set(key, { revenue: 0, profit: 0 });
    expensesByDay.set(key, 0);
  }

  for (const sale of sales) {
    const key = format(sale.createdAt, "yyyy-MM-dd");
    const existing = salesByDay.get(key) ?? { revenue: 0, profit: 0 };
    salesByDay.set(key, {
      revenue: existing.revenue + Number(sale.total),
      profit: existing.profit + Number(sale.profit),
    });
  }

  for (const expense of expenses) {
    const key = format(expense.date, "yyyy-MM-dd");
    expensesByDay.set(key, (expensesByDay.get(key) ?? 0) + Number(expense.amount));
  }

  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const salesData = salesByDay.get(key) ?? { revenue: 0, profit: 0 };
    return {
      date: key,
      label: format(day, "EEE"),
      revenue: salesData.revenue,
      profit: salesData.profit,
      expenses: expensesByDay.get(key) ?? 0,
    };
  });
}

export async function getReportSummary(
  businessId: string,
  start: Date,
  end: Date
): Promise<ReportSummary> {
  const [salesAgg, expenseAgg, salesCount, products] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: start, lte: end } },
      _sum: { total: true, profit: true },
    }),
    prisma.expense.aggregate({
      where: { businessId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.sale.count({
      where: { businessId, createdAt: { gte: start, lte: end } },
    }),
    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: { quantity: true, purchasePrice: true, sellingPrice: true },
    }),
  ]);

  const revenue = Number(salesAgg._sum.total ?? 0);
  const profit = Number(salesAgg._sum.profit ?? 0);
  const expenses = Number(expenseAgg._sum.amount ?? 0);

  let inventoryCost = 0;
  let inventoryRetail = 0;
  for (const p of products) {
    inventoryCost += Number(p.purchasePrice) * p.quantity;
    inventoryRetail += Number(p.sellingPrice) * p.quantity;
  }

  return {
    revenue,
    profit,
    expenses,
    netProfit: profit - expenses,
    salesCount,
    avgSaleValue: salesCount > 0 ? revenue / salesCount : 0,
    inventoryCostValue: inventoryCost,
    inventoryRetailValue: inventoryRetail,
  };
}

export async function getExpenseBreakdown(
  businessId: string,
  start: Date,
  end: Date
): Promise<ExpenseBreakdown[]> {
  const grouped = await prisma.expense.groupBy({
    by: ["category"],
    where: { businessId, date: { gte: start, lte: end } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const total = grouped.reduce((sum, g) => sum + Number(g._sum.amount ?? 0), 0);

  return grouped.map((g) => {
    const amount = Number(g._sum.amount ?? 0);
    return {
      category: g.category,
      label: expenseLabelMap[g.category] ?? g.category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    };
  });
}

export async function getTopProducts(
  businessId: string,
  start: Date,
  end: Date,
  limit = 10
): Promise<TopProduct[]> {
  const items = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: { businessId, createdAt: { gte: start, lte: end } } },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  if (items.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  return items.map((item) => ({
    name: nameMap[item.productId] ?? "Unknown",
    quantitySold: item._sum.quantity ?? 0,
    revenue: Number(item._sum.total ?? 0),
  }));
}

export async function getInventoryValuation(
  businessId: string
): Promise<{ items: InventoryValuationItem[]; totals: { cost: number; retail: number; count: number } }> {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      name: true,
      category: true,
      quantity: true,
      purchasePrice: true,
      sellingPrice: true,
    },
  });

  let cost = 0;
  let retail = 0;
  const items: InventoryValuationItem[] = products.map((p) => {
    const costValue = Number(p.purchasePrice) * p.quantity;
    const retailValue = Number(p.sellingPrice) * p.quantity;
    cost += costValue;
    retail += retailValue;
    return {
      name: p.name,
      category: p.category ?? undefined,
      quantity: p.quantity,
      costValue,
      retailValue,
    };
  });

  return {
    items,
    totals: { cost, retail, count: products.length },
  };
}

export async function getFullReport(
  businessId: string,
  period: ReportPeriod = "month"
): Promise<FullReport> {
  const { start, end, label } = getDateRange(period);

  const [summary, dailyTrend, expenseBreakdown, topProducts, inventory] =
    await Promise.all([
      getReportSummary(businessId, start, end),
      getSalesTrend(businessId, start, end),
      getExpenseBreakdown(businessId, start, end),
      getTopProducts(businessId, start, end),
      getInventoryValuation(businessId),
    ]);

  return {
    period,
    periodLabel: label,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    summary,
    dailyTrend,
    expenseBreakdown,
    topProducts,
    inventoryValuation: inventory.items,
    inventoryTotals: {
      cost: inventory.totals.cost,
      retail: inventory.totals.retail,
      productCount: inventory.totals.count,
    },
  };
}

/** Weekly comparison: this week vs last week */
export async function getWeeklyComparison(businessId: string) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subDays(thisWeekStart, 7);
  const lastWeekEnd = endOfDay(subDays(thisWeekStart, 1));

  const [thisWeek, lastWeek] = await Promise.all([
    getReportSummary(businessId, thisWeekStart, endOfDay(now)),
    getReportSummary(businessId, lastWeekStart, lastWeekEnd),
  ]);

  const revenueChange =
    lastWeek.revenue > 0
      ? Math.round(((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100)
      : thisWeek.revenue > 0
        ? 100
        : 0;

  const profitChange =
    lastWeek.profit > 0
      ? Math.round(((thisWeek.profit - lastWeek.profit) / lastWeek.profit) * 100)
      : thisWeek.profit > 0
        ? 100
        : 0;

  return { thisWeek, lastWeek, revenueChange, profitChange };
}

/** Monthly trend for last 6 months */
export async function getMonthlyTrend(businessId: string) {
  const months: { label: string; revenue: number; profit: number; expenses: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const summary = await getReportSummary(businessId, start, end);
    months.push({
      label: format(date, "MMM"),
      revenue: summary.revenue,
      profit: summary.profit,
      expenses: summary.expenses,
    });
  }

  return months;
}

export { getDateRange };
