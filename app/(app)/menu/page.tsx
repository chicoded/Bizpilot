import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { AppNavLink } from "@/components/layout/app-nav-link";
import { mainNavItems } from "@/lib/app-navigation";
import { filterNavItemsByAccess } from "@/lib/permissions";
import { DeniedAccessBanner } from "@/features/menu/denied-access-banner";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  const params = await searchParams;
  const navItems = filterNavItemsByAccess(
    mainNavItems,
    ctx.role,
    ctx.business.rolePermissions
  ).filter((item) => item.href !== "/dashboard");

  return (
    <>
      <Header title="Menu" subtitle="Go to any section" />
      <main className="p-4 md:p-6 max-w-lg mx-auto space-y-2 mobile-page">
        {params.denied === "1" && <DeniedAccessBanner />}
        {navItems.map((item) => (
          <AppNavLink key={item.href} item={item} variant="menu" />
        ))}
      </main>
    </>
  );
}
