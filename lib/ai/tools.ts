import { forBusiness } from "@/lib/tenant-db";
import { calculateBusinessHealth, getDashboardKPIs } from "@/services/dashboard";

/**
 * Tools the assistant may call to answer a question.
 *
 * The point of these is traceability. The previous design pre-computed one
 * blob of figures and hoped the question was about something in it; anything
 * else got a keyword guess or an invention. Here the model chooses what to
 * look up, every answer is backed by a real query, and the caller gets the
 * list of what was read so the shop owner can be shown where a number
 * came from.
 *
 * businessId is bound on the server and is never a tool parameter. A model
 * that could name the tenant would be one prompt injection away from reading
 * another shop's books, so it is closed over here and the queries additionally
 * run through the scoped client from lib/tenant-db.
 */

export type ToolSchema = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolCallRecord = {
  name: string;
  args: Record<string, unknown>;
};

type Handler = (
  args: Record<string, unknown>,
  businessId: string
) => Promise<unknown>;

/** Keeps a model-supplied number inside something the database can survive. */
function intArg(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: "get_today_summary",
    description:
      "Revenue, expenses, profit, low stock count, expiring count and debt for today. Use for questions about how today or business right now is going.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "query_sales",
    description:
      "Sales totals grouped by day over a recent period. Use for trends, comparisons between days, or questions about a bad or good day.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "How many days back to look, 1 to 90. Defaults to 14.",
        },
      },
    },
  },
  {
    name: "get_top_products",
    description:
      "Best selling products by units over a period, with revenue. Use for what is selling, what is not, and restock priorities.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Days back, 1 to 365. Defaults to 30." },
        limit: { type: "number", description: "How many products, 1 to 20. Defaults to 5." },
      },
    },
  },
  {
    name: "get_stock_levels",
    description:
      "Products in stock, optionally only those at or below reorder level, or expiring within 30 days.",
    parameters: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["all", "low", "expiring", "out"],
          description: "Which products to return. Defaults to low.",
        },
        limit: { type: "number", description: "1 to 50. Defaults to 20." },
      },
    },
  },
  {
    name: "get_debtors",
    description:
      "Customers who owe money, largest first, with how much and when they last bought.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "1 to 50. Defaults to 20." },
      },
    },
  },
  {
    name: "get_expenses",
    description:
      "Expenses over a period, grouped by category. Use for cost questions and where money is going.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Days back, 1 to 365. Defaults to 30." },
      },
    },
  },
  {
    name: "get_business_health",
    description:
      "The health score out of 100, with strengths, warnings and recommendations.",
    parameters: { type: "object", properties: {} },
  },
];

