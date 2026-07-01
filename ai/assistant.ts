import OpenAI from "openai";
import { prisma } from "@/lib/db";
import {
  calculateBusinessHealth,
  getDashboardKPIs,
  generateAIInsights,
} from "@/services/dashboard";
import { getTaxDashboard } from "@/services/tax";
import { TAX_DISCLAIMER_SHORT } from "@/lib/tax/constants";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are BizPilot AI, an expert business advisor for African small and medium enterprises (SMEs) in Nigeria.

You help business owners with:
- Sales analysis and trends
- Inventory management and restocking advice
- Expense tracking and cost reduction
- Customer debt follow-up
- Cashflow forecasting
- Tax estimate questions (estimates only — not legal or tax advice)
- Fraud and anomaly detection
- Business health recommendations

When discussing tax, always remind users that figures are estimates from their records, not official filings or legal advice. ${TAX_DISCLAIMER_SHORT}

Always respond in clear, simple English. Use Nigerian Naira (₦) for currency.
Be concise, actionable, and empathetic. African SME owners are busy — give them direct answers.
When you don't have data, say so and suggest what they should track.

Format responses with short paragraphs. Use bullet points for lists.
Never make up specific numbers — only use data provided in context.`;

export async function getBusinessContextForAI(businessId: string) {
  const [business, kpis, health, insights, topProducts, recentSales, taxData] =
    await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      getDashboardKPIs(businessId),
      calculateBusinessHealth(businessId),
      generateAIInsights(businessId),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { businessId } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.sale.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
      }),
      getTaxDashboard(businessId).catch(() => null),
    ]);

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  return {
    business,
    kpis,
    health,
    insights,
    topProducts: topProducts.map((p) => ({
      name: productMap[p.productId] ?? "Unknown",
      quantity: p._sum.quantity,
    })),
    recentSales: recentSales.map((s) => ({
      total: Number(s.total),
      profit: Number(s.profit),
      tax: Number(s.tax),
      date: s.createdAt,
      items: s.items.map((i) => `${i.quantity}x ${i.product.name}`),
    })),
    tax: taxData
      ? {
          monthlyTax: taxData.monthly?.estimatedTax ?? 0,
          monthlyVat: taxData.monthly?.estimatedVATCollected ?? 0,
          monthlyProfit: taxData.monthly?.estimatedProfit ?? 0,
          complianceScore: taxData.compliance.score,
          forecastAnnualTax: taxData.forecast.projectedAnnualTax,
          vatEnabled: taxData.today.vatEnabled,
        }
      : null,
  };
}

export async function chatWithAI(
  businessId: string,
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = []
) {
  const context = await getBusinessContextForAI(businessId);

  const contextMessage = `
Business: ${context.business?.name} (${context.business?.industry})
Currency: ${context.business?.currency ?? "NGN"}

Today's KPIs:
- Revenue: ₦${context.kpis.revenueToday.toLocaleString()}
- Expenses: ₦${context.kpis.expensesToday.toLocaleString()}
- Profit: ₦${context.kpis.profitToday.toLocaleString()}
- Low stock items: ${context.kpis.lowStockCount}
- Expiring products: ${context.kpis.expiringCount}
- Debtors: ${context.kpis.debtorsCount} (₦${context.kpis.totalDebt.toLocaleString()} total)

Business Health Score: ${context.health.score}/100
Strengths: ${context.health.strengths.join(", ") || "None"}
Warnings: ${context.health.warnings.join(", ") || "None"}

Top selling products: ${context.topProducts.map((p) => `${p.name} (${p.quantity} sold)`).join(", ") || "No data"}

Recent sales: ${context.recentSales.map((s) => `₦${s.total} - ${s.items.join(", ")}`).join("; ") || "No recent sales"}

Tax estimates (${TAX_DISCLAIMER_SHORT}):
${
  context.tax
    ? `- Monthly tax estimate: ₦${context.tax.monthlyTax.toLocaleString()}
- Monthly VAT collected (estimate): ₦${context.tax.monthlyVat.toLocaleString()}
- Monthly profit estimate: ₦${context.tax.monthlyProfit.toLocaleString()}
- Compliance score: ${context.tax.complianceScore}%
- Projected annual tax: ₦${context.tax.forecastAnnualTax.toLocaleString()}
- VAT on sales: ${context.tax.vatEnabled ? "enabled" : "not enabled"}`
    : "Tax module not configured yet — user can set up at /tax/settings"
}
`;

  if (!process.env.OPENAI_API_KEY) {
    return getFallbackResponse(message, context);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Business context:\n${contextMessage}\n\nUser question: ${message}`,
        },
        ...history.slice(-6),
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return (
      response.choices[0]?.message?.content ??
      "I couldn't generate a response. Please try again."
    );
  } catch {
    return getFallbackResponse(message, context);
  }
}

