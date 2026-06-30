"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanBarcode } from "lucide-react";

const MobileBarcodeScanner = dynamic(
  () =>
    import("@/components/barcode/mobile-barcode-scanner").then(
      (mod) => mod.MobileBarcodeScanner
    ),
  { ssr: false }
);

interface BarcodeScanFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  productId?: string;
  onDuplicateFound?: (productName: string) => void;
}

async function findProductByBarcode(
  code: string,
  excludeProductId?: string
): Promise<string | null> {
  const response = await fetch(
    `/api/products/barcode?code=${encodeURIComponent(code)}`
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    product: { id: string; name: string } | null;
  };

  if (!data.product) return null;
  if (excludeProductId && data.product.id === excludeProductId) return null;

  return data.product.name;
}

export function BarcodeScanField({
  value,
  onChange,
  disabled,
  productId,
  onDuplicateFound,
}: BarcodeScanFieldProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function applyBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;

    onChange(trimmed);
    setScanHint("Barcode saved — ready for POS scanning.");
    setChecking(true);

    try {
      const existingName = await findProductByBarcode(trimmed, productId);
      if (existingName) {
        setScanHint(
          `This barcode is already used by "${existingName}". Use a different product or edit that item.`
        );
        onDuplicateFound?.(existingName);
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="barcode">Barcode</Label>

      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mb-2 h-12 w-full touch-manipulation"
          disabled={disabled || checking}
          onClick={() => setScannerOpen(true)}
        >
          <ScanBarcode className="h-5 w-5" />
          Scan barcode
        </Button>
      </div>

      <Input
        id="barcode"
        name="barcode"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setScanHint(null);
        }}
        placeholder="Scan or type barcode"
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
      />

      {scanHint && (
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            scanHint.includes("already used")
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {scanHint}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Save the barcode here so you can scan it quickly at Point of Sale.
      </p>

      <MobileBarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          void applyBarcode(code);
        }}
      />
    </div>
  );
}
