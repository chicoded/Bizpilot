import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { TaxProfileForm } from "@/features/tax/tax-profile-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ensureTaxProfile } from "@/services/tax";

export default async function TaxSettingsPage() {
  const ctx = await requirePageAccess("tax");

  await ensureTaxProfile(ctx.businessId);
  const profile = await prisma.businessTaxProfile.findUnique({
    where: { businessId: ctx.businessId },
  });

  return (
    <>
      <Header title="Tax settings" subtitle="Configure your tax profile" />
      <main className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 mobile-page">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href="/tax">
            <ArrowLeft className="h-4 w-4" />
            Back to tax dashboard
          </Link>
        </Button>
        <TaxProfileForm profile={profile} />
      </main>
    </>
  );
}
