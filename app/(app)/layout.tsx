import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
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
      <Sidebar businessName={ctx.business.name} />
      <div className="md:pl-64">
        {children}
      </div>
      <MobileNav />
      <InstallPrompt />
      <AnalyticsIdentity />
      <div className="h-[4.5rem] md:hidden" />
    </div>
  );
}
