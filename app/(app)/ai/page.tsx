import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { AIChat } from "@/features/ai/ai-chat";
import { UpgradePrompt } from "@/features/billing/upgrade-prompt";
import { canAccessFeature } from "@/lib/subscription";
import { getRequiredPlanForFeature } from "@/lib/subscription";
import { isAIProviderConfigured } from "@/ai/assistant";

export default async function AIPage() {
  const ctx = await requirePageAccess("ai");

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });

  const hasAccess = canAccessFeature(subscription, "ai");
  const providerConfigured = isAIProviderConfigured();

  return (
    <>
      <Header
        title="AI Assistant"
        subtitle={
          providerConfigured
            ? "Powered by Google Gemini (free tier)"
            : "Offline mode — add GEMINI_API_KEY for free AI"
        }
      />
      {!hasAccess ? (
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <UpgradePrompt
            feature="AI Assistant"
            requiredPlan={getRequiredPlanForFeature("ai")}
          />
        </main>
      ) : (
        <AIChat providerConfigured={providerConfigured} />
      )}
    </>
  );
}
