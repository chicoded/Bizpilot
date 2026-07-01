import { getBusinessContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { MenuNavList } from "@/features/menu/menu-nav-list";
import { DeniedAccessBanner } from "@/features/menu/denied-access-banner";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: Promise<{ denied?: string }>;
}) {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const params = searchParams ? await searchParams : {};

  return (
    <AppShell title="Menu" subtitle="Go to any section" maxWidth="narrow">
      {params.denied === "1" && <DeniedAccessBanner />}
      <MenuNavList
        role={ctx.role}
        rolePermissions={ctx.business.rolePermissions ?? null}
        sectionOverrides={ctx.sectionOverrides}
      />
    </AppShell>
  );
}
