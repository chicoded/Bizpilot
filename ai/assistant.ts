import { prisma } from "@/lib/db";
import {
  calculateBusinessHealth,
  getDashboardKPIs,
  generateAIInsights,
} from "@/services/dashboard";
import {
  completeBusinessChat,
  completeJsonChat,
  getActiveChatProvider,
  type ChatMessage,
} from "@/lib/ai/chat";

const SYSTEM_PROMPT = `You are BizPilot AI, an expert business advisor for African small and medium enterprises (SMEs) in Nigeria.

You help business owners with:
- Sales analysis and trends
- Inventory management and restocking advice
- Expense tracking and cost reduction
- Customer debt follow-up
- Cashflow forecasting
- Fraud and anomaly detection
- Business health recommendations

Always respond in clear, simple English. Use Nigerian Naira (₦) for currency.
Be concise, actionable, and empathetic. African SME owners are busy — give them direct answers.
When you don't have data, say so and suggest what they should track.

Format responses with short paragraphs. Use bullet points for lists.
Never make up specific numbers — only use data provided in context.`;

export async function getBusinessContextForAI(businessId: string) {
  const [business, kpis, health, insights, topProducts, recentSales] =
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
      date: s.createdAt,
      items: s.items.map((i) => `${i.quantity}x ${i.product.name}`),
    })),
  };
}

function buildContextMessage(
  context: Awaited<ReturnType<typeof getBusinessContextForAI>>
) {
  const insightLines = context.insights
    .slice(0, 3)
    .map((i) => `- ${i.title}: ${i.message}`)
    .join("\n");

  return `
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

Active alerts:
${insightLines || "None"}
`.trim();
}

export function isAIProviderConfigured(): boolean {
  return getActiveChatProvider() !== "none";
}

export async function chatWithAI(
  businessId: string,
  message: string,
  history: ChatMessage[] = []
) {
  const context = await getBusinessContextForAI(businessId);
  const contextMessage = buildContextMessage(context);

  const result = await completeBusinessChat({
    systemPrompt: SYSTEM_PROMPT,
    contextBlock: contextMessage,
    message,
    history,
  });

  if (result?.text) {
    return result.text;
  }

  return getFallbackResponse(message, context);
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

  if (lower.includes("health") || lower.includes("score")) {
    return `Your Business Health Score is ${context.health.score}/100.\n\nStrengths: ${context.health.strengths.join(", ") || "Building up"}\nWarnings: ${context.health.warnings.join(", ") || "None"}\n\nRecommendations:\n${context.health.recommendations.map((r) => `• ${r}`).join("\n")}`;
  }

  if (lower.includes("expir")) {
    if (context.kpis.expiringCount === 0) {
      return "No products expiring in the next 30 days.";
    }
    return `${context.kpis.expiringCount} products are expiring within 30 days. Check Inventory to sell or discount them before they expire.`;
  }

  if (!isAIProviderConfigured()) {
    return `I'm running in offline mode. Add a free GEMINI_API_KEY from Google AI Studio for smarter answers.\n\nQuick snapshot: health ${context.health.score}/100, today ₦${context.kpis.revenueToday.toLocaleString()} revenue, ₦${context.kpis.expensesToday.toLocaleString()} expenses.`;
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

  const raw = await completeJsonChat({
    systemPrompt: `Parse voice sale commands into JSON. Available products: ${products.map((p) => p.name).join(", ")}.
Return JSON only: { "items": [{ "productName": string, "quantity": number }] }`,
    userPrompt: transcript,
  });

  if (!raw) {
    return {
      items: [],
      message: isAIProviderConfigured()
        ? "Could not parse voice command. Please try again."
        : "Voice sales need GEMINI_API_KEY (free at Google AI Studio) or OPENAI_API_KEY.",
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      items?: { productName: string; quantity: number }[];
    };
    return {
      items: parsed.items ?? [],
      message: `Parsed ${parsed.items?.length ?? 0} items from voice command.`,
    };
  } catch {
    return { items: [], message: "Could not parse voice command. Please try again." };
  }
}
