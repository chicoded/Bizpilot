import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "narrow";
  actions?: React.ReactNode;
}

const maxWidthClass = {
  wide: "max-w-7xl",
  default: "max-w-4xl",
  narrow: "max-w-2xl",
} as const;

export function AppShell({
  title,
  subtitle,
  children,
  className,
  maxWidth = "wide",
  actions,
}: AppShellProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      {actions && (
        <div className="border-b border-border/40 bg-card/80 px-4 py-2 md:px-6">
          <div className={cn("mx-auto flex justify-end", maxWidthClass[maxWidth])}>
            {actions}
          </div>
        </div>
      )}
      <main
        id="main-content"
        className={cn(
          "p-4 md:p-6 mobile-page mx-auto",
          maxWidthClass[maxWidth],
          className
        )}
      >
        {children}
      </main>
    </>
  );
}
