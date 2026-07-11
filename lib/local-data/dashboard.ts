import { addDays, endOfDay, startOfDay } from "date-fns";
import { listLocalCustomers } from "@/lib/local-data/customers";
import { listLocalExpenses } from "@/lib/local-data/expenses";
import { listLocalProducts } from "@/lib/local-data/products";
import { listLocalSales } from "@/lib/local-data/sales";
import type { BusinessHealthResult, DashboardKPIs } from "@/types";
export async function getLocalDashboardKPIs(
  businessId: string
): Promise<DashboardKPIs> {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const expiringBefore = addDays(new Date(), 30);

  const [sales, expenses, products, customers] = await Promise.all([
    listLocalSales(businessId),
    listLocalExpenses(businessId),
    listLocalProducts(businessId),
    listLocalCustomers(businessId),
  ]);

  const salesToday = sales.filter((sale) => {
    const created = new Date(sale.createdAt);
    return created >= todayStart && created <= todayEnd;
  });

  const expensesToday = expenses.filter((expense) => {
    const date = new Date(expense.date);
    return date >= todayStart && date <= todayEnd;
  });

  const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0);
  const profitToday = salesToday.reduce((sum, s) => sum + s.profit, 0);
  const expensesTodayTotal = expensesToday.reduce((sum, e) => sum + e.amount, 0);

  const lowStockCount = products.filter(
    (p) => p.quantity <= p.reorderLevel
  ).length;

  const expiringCount = products.filter((p) => {
    if (!p.expiryDate) return false;
    const expiry = new Date(p.expiryDate);
    return expiry <= expiringBefore && expiry >= new Date();
  }).length;

  const debtors = customers.filter((c) => c.debt > 0);

  return {
    revenueToday,
    expensesToday: expensesTodayTotal,
    profitToday,
    lowStockCount,
    expiringCount,
    debtorsCount: debtors.length,
    totalDebt: debtors.reduce((sum, c) => sum + c.debt, 0),
  };
}

export async function getLocalBusinessHealth(
  businessId: string
): Promise<BusinessHealthResult> {
  const kpis = await getLocalDashboardKPIs(businessId);
  const [products, sales] = await Promise.all([
    listLocalProducts(businessId),
    listLocalSales(businessId),
  ]);

  const strengths: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (kpis.revenueToday > 0) {
    strengths.push("Sales recorded today");
  } else {
    warnings.push("No sales recorded today yet");
    recommendations.push("Open Point of Sale to record today's sales");
  }

  if (kpis.profitToday > 0) {
    strengths.push("Profitable day so far");
  }

  if (kpis.lowStockCount === 0) {
    strengths.push("Inventory levels look healthy");
  } else {
    warnings.push(`${kpis.lowStockCount} product(s) low on stock`);
    recommendations.push("Review low stock alerts and reorder");
  }

  if (kpis.totalDebt > 0) {
    warnings.push(
      `${kpis.debtorsCount} customer(s) owe ${kpis.totalDebt.toLocaleString("en-NG")}`
    );
    recommendations.push("Follow up on outstanding debts");
  } else {
    strengths.push("No outstanding customer debt");
  }

  const salesScore = kpis.revenueToday > 0 ? 80 : 40;
  const profitScore = kpis.profitToday > 0 ? 85 : 50;
  const inventoryScore =
    products.length === 0 ? 50 : Math.max(20, 100 - kpis.lowStockCount * 15);
  const cashflowScore =
    kpis.expensesToday <= kpis.revenueToday ? 80 : 45;
  const customersScore = sales.some((s) => s.customerId) ? 75 : 55;

  const score = Math.round(
    (salesScore + profitScore + inventoryScore + cashflowScore + customersScore) / 5
  );

  return {
    score,
    strengths,
    warnings,
    recommendations,
    breakdown: {
      sales: salesScore,
      profit: profitScore,
      inventory: inventoryScore,
      cashflow: cashflowScore,
      customers: customersScore,
    },
  };
}
