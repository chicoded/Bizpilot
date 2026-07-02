"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  formatMoneyInput,
  packPriceFromUnit,
  parseMoneyInput,
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

function moneyFieldProps(disabled: boolean) {
  return {
    type: "text" as const,
    inputMode: "decimal" as const,
    autoComplete: "off",
    disabled,
    placeholder: "0",
  };
}

export function PackPricingFields({
  defaultPurchasePrice = 0,
  defaultSellingPrice = 0,
  defaultUnitsPerPack = 1,
  disabled = false,
}: PackPricingFieldsProps) {
  const isEditing = defaultPurchasePrice > 0 || defaultSellingPrice > 0;
  const showZero = isEditing;

  const initialUnits = defaultUnitsPerPack > 1 ? defaultUnitsPerPack : 10;
  const [usePacks, setUsePacks] = useState(defaultUnitsPerPack > 1);
  const [unitsPerPack, setUnitsPerPack] = useState(initialUnits);
  const [mode, setMode] = useState<PriceEntryMode>("unit");
  const [unitCostInput, setUnitCostInput] = useState(
    formatMoneyInput(defaultPurchasePrice, showZero)
  );
  const [unitPriceInput, setUnitPriceInput] = useState(
    formatMoneyInput(defaultSellingPrice, showZero)
  );
  const [packCostInput, setPackCostInput] = useState(
    formatMoneyInput(
      packPriceFromUnit(defaultPurchasePrice, initialUnits),
      showZero
    )
  );
  const [packPriceInput, setPackPriceInput] = useState(
    formatMoneyInput(
      packPriceFromUnit(defaultSellingPrice, initialUnits),
      showZero
    )
  );

  const unitCost = parseMoneyInput(unitCostInput);
  const unitPrice = parseMoneyInput(unitPriceInput);
  const packCost = parseMoneyInput(packCostInput);
  const packPrice = parseMoneyInput(packPriceInput);
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
    const parsed = parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.max(2, parsed) : 2;
    setUnitsPerPack(next);
    if (mode === "pack") {
      setUnitCostInput(formatMoneyInput(unitPriceFromPack(packCost, next), true));
      setUnitPriceInput(formatMoneyInput(unitPriceFromPack(packPrice, next), true));
    } else {
      setPackCostInput(formatMoneyInput(packPriceFromUnit(unitCost, next), true));
      setPackPriceInput(formatMoneyInput(packPriceFromUnit(unitPrice, next), true));
    }
  }

  function handlePackCostChange(raw: string) {
    setPackCostInput(raw);
    const next = parseMoneyInput(raw);
    setUnitCostInput(formatMoneyInput(unitPriceFromPack(next, effectiveUnits), raw !== ""));
  }

  function handlePackPriceChange(raw: string) {
    setPackPriceInput(raw);
    const next = parseMoneyInput(raw);
    setUnitPriceInput(formatMoneyInput(unitPriceFromPack(next, effectiveUnits), raw !== ""));
  }

  function handleUnitCostChange(raw: string) {
    setUnitCostInput(raw);
    const next = parseMoneyInput(raw);
    setPackCostInput(formatMoneyInput(packPriceFromUnit(next, effectiveUnits), raw !== ""));
  }

  function handleUnitPriceChange(raw: string) {
    setUnitPriceInput(raw);
    const next = parseMoneyInput(raw);
    setPackPriceInput(formatMoneyInput(packPriceFromUnit(next, effectiveUnits), raw !== ""));
  }

  function normalizeMoneyField(
    raw: string,
    setter: (value: string) => void
  ) {
    const parsed = parseMoneyInput(raw);
    setter(formatMoneyInput(parsed, parsed > 0));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      {usePacks && (
        <>
          <input type="hidden" name="unitsPerPack" value={effectiveUnits} />
          <input type="hidden" name="purchasePrice" value={roundMoney(unitCost)} />
          <input type="hidden" name="sellingPrice" value={roundMoney(unitPrice)} />
        </>
      )}

      <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded border-border"
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="packCost">Pack cost (₦)</Label>
                <Input
                  id="packCost"
                  {...moneyFieldProps(disabled)}
                  value={packCostInput}
                  onChange={(e) => handlePackCostChange(e.target.value)}
                  onBlur={() => normalizeMoneyField(packCostInput, setPackCostInput)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packPrice">Pack selling price (₦)</Label>
                <Input
                  id="packPrice"
                  {...moneyFieldProps(disabled)}
                  value={packPriceInput}
                  onChange={(e) => handlePackPriceChange(e.target.value)}
                  onBlur={() => normalizeMoneyField(packPriceInput, setPackPriceInput)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit cost (₦)</Label>
                <Input
                  id="unitCost"
                  {...moneyFieldProps(disabled)}
                  value={unitCostInput}
                  onChange={(e) => handleUnitCostChange(e.target.value)}
                  onBlur={() => normalizeMoneyField(unitCostInput, setUnitCostInput)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit selling price (₦)</Label>
                <Input
                  id="unitPrice"
                  {...moneyFieldProps(disabled)}
                  value={unitPriceInput}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  onBlur={() => normalizeMoneyField(unitPriceInput, setUnitPriceInput)}
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
        <>
          <input type="hidden" name="unitsPerPack" value={1} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Cost price (₦)</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                {...moneyFieldProps(disabled)}
                value={unitCostInput}
                onChange={(e) => handleUnitCostChange(e.target.value)}
                onBlur={() => normalizeMoneyField(unitCostInput, setUnitCostInput)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling price (₦)</Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                {...moneyFieldProps(disabled)}
                value={unitPriceInput}
                onChange={(e) => handleUnitPriceChange(e.target.value)}
                onBlur={() => normalizeMoneyField(unitPriceInput, setUnitPriceInput)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
