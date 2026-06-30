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
import { BusinessProfileForm } from "@/features/settings/business-profile-form";
import { TeamPanel } from "@/features/settings/team-panel";
import { canChangeRoles, canManageTeam } from "@/lib/auth";
import {
  getTeamMembers,
  getPendingInvites,
  inviteableRolesFor,
} from "@/lib/team";

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

  const [members, pendingInvites] = await Promise.all([
    getTeamMembers(ctx.businessId),
    getPendingInvites(ctx.businessId),
  ]);

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
          <CardContent className="space-y-4">
            <BusinessProfileForm
              business={{
                name: ctx.business.name,
                industry: ctx.business.industry,
                currency: ctx.business.currency,
                address: ctx.business.address,
                phone: ctx.business.phone,
              }}
            />
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
            <TeamPanel
              members={members}
              pendingInvites={pendingInvites}
              currentUserId={ctx.userId}
              canManage={canManageTeam(ctx.role)}
              canChangeRoles={canChangeRoles(ctx.role)}
              inviteableRoles={inviteableRolesFor(ctx.role)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All sections</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/inventory", label: "Inventory" },
              { href: "/sales", label: "Sales" },
              { href: "/expenses", label: "Expenses" },
              { href: "/customers", label: "Customers" },
              { href: "/debts", label: "Debts" },
              { href: "/reports", label: "Reports" },
              { href: "/suppliers", label: "Suppliers" },
              { href: "/whatsapp", label: "WhatsApp AI" },
              { href: "/ai", label: "AI Assistant" },
              { href: "/menu", label: "Full menu" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium hover:bg-accent transition-colors touch-manipulation active:scale-[0.99]"
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
