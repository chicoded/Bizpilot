import { requirePageAccess } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { SettingsShell } from "@/components/layout/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { TeamSyncStatus } from "@/features/sales/team-sync-status";

export default async function SettingsSyncPage() {
  const ctx = await requirePageAccess("settings");

  return (
    <SettingsShell
      title="Settings"
      subtitle="Team sync"
      isOwner={ctx.role === "OWNER"}
      canAccessBilling={canAccessSection(
        ctx.role,
        ctx.business.rolePermissions,
        "billing",
        ctx.sectionOverrides
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-5 w-5" />
            Team catalog & sales sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Products and sales sync to the shared cloud database in the
            background. Use this page if a device looks out of date.
          </p>
          <TeamSyncStatus />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
