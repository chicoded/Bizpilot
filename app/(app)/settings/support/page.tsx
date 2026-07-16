import { requirePageAccess } from "@/lib/auth";
import { canAccessSection } from "@/lib/permissions";
import { SettingsShell } from "@/components/layout/settings-shell";
import { SupportBugReportForm } from "@/features/support/support-bug-report-form";
import { getSupportContacts } from "@/lib/support-contact";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Mail } from "lucide-react";

export default async function SettingsSupportPage() {
  const ctx = await requirePageAccess("settings");
  const contacts = getSupportContacts();

  return (
    <SettingsShell
      title="Settings"
      subtitle="Help & support"
      isOwner={ctx.role === "OWNER"}
      canAccessBilling={canAccessSection(
        ctx.role,
        ctx.business.rolePermissions,
        "billing",
        ctx.sectionOverrides
      )}
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Need help?</p>
            <p>
              Report bugs from here — they appear in our ops inbox. You can also
              reach us on WhatsApp or email.
            </p>
            <ul className="space-y-2">
              {contacts.whatsapp && (
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  WhatsApp: {contacts.whatsapp}
                </li>
              )}
              {contacts.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-biz-blue" />
                  Email: {contacts.email}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <SupportBugReportForm
          businessName={ctx.business.name}
          whatsappConfigured={contacts.hasWhatsApp}
          emailConfigured={contacts.hasEmail}
          supportEmail={contacts.email}
          supportWhatsAppDisplay={contacts.whatsapp}
        />
      </div>
    </SettingsShell>
  );
}
