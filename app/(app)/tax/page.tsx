import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { getTaxDashboard, ensureTaxProfile } from "@/services/tax";
import { TaxDashboardView } from "@/features/tax/tax-dashboard-view";
import { Settings } from "lucide-react";

export default async function TaxPage() {
  const ctx = await requirePageAccess("tax");

  await ensureTaxProfile(ctx.businessId);

  const data = await getTaxDashboard(ctx.businessId);

  return (
    <>
      <Header
        title="Tax & Compliance"
        subtitle="Estimates from your sales & expenses"
      />
      <main className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 mobile-page">
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/tax/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
        <TaxDashboardView data={data} currency={ctx.business.currency} />
      </main>
    </>
  );
}
