import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AccessGuard } from "@/components/layout/access-guard";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { AnalyticsIdentity } from "@/components/monitoring/analytics-identity";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getBusinessContext();

  if (!ctx) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
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
      />
      <div className="md:pl-64">
        {children}
      </div>
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
