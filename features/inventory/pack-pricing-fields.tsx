"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  packPriceFromUnit,
  roundMoney,
  unitPriceFromPack,
} from "@/lib/pack-pricing";

type PriceEntryMode = "unit" | "pack";

interface PackPricingFieldsProps {
  defaultPurchasePrice?: number;
  defaultSellingPrice?: number;
  defaultUnitsPerPack?: number;
  disabled?: boolean;
}

export function PackPricingFields({
  defaultPurchasePrice = 0,
  defaultSellingPrice = 0,
  defaultUnitsPerPack = 1,
  disabled = false,
}: PackPricingFieldsProps) {
  const initialUnits = defaultUnitsPerPack > 1 ? defaultUnitsPerPack : 10;
  const [usePacks, setUsePacks] = useState(defaultUnitsPerPack > 1);
  const [unitsPerPack, setUnitsPerPack] = useState(initialUnits);
  const [mode, setMode] = useState<PriceEntryMode>("unit");
  const [unitCost, setUnitCost] = useState(defaultPurchasePrice);
  const [unitPrice, setUnitPrice] = useState(defaultSellingPrice);
  const [packCost, setPackCost] = useState(() =>
    packPriceFromUnit(defaultPurchasePrice, initialUnits)
  );
  const [packPrice, setPackPrice] = useState(() =>
    packPriceFromUnit(defaultSellingPrice, initialUnits)
  );

  const effectiveUnits = usePacks ? Math.max(2, unitsPerPack) : 1;

  const summary = useMemo(() => {
    if (!usePacks) return null;
    return {
      unitCost: roundMoney(unitCost),
      unitPrice: roundMoney(unitPrice),
      packCost: packPriceFromUnit(unitCost, effectiveUnits),
      packPrice: packPriceFromUnit(unitPrice, effectiveUnits),
    };
  }, [usePacks, unitCost, unitPrice, effectiveUnits]);

  function handleUnitsChange(raw: string) {
    const next = Math.max(2, parseInt(raw, 10) || 2);
    setUnitsPerPack(next);
    if (mode === "pack") {
      setUnitCost(unitPriceFromPack(packCost, next));
      setUnitPrice(unitPriceFromPack(packPrice, next));
    } else {
      setPackCost(packPriceFromUnit(unitCost, next));
      setPackPrice(packPriceFromUnit(unitPrice, next));
    }
  }

  function handlePackCostChange(raw: string) {
    const next = parseFloat(raw) || 0;
    setPackCost(next);
    setUnitCost(unitPriceFromPack(next, effectiveUnits));
  }

  function handlePackPriceChange(raw: string) {
    const next = parseFloat(raw) || 0;
    setPackPrice(next);
    setUnitPrice(unitPriceFromPack(next, effectiveUnits));
  }

  function handleUnitCostChange(raw: string) {
    const next = parseFloat(raw) || 0;
    setUnitCost(next);
    setPackCost(packPriceFromUnit(next, effectiveUnits));
  }

  function handleUnitPriceChange(raw: string) {
    const next = parseFloat(raw) || 0;
    setUnitPrice(next);
    setPackPrice(packPriceFromUnit(next, effectiveUnits));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <input type="hidden" name="unitsPerPack" value={effectiveUnits} />
      <input type="hidden" name="purchasePrice" value={roundMoney(unitCost)} />
      <input type="hidden" name="sellingPrice" value={roundMoney(unitPrice)} />

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={usePacks}
          disabled={disabled}
          onChange={(e) => setUsePacks(e.target.checked)}
        />
        <span>
          <span className="text-sm font-medium">Sold in packs</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            e.g. medicine with 10 sachets per pack — enter cost or price per pack
            or per unit
          </span>
        </span>
      </label>

      {usePacks && (
        <>
          <div className="space-y-2">
            <Label htmlFor="unitsPerPackInput">Units per pack</Label>
            <Input
              id="unitsPerPackInput"
              type="number"
              min={2}
              step={1}
              value={unitsPerPack}
              disabled={disabled}
              onChange={(e) => handleUnitsChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Enter prices by</Label>
            <SegmentedControl
              options={[
                { value: "unit", label: "Per unit" },
                { value: "pack", label: "Per pack" },
              ]}
              value={mode}
              onChange={setMode}
              label="Price entry mode"
            />
          </div>

          {mode === "pack" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packCost">Pack cost (₦)</Label>
                <Input
                  id="packCost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={packCost}
                  disabled={disabled}
                  onChange={(e) => handlePackCostChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packPrice">Pack selling price (₦)</Label>
                <Input
                  id="packPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={packPrice}
                  disabled={disabled}
                  onChange={(e) => handlePackPriceChange(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit cost (₦)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitCost}
                  disabled={disabled}
                  onChange={(e) => handleUnitCostChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit selling price (₦)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitPrice}
                  disabled={disabled}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {summary && (
            <p className="text-xs text-muted-foreground rounded-lg bg-background px-3 py-2 border border-border">
              Stored per unit for POS: cost ₦{summary.unitCost.toLocaleString()},{" "}
              sell ₦{summary.unitPrice.toLocaleString()}
              {mode === "unit" && (
                <>
                  {" "}
                  · Pack of {effectiveUnits}: ₦
                  {summary.packCost.toLocaleString()} cost / ₦
                  {summary.packPrice.toLocaleString()} sell
                </>
              )}
              {mode === "pack" && (
                <>
                  {" "}
                  · Per unit: ₦{summary.unitCost.toLocaleString()} cost / ₦
                  {summary.unitPrice.toLocaleString()} sell
                </>
              )}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Stock quantity is counted in single units (e.g. 3 packs of{" "}
            {effectiveUnits} = {effectiveUnits * 3} in quantity).
          </p>
        </>
      )}

      {!usePacks && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Cost price (₦)</Label>
            <Input
              id="purchasePrice"
              name="purchasePriceVisible"
              type="number"
              min={0}
              step={0.01}
              value={unitCost}
              disabled={disabled}
              onChange={(e) => handleUnitCostChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Selling price (₦)</Label>
            <Input
              id="sellingPrice"
              name="sellingPriceVisible"
              type="number"
              min={0}
              step={0.01}
              value={unitPrice}
              disabled={disabled}
              onChange={(e) => handleUnitPriceChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
