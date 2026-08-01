import { requireBusinessContext } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SurveyForm } from "@/features/survey/survey-form";

export const dynamic = "force-dynamic";

/**
 * Guarded by business context rather than by a section permission: anyone who
 * works in the shop may have something worth saying, including a cashier whose
 * role does not reach Settings.
 */
export default async function SurveyPage() {
  await requireBusinessContext();

  return (
    <AppShell
      title="Tell us what is not working"
      subtitle="Seven questions about your shop — answer any of them"
      maxWidth="narrow"
    >
      <SurveyForm />
    </AppShell>
  );
}
