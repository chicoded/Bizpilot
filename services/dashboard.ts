import { prisma } from "@/lib/db";
import type { DashboardKPIs, AIInsight, BusinessHealthResult } from "@/types";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";

export async function getDashboardKPIs(
  businessId: string
): Promise<DashboardKPIs> {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const expiryThreshold = addDays(new Date(), 30);

  const [todaySales, todayExpenses, productStock, expiring, debtors] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          businessId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { total: true, profit: true },
      }),
      prisma.expense.aggregate({
        where: {
          businessId,
          date: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      prisma.product.findMany({
        where: { businessId, isActive: true },
        select: { quantity: true, reorderLevel: true },
      }),
      prisma.product.count({
        where: {
          businessId,
          isActive: true,
          expiryDate: { lte: expiryThreshold, gte: new Date() },
        },
      }),
      prisma.customer.findMany({
        where: { businessId, debt: { gt: 0 } },
        select: { debt: true },
      }),
    ]);

  const revenueToday = Number(todaySales._sum.total ?? 0);
  const profitToday = Number(todaySales._sum.profit ?? 0);
  const expensesToday = Number(todayExpenses._sum.amount ?? 0);
  const lowStock = productStock.filter(
    (p) => p.quantity <= p.reorderLevel
  ).length;

  return {
    revenueToday,
    expensesToday,
    profitToday,
    lowStockCount: lowStock,
    expiringCount: expiring,
    debtorsCount: debtors.length,
    totalDebt: debtors.reduce((sum, c) => sum + Number(c.debt), 0),
  };
}

export async function generateAIInsights(
  businessId: string
): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const thirtyDaysAgo = subDays(new Date(), 30);
  const expiryThreshold = addDays(new Date(), 30);

  const [lowStockProducts, expiringProducts, debtors, recentFuelExpenses] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          businessId,
          isActive: true,
          quantity: { lte: 10 },
        },
        take: 5,
        orderBy: { quantity: "asc" },
      }),
      prisma.product.findMany({
        where: {
          businessId,
          expiryDate: { lte: expiryThreshold, gte: new Date() },
        },
        take: 3,
      }),
      prisma.customer.findMany({
        where: { businessId, debt: { gt: 0 } },
        orderBy: { debt: "desc" },
        take: 3,
      }),
      prisma.expense.findMany({
        where: {
          businessId,
          category: "FUEL",
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "desc" },
      }),
    ]);

  if (lowStockProducts.length > 0) {
    insights.push({
      id: "low-stock",
      type: "warning",
      title: `${lowStockProducts.length} products need restocking`,
      message: `${lowStockProducts.map((p) => p.name).join(", ")} running low.`,
      action: "View inventory",
      actionHref: "/inventory",
    });
  }

  if (expiringProducts.length > 0) {
    insights.push({
      id: "expiring",
      type: "danger",
      title: `${expiringProducts.length} products expiring soon`,
      message: `Check ${expiringProducts[0]?.name} and others before they expire.`,
      action: "View products",
      actionHref: "/inventory",
    });
  }

  for (const debtor of debtors) {
    insights.push({
      id: `debt-${debtor.id}`,
      type: "warning",
      title: `${debtor.name} owes ₦${Number(debtor.debt).toLocaleString()}`,
      message: "Follow up on outstanding credit sale.",
      action: "View debtors",
      actionHref: "/debts",
    });
  }

  if (recentFuelExpenses.length >= 2) {
    const latest = Number(recentFuelExpenses[0].amount);
    const previous = Number(recentFuelExpenses[1].amount);
    if (previous > 0) {
      const change = Math.round(((latest - previous) / previous) * 100);
      if (change > 15) {
        insights.push({
          id: "fuel-increase",
          type: "warning",
          title: `Generator fuel increased by ${change}%`,
          message: "Consider monitoring fuel usage or generator efficiency.",
          action: "View expenses",
          actionHref: "/expenses",
        });
      }
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-good",
      type: "success",
      title: "Business looking healthy",
      message: "No urgent issues detected. Keep up the good work!",
    });
  }

  return insights;
}