const HANDLERS: Record<string, Handler> = {
  async get_today_summary(_args, businessId) {
    const kpis = await getDashboardKPIs(businessId);
    return {
      revenueToday: kpis.revenueToday,
      expensesToday: kpis.expensesToday,
      profitToday: kpis.profitToday,
      lowStockCount: kpis.lowStockCount,
      expiringCount: kpis.expiringCount,
      debtorsCount: kpis.debtorsCount,
      totalDebt: kpis.totalDebt,
    };
  },

  async query_sales(args, businessId) {
    const days = intArg(args.days, 14, 1, 90);
    const db = forBusiness(businessId);

    const sales = await db.sale.findMany({
      where: { createdAt: { gte: daysAgo(days) } },
      select: { createdAt: true, total: true, profit: true },
      orderBy: { createdAt: "asc" },
    });

    const byDay = new Map<string, { revenue: number; profit: number; sales: number }>();
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      const row = byDay.get(key) ?? { revenue: 0, profit: 0, sales: 0 };
      row.revenue += Number(sale.total);
      row.profit += Number(sale.profit);
      row.sales += 1;
      byDay.set(key, row);
    }

    return {
      days,
      totalSales: sales.length,
      byDay: [...byDay.entries()].map(([date, row]) => ({ date, ...row })),
    };
  },

  async get_top_products(args, businessId) {
    const days = intArg(args.days, 30, 1, 365);
    const limit = intArg(args.limit, 5, 1, 20);
    const db = forBusiness(businessId);

    const items = await db.saleItem.findMany({
      where: { sale: { businessId, createdAt: { gte: daysAgo(days) } } },
      select: { productId: true, quantity: true, total: true },
    });

    const totals = new Map<string, { units: number; revenue: number }>();
    for (const item of items) {
      const row = totals.get(item.productId) ?? { units: 0, revenue: 0 };
      row.units += item.quantity;
      row.revenue += Number(item.total);
      totals.set(item.productId, row);
    }

    const ranked = [...totals.entries()]
      .sort((a, b) => b[1].units - a[1].units)
      .slice(0, limit);

    const products = await db.product.findMany({
      where: { id: { in: ranked.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const names = new Map(products.map((p) => [p.id, p.name]));

    return {
      days,
      products: ranked.map(([id, row]) => ({
        name: names.get(id) ?? "Unknown product",
        unitsSold: row.units,
        revenue: row.revenue,
      })),
    };
  },

  async get_stock_levels(args, businessId) {
    const limit = intArg(args.limit, 20, 1, 50);
    const filter = typeof args.filter === "string" ? args.filter : "low";
    const db = forBusiness(businessId);

    const products = await db.product.findMany({
      where: { isActive: true },
      select: {
        name: true,
        quantity: true,
        reorderLevel: true,
        expiryDate: true,
        sellingPrice: true,
      },
      orderBy: { quantity: "asc" },
      take: 200,
    });

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const matched = products.filter((p) => {
      if (filter === "out") return p.quantity === 0;
      if (filter === "low") return p.quantity <= p.reorderLevel;
      if (filter === "expiring") return p.expiryDate != null && p.expiryDate <= soon;
      return true;
    });

    return {
      filter,
      matched: matched.length,
      products: matched.slice(0, limit).map((p) => ({
        name: p.name,
        inStock: p.quantity,
        reorderLevel: p.reorderLevel,
        sellingPrice: Number(p.sellingPrice),
        expiryDate: p.expiryDate ? p.expiryDate.toISOString().slice(0, 10) : null,
        expired: p.expiryDate ? p.expiryDate < now : false,
      })),
    };
  },

  async get_debtors(args, businessId) {
    const limit = intArg(args.limit, 20, 1, 50);
    const db = forBusiness(businessId);

    const customers = await db.customer.findMany({
      where: { debt: { gt: 0 } },
      select: { name: true, phone: true, debt: true, updatedAt: true },
      orderBy: { debt: "desc" },
      take: limit,
    });

    return {
      count: customers.length,
      totalOwed: customers.reduce((sum, c) => sum + Number(c.debt), 0),
      customers: customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        owes: Number(c.debt),
        lastActivity: c.updatedAt.toISOString().slice(0, 10),
      })),
    };
  },

  async get_expenses(args, businessId) {
    const days = intArg(args.days, 30, 1, 365);
    const db = forBusiness(businessId);

    const expenses = await db.expense.findMany({
      where: { date: { gte: daysAgo(days) } },
      select: { category: true, amount: true },
    });

    const byCategory = new Map<string, number>();
    for (const expense of expenses) {
      byCategory.set(
        expense.category,
        (byCategory.get(expense.category) ?? 0) + Number(expense.amount)
      );
    }

    return {
      days,
      total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      byCategory: [...byCategory.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  },

  async get_business_health(_args, businessId) {
    const health = await calculateBusinessHealth(businessId);
    return {
      score: health.score,
      strengths: health.strengths,
      warnings: health.warnings,
      recommendations: health.recommendations,
    };
  },
};

export function isKnownTool(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(HANDLERS, name);
}

/**
 * Runs one tool. Failures are returned rather than thrown so a single bad
 * lookup degrades that answer instead of killing the conversation.
 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  businessId: string
): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}` };

  try {
    return await handler(args ?? {}, businessId);
  } catch (error) {
    console.error(`[ai tool] ${name} failed:`, error);
    return { error: "That lookup failed. Say so rather than guessing a number." };
  }
}
