import OpenAI from "openai";
import {
  geminiModel,
  isGeminiConfigured,
  resolveGeminiApiKey,
} from "@/lib/ai/gemini";
import { guardAiPrompt, type AiUsageContext } from "@/lib/ai-usage-limit";
import {
  TOOL_SCHEMAS,
  isKnownTool,
  runTool,
  type ToolCallRecord,
} from "@/lib/ai/tools";
import type { ChatMessage, ChatProvider } from "@/lib/ai/chat";
import { getActiveChatProvider } from "@/lib/ai/chat";

/**
 * A tool-calling conversation loop over whichever provider is configured.
 *
 * The model decides what to look up rather than being handed one fixed blob of
 * figures, so it can answer questions nobody anticipated — and every figure it
 * quotes came out of a real query. The calls it made are returned alongside the
 * answer so the shop owner can be shown where a number came from.
 */

export type ToolChatResult =
  | { text: string; provider: ChatProvider; toolCalls: ToolCallRecord[] }
  | { rateLimited: true; message: string };

/**
 * Bounded so a model that keeps asking for lookups cannot spend the shop's
 * quota in a loop. Four rounds is enough to chain two or three reads.
 */
const MAX_ROUNDS = 4;

export async function chatWithTools(params: {
  systemPrompt: string;
  message: string;
  businessId: string;
  history?: ChatMessage[];
  usageContext?: AiUsageContext;
}): Promise<ToolChatResult | null> {
  const provider = getActiveChatProvider();
  if (provider === "none") return null;

  if (params.usageContext) {
    const limit = await guardAiPrompt(params.usageContext);
    if (!limit.allowed) {
      return { rateLimited: true, message: limit.message! };
    }
  }

  if (provider === "gemini" && isGeminiConfigured()) {
    const result = await runGemini(params);
    if (result) return result;
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    const result = await runOpenAi(params);
    if (result) return result;
  }

  return null;
}

/* ------------------------------- OpenAI -------------------------------- */

async function runOpenAi(params: {
  systemPrompt: string;
  message: string;
  businessId: string;
  history?: ChatMessage[];
}): Promise<ToolChatResult | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const used: ToolCallRecord[] = [];

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: params.systemPrompt },
    ...(params.history ?? []).slice(-6).map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
    { role: "user", content: params.message },
  ];

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await openai.chat.completions.create({
        model,
        messages,
        tools: TOOL_SCHEMAS.map((tool) => ({
          type: "function" as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        // Low: this assistant reports figures, and invention is the failure
        // mode that matters most.
        temperature: 0.2,
        max_tokens: 800,
      });

      const choice = response.choices[0]?.message;
      if (!choice) return null;

      const calls = choice.tool_calls ?? [];
      if (calls.length === 0) {
        const text = choice.content?.trim();
        return text ? { text, provider: "openai", toolCalls: used } : null;
      }

      messages.push(choice);

      for (const call of calls) {
        if (call.type !== "function") continue;
        const name = call.function.name;
        const args = safeArgs(call.function.arguments);
        const output = isKnownTool(name)
          ? await runTool(name, args, params.businessId)
          : { error: `Unknown tool: ${name}` };

        if (isKnownTool(name)) used.push({ name, args });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(output),
        });
      }
    }

    // Ran out of rounds without a final answer.
    return null;
  } catch (error) {
    console.error("OpenAI tool chat error:", error);
    return null;
  }
}

/* ------------------------------- Gemini -------------------------------- */

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

async function runGemini(params: {
  systemPrompt: string;
  message: string;
  businessId: string;
  history?: ChatMessage[];
}): Promise<ToolChatResult | null> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) return null;

  const used: ToolCallRecord[] = [];
  const contents: GeminiContent[] = [
    ...(params.history ?? []).slice(-6).map((entry) => ({
      role: entry.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: entry.content }] as GeminiPart[],
    })),
    { role: "user", parts: [{ text: params.message }] },
  ];

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: params.systemPrompt }] },
            contents,
            tools: [
              {
                functionDeclarations: TOOL_SCHEMAS.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                })),
              },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
          }),
        }
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error("Gemini tool chat error:", response.status, body.slice(0, 400));
        return null;
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: GeminiPart[] } }[];
      };

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const calls = parts.filter(
        (part): part is Extract<GeminiPart, { functionCall: unknown }> =>
          "functionCall" in part
      );

      if (calls.length === 0) {
        const text = parts
          .map((part) => ("text" in part ? part.text : ""))
          .join("")
          .trim();
        return text ? { text, provider: "gemini", toolCalls: used } : null;
      }

      contents.push({ role: "model", parts });

      const responses: GeminiPart[] = [];
      for (const part of calls) {
        const name = part.functionCall.name;
        const args = part.functionCall.args ?? {};
        const output = isKnownTool(name)
          ? await runTool(name, args, params.businessId)
          : { error: `Unknown tool: ${name}` };

        if (isKnownTool(name)) used.push({ name, args });

        responses.push({
          functionResponse: {
            name,
            // Gemini requires an object here, so scalars get wrapped.
            response: (output && typeof output === "object"
              ? output
              : { value: output }) as Record<string, unknown>,
          },
        });
      }

      contents.push({ role: "user", parts: responses });
    }

    return null;
  } catch (error) {
    console.error("Gemini tool chat error:", error);
    return null;
  }
}

function safeArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
