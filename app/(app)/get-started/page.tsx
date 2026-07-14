import { requirePageAccess } from "@/lib/auth";
import { getGetStartedProgress } from "@/lib/get-started-progress";
import { AppShell } from "@/components/layout/app-shell";
import { GetStartedChecklist } from "@/features/get-started/get-started-checklist";

export default async function GetStartedPage() {
  const ctx = await requirePageAccess("dashboard");
  const progress = await getGetStartedProgress(ctx.businessId);

  return (
    <AppShell
      title="Get started"
      subtitle={`Welcome to Zaplex, ${ctx.business.name}`}
      maxWidth="default"
    >
      <GetStartedChecklist progress={progress} />
    </AppShell>
  );
}
