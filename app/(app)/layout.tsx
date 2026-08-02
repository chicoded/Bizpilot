import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getBusinessContext } from "@/lib/auth";
import { userOnlyHasAbandonedShops } from "@/lib/empty-shop";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AccessGuard } from "@/components/layout/access-guard";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { AnalyticsIdentity } from "@/components/monitoring/analytics-identity";

/**
 * Nothing under (app) may be prerendered at build time.
 *
 * Every page in this group is behind sign-in and reads a live business context,
 * so a static shell is worthless at best. It is also actively fragile: Next
 * tried to prerender /sales/kitchen during a build where the Clerk key was not
 * present yet, Clerk threw "Missing publishableKey", and the whole build died —
 * on a page that can never be served statically anyway.
 *
 * Declared on the layout because route segment config cascades: one line here
 * covers all twenty-odd pages, and a new page added tomorrow inherits it rather
 * than having to remember.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const ctx = await getBusinessContext();

  if (!ctx) {
    redirect("/onboarding");
  }

  // Removed from a team but still stuck on an empty personal shell shop.
  if (userId && (await userOnlyHasAbandonedShops(userId))) {
    redirect("/onboarding");
  }

  if (ctx.business.suspendedAt) {
    redirect("/account-suspended");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xl focus:bg-biz-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AccessGuard
        role={ctx.role}
        rolePermissions={ctx.business.rolePermissions}
        sectionOverrides={ctx.sectionOverrides}
      />
      <Sidebar
        businessName={ctx.business.name}
        role={ctx.role}
        rolePermissions={ctx.business.rolePermissions}
        sectionOverrides={ctx.sectionOverrides}
        industry={ctx.business.industry}
      />
      <div className="md:pl-64">{children}</div>
      <MobileNav
        role={ctx.role}
        rolePermissions={ctx.business.rolePermissions}
        sectionOverrides={ctx.sectionOverrides}
      />
      <InstallPrompt />
      <AnalyticsIdentity />
      <div className="h-[4.5rem] md:hidden" />
    </div>
  );
}
