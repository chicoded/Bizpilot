import OpenAI from "openai";
import { geminiGenerateText, isGeminiConfigured } from "@/lib/ai/gemini";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatProvider = "gemini" | "openai" | "none";

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

export async function completeBusinessChat(params: {
  systemPrompt: string;
  contextBlock: string;
  message: string;
  history?: ChatMessage[];
}): Promise<{ text: string; provider: ChatProvider } | null> {
  const history = params.history ?? [];
  const provider = getActiveChatProvider();

  if (provider === "gemini") {
    const contents = [
      ...history.slice(-6).map((entry) => ({
        role: entry.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: entry.content }],
      })),
      {
        role: "user" as const,
        parts: [
          {
            text: `Business context:\n${params.contextBlock}\n\nUser question: ${params.message}`,
          },
        ],
      },
    ];

    const text = await geminiGenerateText({
      systemPrompt: params.systemPrompt,
      contents,
    });

    if (text) return { text, provider: "gemini" };
  }

  if (provider === "openai") {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: params.systemPrompt },
          {
            role: "user",
            content: `Business context:\n${params.contextBlock}\n\nUser question: ${params.message}`,
          },
          ...history.slice(-6).map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) return { text, provider: "openai" };
    } catch (error) {
      console.error("OpenAI chat error:", error);
    }
  }

  return null;
}

export async function completeJsonChat(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string | null> {
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
