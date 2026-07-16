"use client";

import { PRODUCT_TYPES, type ProductTypeValue } from "@/lib/product-types";
import { cn } from "@/lib/utils";

export function ProductTypePicker({
  value,
  onChange,
}: {
  value: ProductTypeValue;
  onChange: (value: ProductTypeValue) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Choose product type</p>
      <div className="grid grid-cols-2 gap-2">
        {PRODUCT_TYPES.map((type) => {
          const selected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition touch-manipulation",
                selected
                  ? "border-biz-blue bg-biz-blue/10 ring-1 ring-biz-blue"
                  : "border-border hover:bg-accent"
              )}
            >
              <span className="text-lg leading-none">{type.emoji}</span>
              <p className="mt-1 text-sm font-semibold">{type.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {type.description}
              </p>
            </button>
          );
        })}
      </div>
      <input type="hidden" name="productType" value={value} />
    </div>
  );
}
