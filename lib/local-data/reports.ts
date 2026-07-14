import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
} from "date-fns";
import { listLocalExpenses } from "@/lib/local-data/expenses";
import { listLocalProducts } from "@/lib/local-data/products";
import { listLocalSales } from "@/lib/local-data/sales";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/types";
import type {
  DailyDataPoint,
  ExpenseBreakdown,
  FullReport,
  InventoryValuationItem,
  ReportPeriod,
  ReportSummary,
  TopProduct,
} from "@/types";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
};

function periodRange(period: ReportPeriod) {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: subDays(now, 6), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export type LocalPaymentMixRow = {
  method: string;
  label: string;
  count: number;
  revenue: number;
  percentage: number;
};

export type LocalDayCloseReport = FullReport & {
  paymentMix: LocalPaymentMixRow[];
  creditRevenue: number;
  creditSalesCount: number;
};

export async function getLocalFullReport(
  businessId: string,
  period: ReportPeriod = "today"
): Promise<LocalDayCloseReport> {
  const { start, end } = periodRange(period);
  const [allSales, allExpenses, products] = await Promise.all([
    listLocalSales(businessId),
    listLocalExpenses(businessId),
    listLocalProducts(businessId),
  ]);

  const sales = allSales.filter((sale) =>
    inRange(new Date(sale.createdAt), start, end)
  );
  const expenses = allExpenses.filter((expense) =>
    inRange(new Date(expense.date), start, end)
  );

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const profit = sales.reduce((sum, s) => sum + s.profit, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const salesCount = sales.length;

  const inventoryValuation: InventoryValuationItem[] = products.map((p) => ({
    name: p.name,
    category: p.category ?? undefined,
    quantity: p.quantity,
    costValue: p.quantity * p.purchasePrice,
    retailValue: p.quantity * p.sellingPrice,
  }));

  const inventoryCostValue = inventoryValuation.reduce(
    (sum, item) => sum + item.costValue,
    0
  );
  const inventoryRetailValue = inventoryValuation.reduce(
    (sum, item) => sum + item.retailValue,
    0
  );

  const summary: ReportSummary = {
    revenue,
    profit,
    expenses: expenseTotal,
    netProfit: profit - expenseTotal,
    salesCount,
    avgSaleValue: salesCount > 0 ? revenue / salesCount : 0,
    inventoryCostValue,
    inventoryRetailValue,
  };

  const days = eachDayOfInterval({
    start: startOfDay(start),
    end: startOfDay(end),
  });

  const dailyTrend: DailyDataPoint[] = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const daySales = sales.filter((sale) =>
      inRange(new Date(sale.createdAt), dayStart, dayEnd)
    );
    const dayExpenses = expenses.filter((expense) =>
      inRange(new Date(expense.date), dayStart, dayEnd)
    );
    return {
      date: format(day, "yyyy-MM-dd"),
      label: format(day, period === "year" ? "MMM" : "EEE d"),
      revenue: daySales.reduce((sum, s) => sum + s.total, 0),
      profit: daySales.reduce((sum, s) => sum + s.profit, 0),
      expenses: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  });

  const expenseMap = new Map<string, number>();
  for (const expense of expenses) {
    expenseMap.set(
      expense.category,
      (expenseMap.get(expense.category) ?? 0) + expense.amount
    );
  }
  const expenseLabel = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
  );
  const expenseBreakdown: ExpenseBreakdown[] = Array.from(expenseMap.entries())
    .map(([category, amount]) => ({
      category,
      label: expenseLabel[category] ?? category,
      amount,
      percentage: expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const productMap = new Map<string, TopProduct>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = productMap.get(item.productName) ?? {
        name: item.productName,
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += item.quantity;
      existing.revenue += item.total;
      productMap.set(item.productName, existing);
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const paymentTotals = new Map<string, { count: number; revenue: number }>();
  for (const sale of sales) {
    const key = sale.paymentMethod || "CASH";
    const existing = paymentTotals.get(key) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += sale.total;
    paymentTotals.set(key, existing);
  }
  const paymentLabel = Object.fromEntries(
    PAYMENT_METHODS.map((m) => [m.value, m.label])
  );
  const paymentMix: LocalPaymentMixRow[] = Array.from(paymentTotals.entries())
    .map(([method, data]) => ({
      method,
      label: paymentLabel[method] ?? method,
      count: data.count,
      revenue: data.revenue,
      percentage: revenue > 0 ? (data.revenue / revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const creditSales = sales.filter((s) => s.isCredit || s.paymentMethod === "CREDIT");

  return {
    period,
    periodLabel: PERIOD_LABELS[period],
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    summary,
    dailyTrend,
    expenseBreakdown,
    topProducts,
    inventoryValuation: inventoryValuation
      .sort((a, b) => b.retailValue - a.retailValue)
      .slice(0, 20),
    inventoryTotals: {
      cost: inventoryCostValue,
      retail: inventoryRetailValue,
      productCount: products.length,
    },
    paymentMix,
    creditRevenue: creditSales.reduce((sum, s) => sum + s.total, 0),
    creditSalesCount: creditSales.length,
  };
}
