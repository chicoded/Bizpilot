import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { getWhatsAppSettings } from "@/actions/whatsapp";
import { getWhatsAppMessages } from "@/services/whatsapp";
import { WhatsAppSettingsForm } from "@/features/whatsapp/whatsapp-settings-form";
import { WhatsAppSimulator } from "@/features/whatsapp/whatsapp-simulator";
import { MessageLog } from "@/features/whatsapp/message-log";
import { UpgradePrompt } from "@/features/billing/upgrade-prompt";
import { canAccessFeature, getRequiredPlanForFeature } from "@/lib/subscription";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Zap, Package, Clock, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function WhatsAppPage() {
  const ctx = await requirePageAccess("whatsapp");

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });
  const hasAccess = canAccessFeature(subscription, "whatsapp");

  const [settings, messages] = await Promise.all([
    getWhatsAppSettings(),
    getWhatsAppMessages(ctx.businessId),
  ]);

  const features = [
    {
      icon: Package,
      title: "Stock queries",
      desc: '"Do you have Paracetamol?" → instant availability + price',
    },
    {
      icon: Clock,
      title: "Opening hours",
      desc: "Customers ask when you're open",
    },
    {
      icon: Zap,
      title: "Debt reminders",
      desc: "Known customers can check their balance",
    },
  ];

  return (
    <>
      <Header
        title="WhatsApp AI"
        subtitle="AI shop assistant for your customers"
      />
      <main className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {!hasAccess && (
          <UpgradePrompt
            feature="WhatsApp AI"
            requiredPlan={getRequiredPlanForFeature("whatsapp")}
          />
        )}

        {/* Hero */}
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-biz-blue">
                  Your AI shop assistant on WhatsApp
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Customers message your shop on WhatsApp. AI checks inventory
                  and replies instantly — 24/7, even when you&apos;re busy.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl bg-white/80 p-3 border border-emerald-100"
                >
                  <f.icon className="h-4 w-4 text-emerald-600 mb-1" />
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <WhatsAppSettingsForm
            config={settings.config}
            webhookUrl={settings.webhookUrl}
            twilioConfigured={settings.twilioConfigured}
          />
          <WhatsAppSimulator twilioConfigured={settings.twilioConfigured} />
        </div>

        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-emerald-600" />
                Customer broadcasts
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Send promotions, stock updates, or debt reminders to customers on
                WhatsApp.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/customers/broadcast">Open broadcast</Link>
            </Button>
          </CardContent>
        </Card>

        <MessageLog messages={messages} />
      </main>
    </>
  );
}
