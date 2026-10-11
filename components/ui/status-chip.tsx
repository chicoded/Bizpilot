import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const variantStyles = {
  default:
    "bg-muted/50 text-muted-foreground hover:bg-muted border-muted/30",
  warning:
    "bg-warning/15 text-warning-foreground hover:bg-warning/25 border-warning/20",
  danger:
    "bg-destructive/10 text-destructive hover:bg-destructive/15 border-destructive/20",
  info: "bg-info/10 text-info hover:bg-info/15 border-info/20",
  success:
    "bg-success/10 text-success hover:bg-success/15 border-success/20",
} as const;

type StatusVariant = keyof typeof variantStyles;

interface StatusChipProps {
  icon?: LucideIcon;
  label?: string;
  href?: string;
  variant?: StatusVariant;
  className?: string;
  children?: ReactNode;
}

export function StatusChip({
  icon: Icon,
  label,
  href,
  variant = "default",
  className,
  children,
}: StatusChipProps) {
  const styles = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    variantStyles[variant],
    className
  );

  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {label ?? children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        {content}
      </Link>
    );
  }

  return <span className={styles}>{content}</span>;
}
