import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shouldUseRushPos } from "@/lib/rush-pos/constants";
import { RushInsightsClient } from "@/features/rush-pos/rush-insights-client";

export const dynamic = "force-dynamic";

export default async function RushInsightsPage() {
  const ctx = await requirePageAccess("sales");
  const settings = await prisma.restaurantSettings
    .findUnique({ where: { businessId: ctx.businessId } })
    .catch(() => null);

  if (!shouldUseRushPos(ctx.business.industry, settings)) {
    redirect("/sales");
  }

  return <RushInsightsClient />;
}
