import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { AIChat } from "@/features/ai/ai-chat";
import { UpgradePrompt } from "@/features/billing/upgrade-prompt";
import { canAccessFeature } from "@/lib/subscription";
import { getRequiredPlanForFeature } from "@/lib/subscription";

export default async function AIPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });

  const hasAccess = canAccessFeature(subscription, "ai");

  return (
    <>
      <Header title="AI Assistant" subtitle="Your business advisor" />
      {!hasAccess ? (
        <main className="p-4 md:p-6 max-w-3xl mx-auto">
          <UpgradePrompt
            feature="AI Assistant"
            requiredPlan={getRequiredPlanForFeature("ai")}
          />
        </main>
      ) : (
        <AIChat />
      )}
    </>
  );
}
