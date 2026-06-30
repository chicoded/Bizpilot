import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { Header } from "@/components/layout/header";
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
    <>
      <Header title="Menu" subtitle="Go to any section" />
      <main className="p-4 md:p-6 max-w-lg mx-auto space-y-2 mobile-page">
        {params.denied === "1" && <DeniedAccessBanner />}
        <MenuNavList
          role={ctx.role}
          rolePermissions={ctx.business.rolePermissions ?? null}
        />
      </main>
    </>
  );
}
