import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SupplierSelectField({
  suppliers,
  defaultValue,
  disabled,
}: {
  suppliers: { id: string; name: string }[];
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="supplierId">Supplier</Label>
      <select
        id="supplierId"
        name="supplierId"
        disabled={disabled}
        defaultValue={defaultValue ?? ""}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-white/90 px-4 py-2 text-sm shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-biz-blue/30 disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <option value="">No supplier</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </select>
    </div>
  );
}
