import { AlertTriangle, Info } from "lucide-react";
import { TAX_DISCLAIMER, TAX_DISCLAIMER_SHORT } from "@/lib/tax/constants";
import { cn } from "@/lib/utils";

interface TaxDisclaimerProps {
  variant?: "banner" | "inline";
  className?: string;
}

export function TaxDisclaimer({
  variant = "banner",
  className,
}: TaxDisclaimerProps) {
  if (variant === "inline") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {TAX_DISCLAIMER_SHORT}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950",
        className
      )}
      role="note"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <p>{TAX_DISCLAIMER}</p>
    </div>
  );
}

export function TaxInsightIcon({ type }: { type: "info" | "warning" | "danger" }) {
  if (type === "danger" || type === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
  }
  return <Info className="h-4 w-4 text-biz-blue shrink-0" />;
}
