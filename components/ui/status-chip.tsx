import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const variantStyles = {
  warning:
    "bg-warning/15 text-warning-foreground hover:bg-warning/25 border-warning/20",
  danger:
    "bg-destructive/10 text-destructive hover:bg-destructive/15 border-destructive/20",
  info: "bg-info/10 text-info hover:bg-info/15 border-info/20",
  success:
    "bg-success/10 text-success hover:bg-success/15 border-success/20",
} as const;

interface StatusChipProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  variant?: keyof typeof variantStyles;
  className?: string;
}

export function StatusChip({
  icon: Icon,
  label,
  href,
  variant = "warning",
  className,
}: StatusChipProps) {
  const styles = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    variantStyles[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <span className={styles}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
