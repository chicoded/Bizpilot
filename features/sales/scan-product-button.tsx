"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Loader2, ScanBarcode } from "lucide-react";
import { lookupProductByBarcode } from "@/lib/barcode-product-lookup";

const MobileBarcodeScanner = dynamic(
  () =>
    import("@/components/barcode/mobile-barcode-scanner").then(
      (mod) => mod.MobileBarcodeScanner
    ),
  { ssr: false }
);

export interface ScannableProduct {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  barcode?: string | null;
}

interface ScanProductButtonProps {
  onProductFound: (product: ScannableProduct) => void;
  disabled?: boolean;
}

export function ScanProductButton({
  onProductFound,
  disabled,
}: ScanProductButtonProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, startLookup] = useTransition();

  function runLookup(barcode: string) {
    setLookupError(null);
    setNotFoundBarcode(null);

    startLookup(async () => {
      const result = await lookupProductByBarcode(barcode);
      if (result.ok) {
        onProductFound(result.product);
        return;
      }
      if (result.reason === "not_found") {
        setNotFoundBarcode(barcode);
        return;
      }
      setLookupError(result.message);
    });
  }

  return (
    <>
      <div className="md:hidden space-y-2">
        <Button
          type="button"
          size="lg"
          className="w-full h-12 text-base touch-manipulation"
          disabled={disabled || isLookingUp}
          onClick={() => {
            setLookupError(null);
            setNotFoundBarcode(null);
            setScannerOpen(true);
          }}
        >
          {isLookingUp ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ScanBarcode className="h-5 w-5" />
          )}
          Scan Product
        </Button>

        {lookupError && (
          <p className="text-sm text-red-500 text-center rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2">
            {lookupError}
          </p>
        )}
      </div>

      <MobileBarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={runLookup}
      />

      {notFoundBarcode && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 md:items-center">
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="barcode-not-found-title"
          >
            <h2
              id="barcode-not-found-title"
              className="text-lg font-semibold text-brand mb-2"
            >
              Product not found
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              No product matches this barcode:
            </p>
            <p className="font-mono text-sm bg-muted rounded-lg px-3 py-2 mb-6 break-all">
              {notFoundBarcode}
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="h-12 w-full" asChild>
                <Link
                  href={`/inventory/new?barcode=${encodeURIComponent(notFoundBarcode)}`}
                >
                  Add Product
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 w-full"
                onClick={() => setNotFoundBarcode(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Shared barcode lookup for POS wedge / search Enter */
export { lookupProductByBarcode };
