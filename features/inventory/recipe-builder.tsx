"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LocalProduct, LocalRecipeLine } from "@/lib/local-db/types";
import { listRecipeComponents } from "@/lib/hybrid-inventory";
import { productTypeLabel } from "@/lib/product-types";
import { Plus, Trash2 } from "lucide-react";

export function RecipeBuilder({
  products,
  value,
  onChange,
}: {
  products: LocalProduct[];
  value: LocalRecipeLine[];
  onChange: (lines: LocalRecipeLine[]) => void;
}) {
  const components = useMemo(() => listRecipeComponents(products), [products]);
  const [componentId, setComponentId] = useState("");
  const [quantity, setQuantity] = useState("1");

  function addLine() {
    if (!componentId) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const existing = value.find((l) => l.componentId === componentId);
    if (existing) {
      onChange(
        value.map((l) =>
          l.componentId === componentId
            ? { ...l, quantity: l.quantity + qty }
            : l
        )
      );
    } else {
      onChange([...value, { componentId, quantity: qty }]);
    }
    setQuantity("1");
  }

  function removeLine(id: string) {
    onChange(value.filter((l) => l.componentId !== id));
  }

  const nameById = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return map;
  }, [products]);

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
      <div>
        <Label>Recipe builder</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Add ingredients and packaging deducted when this menu item is sold.
        </p>
      </div>

      {components.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Add Ingredient or Packaging products first, then come back to build
          the recipe.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
          >
            <option value="">Select ingredient / packaging</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({productTypeLabel(c.productType)}
                {c.unit ? ` · ${c.unit}` : ""})
              </option>
            ))}
          </select>
          <Input
            type="text"
            inputMode="decimal"
            className="sm:w-24"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
          />
          <Button type="button" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((line) => {
            const component = nameById.get(line.componentId);
            return (
              <li
                key={line.componentId}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
              >
                <span>
                  {component?.name ?? "Unknown"}{" "}
                  <span className="text-muted-foreground">
                    × {line.quantity}
                    {component?.unit ? ` ${component.unit}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-500"
                  onClick={() => removeLine(line.componentId)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input type="hidden" name="recipeLines" value={JSON.stringify(value)} />
    </div>
  );
}
