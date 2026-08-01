"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryPresets } from "@/lib/industries";

/**
 * Category input that offers the trade's own vocabulary.
 *
 * A pharmacy is offered Analgesics and Antimalarials; a boutique gets Footwear
 * and Bags. Deliberately still a free text field with a datalist rather than a
 * fixed select — shops invent their own shelf names and a closed list would
 * force them to file stock under a word they do not use.
 */
export function CategoryField({
  industry,
  defaultValue,
  disabled,
}: {
  industry: string | null | undefined;
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  const listId = useId();
  const presets = categoryPresets(industry).filter(
    // "Favorites" is a POS view, not somewhere you file a product.
    (preset) => preset.toLowerCase() !== "favorites"
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="category">Category</Label>
      <Input
        id="category"
        name="category"
        list={presets.length > 0 ? listId : undefined}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        placeholder={presets[0] ? `${presets[0]}, ${presets[1] ?? ""}…` : "Shelf or group"}
        autoComplete="off"
      />
      {presets.length > 0 && (
        <datalist id={listId}>
          {presets.map((preset) => (
            <option key={preset} value={preset} />
          ))}
        </datalist>
      )}
    </div>
  );
}
