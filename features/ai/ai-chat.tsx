"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendAIMessage } from "@/actions/business";
import { Sparkles, Send, Loader2, Mic, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What did I earn today?",
  "Which products sell most?",
  "Who owes me money?",
  "What should I reorder?",
  "How is my business health?",
];

interface AiUsageQuota {
  dailyRemaining: number;
  dailyLimit: number;
  tierLabel: string;
}

export function AIChat({
  providerConfigured,
  aiUsage: initialAiUsage,
}: {
  providerConfigured: boolean;
  aiUsage?: AiUsageQuota | null;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: providerConfigured
        ? initialAiUsage
          ? `Hi! I'm your BizPilot AI assistant. On your ${initialAiUsage.tierLabel} plan you have ${initialAiUsage.dailyRemaining} of ${initialAiUsage.dailyLimit} AI messages left today. Ask me about sales, inventory, debts, or business recommendations.`
          : "Hi! I'm your BizPilot AI assistant powered by Google Gemini. Ask me about sales, inventory, debts, expenses, or business recommendations."
        : "Hi! I'm your BizPilot assistant. I'm in offline mode — add a free GEMINI_API_KEY for smarter answers. I can still answer basic questions from your business data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiUsage, setAiUsage] = useState(initialAiUsage ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quotaExhausted = aiUsage !== null && aiUsage.dailyRemaining <= 0;
  const isTrial = aiUsage?.tierLabel === "Free trial";

  async function sendMessage(text: string) {
    if (!text.trim() || loading || quotaExhausted) return;
    const userMsg = text.trim();
    setInput("");
    const priorMessages = messages.slice(1);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const result = await sendAIMessage(
        userMsg,
        priorMessages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );
      if (result.usage) {
        setAiUsage(result.usage);
      }
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.error },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.response ?? "" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {!providerConfigured && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Free AI setup</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            Get a free API key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Google AI Studio
            </a>{" "}
            and add <code className="text-xs">GEMINI_API_KEY</code> to your
            environment variables.
          </p>
        </div>
      )}

      {aiUsage && providerConfigured && (
        <div
          className={cn(
            "mx-4 mt-3 rounded-xl border px-4 py-3 text-sm",
            quotaExhausted
              ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-start gap-3">
            <Gauge className="h-4 w-4 shrink-0 mt-0.5 text-brand" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                {quotaExhausted
                  ? `${aiUsage.tierLabel} AI limit reached for today`
                  : `${aiUsage.tierLabel}: ${aiUsage.dailyRemaining} of ${aiUsage.dailyLimit} AI messages left today`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {quotaExhausted
                  ? isTrial
                    ? "Subscribe for higher AI limits. Offline answers still work without API calls."
                    : "Your daily cap protects platform costs. Limits reset at midnight UTC, or upgrade for more."
                  : "Fair-use limits apply on all plans to keep AI reliable and affordable."}
              </p>
              <Link
                href="/settings/billing"
                className="text-xs font-medium text-brand hover:underline mt-2 inline-block"
              >
                {isTrial ? "View plans →" : "Upgrade for more →"}
              </Link>
            </div>
          </div>
          {!quotaExhausted && (
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{
                  width: `${Math.max(
                    4,
                    (aiUsage.dailyRemaining / aiUsage.dailyLimit) * 100
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-biz-blue text-white rounded-br-md dark:bg-primary dark:text-primary-foreground"
                  : "bg-card border border-border shadow-soft rounded-bl-md text-foreground"
              )}
            >
              {msg.role === "assistant" && (
                <Sparkles className="h-4 w-4 text-biz-emerald mb-1" />
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-soft">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && !quotaExhausted && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-border bg-card/95 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Voice input"
            disabled={quotaExhausted}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              quotaExhausted
                ? `Daily ${aiUsage?.tierLabel ?? ""} AI limit reached`
                : "Ask about your business..."
            }
            className="flex-1 h-12"
            disabled={loading || quotaExhausted}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 h-12 w-12"
            disabled={loading || !input.trim() || quotaExhausted}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </main>
  );
}
