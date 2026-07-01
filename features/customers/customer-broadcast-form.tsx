"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { sendCustomerBroadcast } from "@/actions/customer-broadcast";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Loader2, Megaphone, MessageCircle } from "lucide-react";
import type { BroadcastCustomer } from "@/lib/customers";

const MESSAGE_TEMPLATES = [
  {
    label: "New stock",
    text: "Hello {name}! {business} has new stock in. Visit us today or reply to place an order.",
  },
  {
    label: "Promo",
    text: "Hi {name}! Special offers this week at {business}. Don't miss out — visit us soon.",
  },
  {
    label: "Debt reminder",
    text: "Hello {name}, this is a friendly reminder from {business} about your outstanding balance. Please visit us to settle when you can. Thank you!",
  },
];

type Audience = "all" | "debtors" | "selected";

export function CustomerBroadcastForm({
  customers,
  currency,
  twilioConfigured,
  whatsappEnabled,
}: {
  customers: BroadcastCustomer[];
  currency: string;
  twilioConfigured: boolean;
  whatsappEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState(MESSAGE_TEMPLATES[0].text);
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    failures: { name: string; error: string }[];
  } | null>(null);

  const reachableCustomers = useMemo(
    () => customers.filter((customer) => customer.hasValidPhone),
    [customers]
  );

  const debtorCustomers = useMemo(
    () => reachableCustomers.filter((customer) => customer.debt > 0),
    [reachableCustomers]
  );

  const recipientCount = useMemo(() => {
    if (audience === "all") return reachableCustomers.length;
    if (audience === "debtors") return debtorCustomers.length;
    return selectedIds.filter((id) =>
      reachableCustomers.some((customer) => customer.id === id)
    ).length;
  }, [audience, reachableCustomers, debtorCustomers, selectedIds]);

  const canSend =
    twilioConfigured && whatsappEnabled && recipientCount > 0 && message.trim().length > 0;

  function toggleCustomer(customerId: string) {
    setSelectedIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      const response = await sendCustomerBroadcast({
        message: message.trim(),
        audience,
        customerIds: audience === "selected" ? selectedIds : undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.success) {
        setResult({
          sent: response.sent ?? 0,
          failed: response.failed ?? 0,
          total: response.total ?? 0,
          failures: response.failures ?? [],
        });
      }
    });
  }

  return (
    <>
      <Header
        title="Customer broadcast"
        subtitle="Send a WhatsApp message to multiple customers"
      />
      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 mobile-page">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>

        {(!twilioConfigured || !whatsappEnabled) && (
          <Card className="border-amber-200 bg-amber-50/80">
            <CardContent className="p-4 text-sm text-amber-900 space-y-2">
              <p className="font-medium">WhatsApp sending is not ready</p>
              {!twilioConfigured && (
                <p>
                  Configure Twilio in your environment variables, then enable
                  WhatsApp AI on the{" "}
                  <Link href="/whatsapp" className="underline font-medium">
                    WhatsApp page
                  </Link>
                  .
                </p>
              )}
              {twilioConfigured && !whatsappEnabled && (
                <p>
                  Enable WhatsApp AI on the{" "}
                  <Link href="/whatsapp" className="underline font-medium">
                    WhatsApp page
                  </Link>{" "}
                  before sending broadcasts.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Compose message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(template.text)}
                    disabled={isPending}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isPending}
                  rows={6}
                  maxLength={1000}
                  placeholder="Write your broadcast message..."
                  className="flex w-full rounded-xl border border-input bg-white/90 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-biz-blue/30 disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{name}"} for the customer name and {"{business}"} for
                  your shop name. {message.length}/1000
                </p>
              </div>

              <div className="space-y-3">
                <Label>Audience</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="all"
                      checked={audience === "all"}
                      onChange={() => setAudience("all")}
                      disabled={isPending}
                    />
                    <div>
                      <p className="text-sm font-medium">All customers with phone</p>
                      <p className="text-xs text-muted-foreground">
                        {reachableCustomers.length} recipients
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="debtors"
                      checked={audience === "debtors"}
                      onChange={() => setAudience("debtors")}
                      disabled={isPending}
                    />
                    <div>
                      <p className="text-sm font-medium">Customers with debt</p>
                      <p className="text-xs text-muted-foreground">
                        {debtorCustomers.length} recipients
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="selected"
                      checked={audience === "selected"}
                      onChange={() => setAudience("selected")}
                      disabled={isPending}
                    />
                    <div>
                      <p className="text-sm font-medium">Select customers</p>
                      <p className="text-xs text-muted-foreground">
                        Choose from the list below
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {audience === "selected" && (
                <div className="space-y-2">
                  <Label>Select customers</Label>
                  <div className="max-h-64 overflow-y-auto rounded-xl border divide-y">
                    {reachableCustomers.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No customers with valid phone numbers.
                      </p>
                    ) : (
                      reachableCustomers.map((customer) => (
                        <label
                          key={customer.id}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(customer.id)}
                            onChange={() => toggleCustomer(customer.id)}
                            disabled={isPending}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {customer.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone}
                              {customer.debt > 0 &&
                                ` · owes ${formatCurrency(customer.debt, currency)}`}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}

              {result && (
                <div className="text-sm rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2 space-y-1">
                  <p>
                    Sent to {result.sent} of {result.total} customers.
                    {result.failed > 0 && ` ${result.failed} failed.`}
                  </p>
                  {result.failures.length > 0 && (
                    <ul className="text-xs space-y-1 pt-1">
                      {result.failures.map((failure) => (
                        <li key={failure.name}>
                          {failure.name}: {failure.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending || !canSend}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Send to {recipientCount} customer
                    {recipientCount === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