export async function calculateBusinessHealth(
  businessId: string
): Promise<BusinessHealthResult> {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sevenDaysAgo = subDays(new Date(), 7);
  const fourteenDaysAgo = subDays(new Date(), 14);

  const [
    salesLast30,
    salesLast7,
    salesPrev7,
    expensesLast30,
    products,
    customersWithDebt,
    totalCustomers,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: thirtyDaysAgo } },
      _sum: { total: true, profit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: sevenDaysAgo } },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        businessId,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { businessId, date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: {
        quantity: true,
        reorderLevel: true,
        expiryDate: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    }),
    prisma.customer.count({
      where: { businessId, debt: { gt: 0 } },
    }),
    prisma.customer.count({ where: { businessId } }),
  ]);

  const revenue30 = Number(salesLast30._sum.total ?? 0);
  const profit30 = Number(salesLast30._sum.profit ?? 0);
  const expenses30 = Number(expensesLast30._sum.amount ?? 0);
  const sales7 = Number(salesLast7._sum.total ?? 0);
  const salesPrev7Val = Number(salesPrev7._sum.total ?? 0);

  // Score components (0-100 each)
  const salesTrend =
    salesPrev7Val > 0
      ? ((sales7 - salesPrev7Val) / salesPrev7Val) * 100
      : sales7 > 0
        ? 20
        : 0;
  const salesScore = Math.min(
    100,
    Math.max(0, 50 + salesTrend + (salesLast30._count > 10 ? 20 : 0))
  );

  const profitMargin = revenue30 > 0 ? (profit30 / revenue30) * 100 : 0;
  const profitScore = Math.min(100, Math.max(0, profitMargin * 2));

  const lowStockCount = products.filter(
    (p) => p.quantity <= p.reorderLevel
  ).length;
  const expiringCount = products.filter(
    (p) =>
      p.expiryDate &&
      p.expiryDate <= addDays(new Date(), 30) &&
      p.expiryDate >= new Date()
  ).length;
  const inventoryScore = Math.max(
    0,
    100 - lowStockCount * 8 - expiringCount * 10
  );

  const expenseRatio = revenue30 > 0 ? (expenses30 / revenue30) * 100 : 50;
  const cashflowScore = Math.max(0, Math.min(100, 100 - expenseRatio));

  const debtRatio =
    totalCustomers > 0 ? (customersWithDebt / totalCustomers) * 100 : 0;
  const customersScore = Math.max(0, 100 - debtRatio * 2);

  const breakdown = {
    sales: Math.round(salesScore),
    profit: Math.round(profitScore),
    inventory: Math.round(inventoryScore),
    cashflow: Math.round(cashflowScore),
    customers: Math.round(customersScore),
  };

  const score = Math.round(
    (breakdown.sales +
      breakdown.profit +
      breakdown.inventory +
      breakdown.cashflow +
      breakdown.customers) /
      5
  );

  const strengths: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (breakdown.sales >= 70) strengths.push("Strong sales performance");
  if (breakdown.profit >= 70) strengths.push("Healthy profit margins");
  if (breakdown.inventory >= 70) strengths.push("Inventory well managed");

  if (breakdown.sales < 60) warnings.push("Sales declining this week");
  if (breakdown.profit < 50) warnings.push("Low profit margins");
  if (breakdown.inventory < 60) warnings.push("Slow inventory turnover");
  if (breakdown.cashflow < 60) warnings.push("High expenses relative to revenue");
  if (customersWithDebt > 0) warnings.push(`${customersWithDebt} customers with outstanding debt`);

  if (lowStockCount > 0)
    recommendations.push(`Restock ${lowStockCount} low-stock products`);
  if (expiringCount > 0)
    recommendations.push(`Sell or discount ${expiringCount} expiring products`);
  if (customersWithDebt > 0)
    recommendations.push("Follow up with debtors this week");
  if (breakdown.cashflow < 60)
    recommendations.push("Review and reduce recurring expenses like fuel");
  if (profitMargin < 20)
    recommendations.push("Review pricing on low-margin products");

  if (recommendations.length === 0)
    recommendations.push("Keep monitoring daily — you're on track");

  return {
    score,
    strengths,
    warnings,
    recommendations,
    breakdown,
  };
}

export async function saveHealthScore(
  businessId: string,
  health: BusinessHealthResult
) {
  return prisma.businessHealthScore.create({
    data: {
      businessId,
      score: health.score,
      strengths: health.strengths,
      warnings: health.warnings,
      recommendations: health.recommendations,
      breakdown: health.breakdown,
    },
  });
}
