import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { parseRolePermissions } from "@/lib/permissions";
import { SettingsShell } from "@/components/layout/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { AccessControlPanel } from "@/features/settings/access-control-panel";

export default async function SettingsAccessPage() {
  const ctx = await requirePageAccess("settings");

  if (ctx.role !== Role.OWNER) {
    redirect("/settings/profile");
  }

  const rolePermissions = parseRolePermissions(ctx.business.rolePermissions);

  return (
    <SettingsShell
      title="Settings"
      subtitle="Page access"
      isOwner
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
            <Shield className="h-5 w-5" />
            Role permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AccessControlPanel permissions={rolePermissions} />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
