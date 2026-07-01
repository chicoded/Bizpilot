import { Header } from "@/components/layout/header";
import { SettingsNav } from "@/components/layout/settings-nav";
import { cn } from "@/lib/utils";

interface SettingsShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isOwner: boolean;
  canAccessBilling: boolean;
  className?: string;
}

export function SettingsShell({
  title,
  subtitle,
  children,
  isOwner,
  canAccessBilling,
  className,
}: SettingsShellProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="mx-auto max-w-5xl p-4 md:p-6 mobile-page">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="md:sticky md:top-20 md:self-start">
            <SettingsNav isOwner={isOwner} canAccessBilling={canAccessBilling} />
          </aside>
          <main id="main-content" className={cn("space-y-4 min-w-0", className)}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
