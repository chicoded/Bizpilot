import { prisma } from "@/lib/db";
import { getDashboardKPIs } from "@/services/dashboard";
import {
  completeJsonChat,
  getActiveChatProvider,
  type ChatMessage,
} from "@/lib/ai/chat";
import { chatWithTools } from "@/lib/ai/tool-chat";

const SYSTEM_PROMPT = `You are Zaplex AI, a business advisor for a shop owner in Nigeria.

You have tools that read this shop's own records. Use them. Look things up
before answering anything about sales, stock, debts, expenses or health â€” do
not answer from memory or from what sounds typical for a shop like this one.

Rules about numbers, which matter more than anything else here:
- Every figure you state must come from a tool result in this conversation.
- If a tool returns nothing, or fails, say plainly that you could not find it.
- Never estimate, extrapolate or fill a gap with a plausible number. A wrong
  figure about someone's money is worse than no answer.
- If a question needs data the tools cannot reach, say what is missing and
  what they would need to start recording.

Answer in clear, simple English with Naira (â‚¦). Be brief â€” the person asking is
usually standing behind a counter. Short paragraphs, bullets for lists, and
lead with the answer rather than the working.`;

export function isAIProviderConfigured(): boolean {
  return getActiveChatProvider() !== "none";
}

export async function chatWithAI(
  businessId: string,
  message: string,
  history: ChatMessage[] = [],
  subscription: import("@prisma/client").Subscription | null = null
) {
  const result = await chatWithTools({
    systemPrompt: SYSTEM_PROMPT,
    message,
    businessId,
    history,
    usageContext: { businessId, subscription },
  });

  if (result && "rateLimited" in result) {
    return result.message;
  }

  if (result?.text) {
    return result.text;
  }

  // No provider configured, or the provider failed. Report what is actually
  // known rather than keyword-matching the question into a canned sentence â€”
  // guessing which of five topics was meant is how the old fallback answered
  // "why was Tuesday bad?" with today's revenue.
  return getOfflineSummary(businessId);
}

/**
 * Same shape as a chat reply, but carries what was looked up so the caller can
 * show the shop owner where each figure came from.
 */
export async function chatWithAIDetailed(
  businessId: string,
  message: string,
  history: ChatMessage[] = [],
  subscription: import("@prisma/client").Subscription | null = null
): Promise<{ text: string; sources: string[] }> {
  const result = await chatWithTools({
    systemPrompt: SYSTEM_PROMPT,
    message,
    businessId,
    history,
    usageContext: { businessId, subscription },
  });

  if (result && "rateLimited" in result) {
    return { text: result.message, sources: [] };
  }

  if (result?.text) {
    return {
      text: result.text,
      sources: [...new Set(result.toolCalls.map((call) => call.name))],
    };
  }

  return { text: await getOfflineSummary(businessId), sources: [] };
}

/**
 * What we can say without a model: today's real figures, and an honest note
 * that the question itself was not answered.
 *
 * This replaces a keyword matcher that guessed which of five topics a question
 * was about and returned a canned sentence â€” so "why was last Tuesday bad?"
 * came back with today's revenue, phrased as though it were an answer.
 */
async function getOfflineSummary(businessId: string): Promise<string> {
  const kpis = await getDashboardKPIs(businessId);
  const configured = isAIProviderConfigured();

  const snapshot = [
    `Today: â‚¦${kpis.revenueToday.toLocaleString()} in, â‚¦${kpis.expensesToday.toLocaleString()} out, â‚¦${kpis.profitToday.toLocaleString()} profit.`,
    kpis.lowStockCount > 0 ? `${kpis.lowStockCount} product(s) low on stock.` : null,
    kpis.expiringCount > 0 ? `${kpis.expiringCount} expiring within 30 days.` : null,
    kpis.debtorsCount > 0
      ? `${kpis.debtorsCount} customer(s) owe â‚¦${kpis.totalDebt.toLocaleString()}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const reason = configured
    ? "I could not reach the assistant just now, so I have not answered your question."
    : "No AI provider is set up, so I cannot answer questions yet. Add a free GEMINI_API_KEY from Google AI Studio.";

  return `${reason}\n\nHere is what the records show right now:\n${snapshot}`;
}

export async function parseVoiceSale(
  businessId: string,
  transcript: string,
  subscription: import("@prisma/client").Subscription | null = null
): Promise<{ items: { productName: string; quantity: number }[]; message: string }> {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: { name: true },
  });

  const raw = await completeJsonChat({
    systemPrompt: `Parse voice sale commands into JSON. Available products: ${products.map((p) => p.name).join(", ")}.
Return JSON only: { "items": [{ "productName": string, "quantity": number }] }`,
    userPrompt: transcript,
    usageContext: { businessId, subscription },
  });

  if (raw && typeof raw === "object" && "rateLimited" in raw) {
    return { items: [], message: raw.message };
  }

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
