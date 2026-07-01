import { requirePageAccess } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { SettingsShell } from "@/components/layout/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { BusinessProfileForm } from "@/features/settings/business-profile-form";

export default async function SettingsProfilePage() {
  const ctx = await requirePageAccess("settings");

  return (
    <SettingsShell
      title="Settings"
      subtitle="Business profile"
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
            <Building2 className="h-5 w-5" />
            Business profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm
            business={{
              name: ctx.business.name,
              industry: ctx.business.industry,
              currency: ctx.business.currency,
              address: ctx.business.address,
              phone: ctx.business.phone,
            }}
          />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
