"use client";

import { useState, useTransition } from "react";
import { simulateInboundMessage, sendTestWhatsAppMessage } from "@/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, FlaskConical } from "lucide-react";

const QUICK_TESTS = [
  "Do you have Paracetamol?",
  "Hello",
  "How much is Coke?",
  "What are your opening hours?",
];

interface WhatsAppSimulatorProps {
  twilioConfigured: boolean;
}

export function WhatsAppSimulator({ twilioConfigured }: WhatsAppSimulatorProps) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  function runSimulation(text: string) {
    setMessage(text);
    setReply(null);
    startTransition(async () => {
      const result = await simulateInboundMessage(text);
      setReply(result.reply);
    });
  }

  function sendLiveTest() {
    if (!testPhone) return;
    startTransition(async () => {
      const result = await sendTestWhatsAppMessage(testPhone);
      if (result.error) {
        setReply(`Error: ${result.error}`);
      } else {
        setReply("✅ Test message sent to your phone!");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-biz-emerald" />
          Test WhatsApp AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_TESTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => runSimulation(q)}
              disabled={isPending}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary/20 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSimulation(message);
          }}
          className="flex gap-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Try: "Do you have Paracetamol?"'
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !message.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {reply && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-2">
              AI Reply
            </p>
            <p className="text-sm whitespace-pre-wrap">{reply}</p>
          </div>
        )}

        {twilioConfigured && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Send live test (Twilio)
            </p>
            <div className="flex gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                type="tel"
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendLiveTest}
                disabled={isPending || !testPhone}
              >
                Send Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              For Twilio Sandbox, recipient must have joined your sandbox first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
