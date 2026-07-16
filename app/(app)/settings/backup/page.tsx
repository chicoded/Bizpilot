import { Suspense } from "react";
import { requirePageAccess } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { SettingsShell } from "@/components/layout/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";
import { BackupSettingsPanel } from "@/features/settings/backup-settings-panel";
import { HardwareTipsCard } from "@/features/settings/hardware-tips-card";

export default async function SettingsBackupPage() {
  const ctx = await requirePageAccess("settings");

  return (
    <SettingsShell
      title="Settings"
      subtitle="Backup & storage"
      isOwner={ctx.role === "OWNER"}
      canAccessBilling={canAccessSection(
        ctx.role,
        ctx.business.rolePermissions,
        "billing",
        ctx.sectionOverrides
      )}
    >
      <div className="space-y-4">
        <HardwareTipsCard />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-5 w-5" />
              Device storage & Gmail backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">
                  Loading backup settings…
                </p>
              }
            >
              <BackupSettingsPanel />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </SettingsShell>
  );
}
