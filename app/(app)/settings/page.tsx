import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSubscriptionStatus,
  getDaysRemaining,
  isSubscriptionActive,
} from "@/lib/subscription";
import { getPlanDetails } from "@/lib/subscription";
import { Building2, CreditCard, Users, ChevronRight, Shield } from "lucide-react";
import { BusinessProfileForm } from "@/features/settings/business-profile-form";
import { TeamPanel } from "@/features/settings/team-panel";
import { AccessControlPanel } from "@/features/settings/access-control-panel";
import { canChangeRoles, canManageTeam, requirePageAccess } from "@/lib/auth";
import {
  getTeamMembers,
  getPendingInvites,
  inviteableRolesFor,
} from "@/lib/team";
import { parseRolePermissions, filterNavItemsByAccess, canAccessSection } from "@/lib/permissions";
import { mainNavItems } from "@/lib/app-navigation";

export default async function SettingsPage() {
  const ctx = await requirePageAccess("settings");

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

  const rolePermissions = parseRolePermissions(ctx.business.rolePermissions);
  const sectionLinks = filterNavItemsByAccess(
    mainNavItems,
    ctx.role,
    ctx.business.rolePermissions,
    ctx.sectionOverrides
  ).filter((item) => item.href !== "/settings");

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

        {canAccessSection(
          ctx.role,
          ctx.business.rolePermissions,
          "billing",
          ctx.sectionOverrides
        ) && (
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
        )}

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
              canCustomizeMemberAccess={ctx.role === Role.OWNER}
              rolePermissions={rolePermissions}
              inviteableRoles={inviteableRolesFor(ctx.role)}
            />
          </CardContent>
        </Card>

        {ctx.role === Role.OWNER && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                Page access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccessControlPanel permissions={rolePermissions} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All sections</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {sectionLinks.map((link) => (
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
            <Link
              href="/menu"
              prefetch
              className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium hover:bg-accent transition-colors touch-manipulation active:scale-[0.99]"
            >
              Full menu
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
