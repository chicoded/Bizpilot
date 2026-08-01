import { notFound } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { hasCapability } from "@/lib/industries";
import { getControlledRegister } from "@/lib/pharmacy/controlled-register";
import { AppShell } from "@/components/layout/app-shell";
import { ControlledRegisterView } from "@/features/pharmacy/controlled-register-view";

export const dynamic = "force-dynamic";

export default async function PrescriptionsPage() {
  const ctx = await requirePageAccess("prescriptions");

  // The nav hides this for other trades, but a typed URL must not reach it.
  // Guarding on the capability rather than on the industry name means a trade
  // that later gains the capability needs no change here.
  if (!hasCapability(ctx.business.industry, "controlled_register")) {
    notFound();
  }

  const register = await getControlledRegister(ctx.businessId);

  return (
    <AppShell
      title="Controlled register"
      subtitle="Every movement of controlled stock, with a running balance"
    >
      <ControlledRegisterView register={register} />
    </AppShell>
  );
}
