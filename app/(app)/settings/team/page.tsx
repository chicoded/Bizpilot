import { Role } from "@prisma/client";
import { requirePageAccess, canChangeRoles, canManageTeam } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { parseRolePermissions } from "@/lib/permissions";
import { getTeamMembers, getPendingInvites, inviteableRolesFor } from "@/lib/team";
import { SettingsShell } from "@/components/layout/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { TeamPanel } from "@/features/settings/team-panel";

export default async function SettingsTeamPage() {
  const ctx = await requirePageAccess("settings");

  const [members, pendingInvites] = await Promise.all([
    getTeamMembers(ctx.businessId),
    getPendingInvites(ctx.businessId),
  ]);

  const rolePermissions = parseRolePermissions(ctx.business.rolePermissions);

  return (
    <SettingsShell
      title="Settings"
      subtitle="Team members"
      isOwner={ctx.role === Role.OWNER}
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
            <Users className="h-5 w-5" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamPanel
            members={members}
            pendingInvites={pendingInvites}
            currentUserId={ctx.userId}
            canManage={canManageTeam(ctx.role)}
            canChangeRoles={canChangeRoles(ctx.role)}
            canCustomizeMemberAccess={ctx.role === Role.OWNER}
            rolePermissions={rolePermissions}
            inviteableRoles={inviteableRolesFor(ctx.role)}
          />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
