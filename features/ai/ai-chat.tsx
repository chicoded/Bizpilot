"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendAIMessage } from "@/actions/business";
import { Sparkles, Send, Loader2, Mic } from "lucide-react";
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

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your BizPilot AI assistant. Ask me anything about your business — sales, inventory, debts, expenses, or get recommendations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const result = await sendAIMessage(userMsg);
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
                  ? "bg-biz-blue text-white rounded-br-md"
                  : "bg-white border border-border/50 shadow-soft rounded-bl-md"
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
            <div className="bg-white border rounded-2xl px-4 py-3 shadow-soft">
              <Loader2 className="h-4 w-4 animate-spin text-biz-blue" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              className="rounded-full border border-biz-blue/20 bg-biz-blue/5 px-3 py-1.5 text-xs font-medium text-biz-blue hover:bg-biz-blue/10 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t bg-white/80 backdrop-blur-xl">
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
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..."
            className="flex-1 h-12"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 h-12 w-12"
            disabled={loading || !input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </main>
  );
}
