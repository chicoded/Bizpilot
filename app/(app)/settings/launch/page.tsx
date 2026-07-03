import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { requirePageAccess } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { getAppUrl } from "@/lib/env";
import { SettingsShell } from "@/components/layout/settings-shell";
import { LaunchQaChecklist } from "@/features/launch/launch-qa-checklist";
import {
  EnvStatusPanel,
  getEnvStatus,
} from "@/features/launch/env-status-panel";
import { MonitoringSetupPanel } from "@/features/launch/monitoring-setup-panel";
import { getMonitoringStatus } from "@/lib/monitoring";

export default async function SettingsLaunchPage() {
  const ctx = await requirePageAccess("settings");

  if (ctx.role !== Role.OWNER) {
    redirect("/settings/profile");
  }

  const envStatus = getEnvStatus();
  const monitoringStatus = getMonitoringStatus();

  return (
    <SettingsShell
      title="Settings"
      subtitle="Pre-launch checklist"
      isOwner
      canAccessBilling={canAccessSection(
        ctx.role,
        ctx.business.rolePermissions,
        "billing",
        ctx.sectionOverrides
      )}
    >
      <EnvStatusPanel items={envStatus} />
      <MonitoringSetupPanel services={monitoringStatus} />
      <LaunchQaChecklist
        businessId={ctx.businessId}
        appUrl={getAppUrl()}
      />
    </SettingsShell>
  );
}
