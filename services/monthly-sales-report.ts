import { prisma } from "@/lib/db";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfWeek,
  isBefore,
  isAfter,
  max as maxDate,
  min as minDate,
} from "date-fns";
import {
  getReportSummary,
  getSalesTrend,
  getExpenseBreakdown,
} from "@/services/reports";
import { PAYMENT_METHODS } from "@/types";
import type {
  MonthlySalesReport,
  MonthlySalesProductRow,
  MonthlyPaymentMixRow,
  MonthlyWeeklyRow,
} from "@/types";
import { parseMonthKey } from "@/lib/monthly-report-months";

export { parseMonthKey } from "@/lib/monthly-report-months";

const paymentLabelMap = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

export function getMonthDateRange(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
    label: format(date, "MMMM yyyy"),
    monthKey: format(date, "yyyy-MM"),
  };
}

function pctChange(current: number, previous: number): number {
  if (previous > 0) {
    return Math.round(((current - previous) / previous) * 100);
  }
  return current > 0 ? 100 : 0;
}

async function getTopProductsWithProfit(
  businessId: string,
  start: Date,
  end: Date,
  limit = 10
): Promise<MonthlySalesProductRow[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      sale: { businessId, createdAt: { gte: start, lte: end } },
    },
    select: {
      productId: true,
      quantity: true,
      total: true,
      cost: true,
      product: { select: { name: true, category: true } },
    },
  });

  const byProduct = new Map<
    string,
    { name: string; category?: string; qty: number; revenue: number; profit: number }
  >();

  for (const item of items) {
    const revenue = Number(item.total);
    const profit = revenue - Number(item.cost) * item.quantity;
    const existing = byProduct.get(item.productId) ?? {
      name: item.product.name,
      category: item.product.category ?? undefined,
      qty: 0,
      revenue: 0,
      profit: 0,
    };
    byProduct.set(item.productId, {
      name: existing.name,
      category: existing.category,
      qty: existing.qty + item.quantity,
      revenue: existing.revenue + revenue,
      profit: existing.profit + profit,
    });
  }

  return [...byProduct.values()]
    .map((p) => ({
      name: p.name,
      category: p.category,
      quantitySold: p.qty,
      revenue: p.revenue,
      profit: p.profit,
      marginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

async function getPaymentMix(
  businessId: string,
  start: Date,
  end: Date,
  totalRevenue: number
): Promise<MonthlyPaymentMixRow[]> {
  const grouped = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { businessId, createdAt: { gte: start, lte: end } },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
  });

  return grouped.map((row) => {
    const revenue = Number(row._sum.total ?? 0);
    return {
      method: row.paymentMethod,
      label: paymentLabelMap[row.paymentMethod] ?? row.paymentMethod,
      count: row._count,
      revenue,
      percentage:
        totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    };
  });
}

async function getWeeklyBreakdown(
  businessId: string,
  start: Date,
  end: Date
): Promise<MonthlyWeeklyRow[]> {
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

  const weekStarts = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  const rows: MonthlyWeeklyRow[] = [];

  for (let i = 0; i < weekStarts.length; i++) {
    const rangeStart = maxDate([weekStarts[i], start]);
    const rangeEnd =
      i < weekStarts.length - 1
        ? minDate([endOfWeek(weekStarts[i], { weekStartsOn: 1 }), end])
        : end;

    let revenue = 0;
    let profit = 0;
    let salesCount = 0;
    let weekExpenses = 0;

    for (const sale of sales) {
      if (
        !isBefore(sale.createdAt, rangeStart) &&
        !isAfter(sale.createdAt, rangeEnd)
      ) {
        revenue += Number(sale.total);
        profit += Number(sale.profit);
        salesCount += 1;
      }
    }

    for (const expense of expenses) {
      if (
        !isBefore(expense.date, rangeStart) &&
        !isAfter(expense.date, rangeEnd)
      ) {
        weekExpenses += Number(expense.amount);
      }
    }

    rows.push({
      label: `Week ${i + 1} (${format(rangeStart, "MMM d")}–${format(rangeEnd, "MMM d")})`,
      revenue,
      profit,
      salesCount,
      expenses: weekExpenses,
    });
  }

  return rows;
}

function buildInsights(report: Omit<MonthlySalesReport, "insights">): string[] {
  const insights: string[] = [];
  const { summary, comparison, metrics, paymentMix, creditSummary, peakDay } =
    report;

  if (summary.salesCount === 0) {
    insights.push(
      "No sales were recorded this month. Focus on promotions, restocking bestsellers, and following up with existing customers."
    );
    return insights;
  }

  if (comparison.revenueChangePct >= 15) {
    insights.push(
      `Revenue grew ${comparison.revenueChangePct}% vs ${comparison.previousLabel} — strong month-on-month momentum.`
    );
  } else if (comparison.revenueChangePct <= -15) {
    insights.push(
      `Revenue declined ${Math.abs(comparison.revenueChangePct)}% vs ${comparison.previousLabel}. Review pricing, stock availability, and marketing activity.`
    );
  } else if (comparison.revenueChangePct > 0) {
    insights.push(
      `Revenue is up ${comparison.revenueChangePct}% compared to ${comparison.previousLabel}.`
    );
  }

  if (metrics.profitMarginPct < 15 && summary.revenue > 0) {
    insights.push(
      `Gross profit margin is ${metrics.profitMarginPct}% — consider renegotiating supplier costs or adjusting prices on low-margin items.`
    );
  } else if (metrics.profitMarginPct >= 30) {
    insights.push(
      `Healthy gross margin at ${metrics.profitMarginPct}% — maintain pricing discipline on top sellers.`
    );
  }

  if (metrics.netMarginPct < 0) {
    insights.push(
      "Net profit is negative after expenses. Prioritize cost control and high-margin products."
    );
  }

  const sellThrough =
    metrics.totalDaysInPeriod > 0
      ? Math.round(
          (metrics.activeSellingDays / metrics.totalDaysInPeriod) * 100
        )
      : 0;
  if (sellThrough < 50 && metrics.totalDaysInPeriod >= 20) {
    insights.push(
      `Sales occurred on only ${metrics.activeSellingDays} of ${metrics.totalDaysInPeriod} days (${sellThrough}% active). Consistent daily selling improves cashflow predictability.`
    );
  }

  if (peakDay) {
    insights.push(
      `Peak sales day: ${peakDay.label} (${formatCurrencyInline(peakDay.revenue)} revenue). Plan staffing and stock for similar high-traffic periods.`
    );
  }

  const topPayment = paymentMix[0];
  if (topPayment && topPayment.percentage >= 60) {
    insights.push(
      `${topPayment.label} accounts for ${topPayment.percentage}% of revenue — ensure reconciliation processes match your dominant payment channel.`
    );
  }

  if (creditSummary.creditRevenuePct >= 25) {
    insights.push(
      `Credit sales represent ${creditSummary.creditRevenuePct}% of revenue (${creditSummary.creditSalesCount} transactions). Monitor debtor follow-up to protect cashflow.`
    );
  }

  const topProduct = report.topProductsByRevenue[0];
  if (topProduct) {
    insights.push(
      `Top product: ${topProduct.name} (${formatCurrencyInline(topProduct.revenue)} revenue, ${topProduct.marginPct}% margin). Ensure adequate stock levels.`
    );
  }

  if (insights.length === 0) {
    insights.push(
      "Sales performance is stable. Continue tracking daily revenue and top products to spot trends early."
    );
  }

  return insights.slice(0, 7);
}

function formatCurrencyInline(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export async function getMonthlySalesReport(
  businessId: string,
  monthKey?: string
): Promise<MonthlySalesReport> {
  const parsed = monthKey ? parseMonthKey(monthKey) : null;
  const now = new Date();
  const year = parsed?.year ?? now.getFullYear();
  const month = parsed?.month ?? now.getMonth() + 1;

  const { start, end, label, monthKey: resolvedKey } = getMonthDateRange(
    year,
    month
  );

  const prevMonthDate = subMonths(start, 1);
  const prevStart = startOfMonth(prevMonthDate);
  const prevEnd = endOfMonth(prevMonthDate);
  const previousLabel = format(prevMonthDate, "MMMM yyyy");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, currency: true },
  });
  if (!business) throw new Error("Business not found");

  const [
    summary,
    previous,
    dailyTrend,
    expenseBreakdown,
    topProductsByRevenue,
    weeklyBreakdown,
    creditAgg,
  ] = await Promise.all([
    getReportSummary(businessId, start, end),
    getReportSummary(businessId, prevStart, prevEnd),
    getSalesTrend(businessId, start, end),
    getExpenseBreakdown(businessId, start, end),
    getTopProductsWithProfit(businessId, start, end, 10),
    getWeeklyBreakdown(businessId, start, end),
    prisma.sale.aggregate({
      where: {
        businessId,
        createdAt: { gte: start, lte: end },
        isCredit: true,
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const paymentMix = await getPaymentMix(
    businessId,
    start,
    end,
    summary.revenue
  );

  const topProductsByQuantity = [...topProductsByRevenue].sort(
    (a, b) => b.quantitySold - a.quantitySold
  );

  const totalDaysInPeriod = eachDayOfInterval({ start, end }).length;
  const activeSellingDays = dailyTrend.filter((d) => d.revenue > 0).length;
  const peakDayRow = dailyTrend.reduce<(typeof dailyTrend)[0] | null>(
    (best, day) =>
      !best || day.revenue > best.revenue ? day : best,
    null
  );

  const monthlyTrend: MonthlySalesReport["monthlyTrend"] = [];
  for (let i = 5; i >= 0; i--) {
    const trendDate = subMonths(start, i);
    const tStart = startOfMonth(trendDate);
    const tEnd = endOfMonth(trendDate);
    const tSummary = await getReportSummary(businessId, tStart, tEnd);
    monthlyTrend.push({
      label: format(trendDate, "MMM yyyy"),
      revenue: tSummary.revenue,
      profit: tSummary.profit,
      expenses: tSummary.expenses,
    });
  }

  const profitMarginPct =
    summary.revenue > 0
      ? Math.round((summary.profit / summary.revenue) * 100)
      : 0;
  const netMarginPct =
    summary.revenue > 0
      ? Math.round((summary.netProfit / summary.revenue) * 100)
      : 0;

  const creditRevenue = Number(creditAgg._sum.total ?? 0);
  const creditSalesCount = creditAgg._count;

  const partial: Omit<MonthlySalesReport, "insights"> = {
    businessName: business.name,
    currency: business.currency,
    periodLabel: label,
    monthKey: resolvedKey,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    summary,
    comparison: {
      previousLabel,
      previous,
      revenueChangePct: pctChange(summary.revenue, previous.revenue),
      profitChangePct: pctChange(summary.profit, previous.profit),
      salesCountChangePct: pctChange(summary.salesCount, previous.salesCount),
      expensesChangePct: pctChange(summary.expenses, previous.expenses),
    },
    metrics: {
      profitMarginPct,
      netMarginPct,
      avgDailyRevenue:
        activeSellingDays > 0 ? summary.revenue / activeSellingDays : 0,
      avgDailyProfit:
        activeSellingDays > 0 ? summary.profit / activeSellingDays : 0,
      activeSellingDays,
      totalDaysInPeriod,
      sellThroughRatePct:
        totalDaysInPeriod > 0
          ? Math.round((activeSellingDays / totalDaysInPeriod) * 100)
          : 0,
    },
    dailyTrend,
    weeklyBreakdown,
    paymentMix,
    creditSummary: {
      creditSalesCount,
      creditRevenue,
      creditRevenuePct:
        summary.revenue > 0
          ? Math.round((creditRevenue / summary.revenue) * 100)
          : 0,
    },
    topProductsByRevenue,
    topProductsByQuantity,
    expenseBreakdown,
    monthlyTrend,
    peakDay: peakDayRow
      ? {
          date: peakDayRow.date,
          label: format(new Date(peakDayRow.date), "EEEE, MMM d"),
          revenue: peakDayRow.revenue,
          profit: peakDayRow.profit,
        }
      : null,
  };

  return {
    ...partial,
    insights: buildInsights(partial),
  };
}
