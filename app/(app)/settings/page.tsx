import { redirect } from "next/navigation";
import Link from "next/link";
import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSubscriptionStatus,
  getDaysRemaining,
  isSubscriptionActive,
} from "@/lib/subscription";
import { getPlanDetails } from "@/lib/subscription";
import { Building2, CreditCard, Users, ChevronRight } from "lucide-react";

export default async function SettingsPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });

  const plan = subscription
    ? getPlanDetails(subscription.plan)
    : getPlanDetails("STARTER");
  const daysLeft = getDaysRemaining(subscription);
  const active = isSubscriptionActive(subscription);

  return (
    <>
      <Header title="Settings" />
      <main className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5" />
              Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{ctx.business.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry</span>
              <span className="font-medium">{ctx.business.industry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{ctx.business.currency}</span>
            </div>
          </CardContent>
        </Card>

        <Link href="/settings/billing">
          <Card className="hover:shadow-glass transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-biz-blue/10">
                  <CreditCard className="h-5 w-5 text-biz-blue" />
                </div>
                <div>
                  <p className="font-semibold">{plan.name} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription
                      ? formatSubscriptionStatus(subscription.status)
                      : "Trial"}
                    {daysLeft > 0 && ` · ${daysLeft} days left`}
                    {!active && " · Action required"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Invite managers, cashiers, and staff. Coming soon.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
