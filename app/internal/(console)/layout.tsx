import { requireInternalAdmin } from "@/lib/internal/auth";
import { InternalShell } from "@/components/internal/internal-shell";

export default async function InternalConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireInternalAdmin();

  return (
    <InternalShell role={admin.role} email={admin.email}>
      {children}
    </InternalShell>
  );
}
