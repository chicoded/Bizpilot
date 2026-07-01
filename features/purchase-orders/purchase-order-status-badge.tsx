import { cn } from "@/lib/utils";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders";

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  requested: "bg-amber-100 text-amber-800",
  ordered: "bg-blue-100 text-blue-800",
  received: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
  pending: "bg-slate-100 text-slate-700",
};

export function PurchaseOrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = (status in PURCHASE_ORDER_STATUS_LABELS
    ? status
    : "pending") as PurchaseOrderStatus;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[key],
        className
      )}
    >
      {PURCHASE_ORDER_STATUS_LABELS[key]}
    </span>
  );
}
