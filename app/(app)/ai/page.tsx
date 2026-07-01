import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { AIChat } from "@/features/ai/ai-chat";
import { UpgradePrompt } from "@/features/billing/upgrade-prompt";
import { canAccessFeature, getRequiredPlanForFeature } from "@/lib/subscription";
import { isAIProviderConfigured } from "@/ai/assistant";

export default async function AIPage() {
  const ctx = await requirePageAccess("ai");

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });

  const hasAccess = canAccessFeature(subscription, "ai");
  const providerConfigured = isAIProviderConfigured();

  return (
    <AppShell
      title="AI Assistant"
      subtitle={
        providerConfigured
          ? "Powered by Google Gemini (free tier)"
          : "Offline mode — add GEMINI_API_KEY for free AI"
      }
      maxWidth="default"
      className={hasAccess ? "p-0 md:p-0 max-w-none" : undefined}
    >
      {!hasAccess ? (
        <div className="p-4 md:p-6">
          <UpgradePrompt
            feature="AI Assistant"
            requiredPlan={getRequiredPlanForFeature("ai")}
          />
        </div>
      ) : (
        <AIChat providerConfigured={providerConfigured} />
      )}
    </AppShell>
  );
}