function getFallbackResponse(
  message: string,
  context: Awaited<ReturnType<typeof getBusinessContextForAI>>
) {
  const lower = message.toLowerCase();

  if (lower.includes("earn") || lower.includes("revenue") || lower.includes("sales today")) {
    return `Today you earned ₦${context.kpis.revenueToday.toLocaleString()} in revenue with ₦${context.kpis.profitToday.toLocaleString()} profit. ${context.kpis.revenueToday > 0 ? "Good work!" : "No sales recorded yet today — time to make some sales!"}`;
  }

  if (lower.includes("owe") || lower.includes("debt")) {
    if (context.kpis.debtorsCount === 0) {
      return "Great news — no customers currently owe you money!";
    }
    return `You have ${context.kpis.debtorsCount} customers who owe a total of ₦${context.kpis.totalDebt.toLocaleString()}. Check the Debt Management page to follow up.`;
  }

  if (lower.includes("reorder") || lower.includes("restock") || lower.includes("stock")) {
    if (context.kpis.lowStockCount === 0) {
      return "Your inventory levels look good — no urgent restocking needed.";
    }
    return `${context.kpis.lowStockCount} products need restocking. Head to Inventory to review and place orders.`;
  }

  if (lower.includes("vat")) {
    if (!context.tax) {
      return "Set up your tax profile under Tax & Compliance to see VAT estimates.";
    }
    return `Estimated VAT collected this month: ₦${context.tax.monthlyVat.toLocaleString()}. VAT on new sales is ${context.tax.vatEnabled ? "enabled" : "disabled"} in settings. ${TAX_DISCLAIMER_SHORT}`;
  }

  if (
    lower.includes("tax") ||
    lower.includes("firs") ||
    lower.includes("compliance")
  ) {
    if (!context.tax) {
      return "Open Tax & Compliance in the menu to configure your profile and see estimates.";
    }
    return `Tax estimates this month: ₦${context.tax.monthlyTax.toLocaleString()} (profit estimate ₦${context.tax.monthlyProfit.toLocaleString()}). Compliance score: ${context.tax.complianceScore}%. Projected annual tax: ₦${context.tax.forecastAnnualTax.toLocaleString()}. ${TAX_DISCLAIMER_SHORT}`;
  }

  if (lower.includes("health") || lower.includes("score")) {
    return `Your Business Health Score is ${context.health.score}/100.\n\nStrengths: ${context.health.strengths.join(", ") || "Building up"}\nWarnings: ${context.health.warnings.join(", ") || "None"}\n\nRecommendations:\n${context.health.recommendations.map((r) => `• ${r}`).join("\n")}`;
  }

  if (lower.includes("expir")) {
    if (context.kpis.expiringCount === 0) {
      return "No products expiring in the next 30 days.";
    }
    return `${context.kpis.expiringCount} products are expiring within 30 days. Check Inventory to sell or discount them before they expire.`;
  }

  return `Your business health is ${context.health.score}/100. Today: ₦${context.kpis.revenueToday.toLocaleString()} revenue, ₦${context.kpis.expensesToday.toLocaleString()} expenses. Ask me about sales, inventory, debts, or expenses!`;
}

export async function parseVoiceSale(
  businessId: string,
  transcript: string
): Promise<{ items: { productName: string; quantity: number }[]; message: string }> {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: { name: true },
  });

  if (!process.env.OPENAI_API_KEY) {
    return {
      items: [],
      message: "Voice sales require OpenAI API key. Please configure OPENAI_API_KEY.",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Parse voice sale commands into JSON. Available products: ${products.map((p) => p.name).join(", ")}.
Return JSON only: { "items": [{ "productName": string, "quantity": number }] }`,
        },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      items: parsed.items ?? [],
      message: `Parsed ${parsed.items?.length ?? 0} items from voice command.`,
    };
  } catch {
    return { items: [], message: "Could not parse voice command. Please try again." };
  }
}
