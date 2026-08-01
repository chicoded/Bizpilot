import OpenAI from "openai";
import { geminiGenerateText, isGeminiConfigured } from "@/lib/ai/gemini";
import {
  guardAiPrompt,
  type AiUsageContext,
} from "@/lib/ai-usage-limit";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatProvider = "gemini" | "openai" | "none";

export type ChatCompletionResult =
  | { text: string; provider: ChatProvider }
  | { rateLimited: true; message: string };

export function getActiveChatProvider(): ChatProvider {
  if (isGeminiConfigured()) return "gemini";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "none";
}

export function getChatProviderLabel(provider: ChatProvider): string {
  if (provider === "gemini") return "Google Gemini";
  if (provider === "openai") return "OpenAI";
  return "Offline assistant";
}

/**
 * completeBusinessChat used to live here: it pasted a pre-computed block of
 * figures into the prompt and hoped the question was about something in it.
 * Replaced by lib/ai/tool-chat.ts, where the model looks things up instead.
 */

export async function completeJsonChat(params: {
  systemPrompt: string;
  userPrompt: string;
  usageContext?: AiUsageContext;
}): Promise<string | { rateLimited: true; message: string } | null> {
  if (params.usageContext) {
    const limit = await guardAiPrompt(params.usageContext);
    if (!limit.allowed) {
      return { rateLimited: true, message: limit.message! };
    }
  }

  if (isGeminiConfigured()) {
    const text = await geminiGenerateText({
      systemPrompt: params.systemPrompt,
      contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
      maxOutputTokens: 300,
      temperature: 0.2,
    });
    if (text) return text;
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });
      return response.choices[0]?.message?.content ?? null;
    } catch (error) {
      console.error("OpenAI JSON chat error:", error);
    }
  }

  return null;
}
