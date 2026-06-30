import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { AppNavLink } from "@/components/layout/app-nav-link";
import { mainNavItems } from "@/lib/app-navigation";

export default async function MenuPage() {
  const ctx = await getBusinessContext();
  if (!ctx) redirect("/onboarding");

  return (
    <>
      <Header title="Menu" subtitle="Go to any section" />
      <main className="p-4 md:p-6 max-w-lg mx-auto space-y-2 mobile-page">
        {mainNavItems
          .filter((item) => item.href !== "/dashboard")
          .map((item) => (
            <AppNavLink key={item.href} item={item} variant="menu" />
          ))}
      </main>
    </>
  );
}
