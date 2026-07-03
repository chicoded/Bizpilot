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
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-brand" />
            Role permissions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set defaults per role. Customize individual members on the{" "}
            <a href="/settings/team" className="text-brand font-medium hover:underline">
              Team
            </a>{" "}
            page.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <AccessControlPanel permissions={rolePermissions} />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
