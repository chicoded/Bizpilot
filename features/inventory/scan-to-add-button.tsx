"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ScanBarcode } from "lucide-react";

const MobileBarcodeScanner = dynamic(
  () =>
    import("@/components/barcode/mobile-barcode-scanner").then(
      (mod) => mod.MobileBarcodeScanner
    ),
  { ssr: false }
);

export function ScanToAddProductButton() {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  function handleScan(barcode: string) {
    setScannerOpen(false);
    router.push(`/inventory/new?barcode=${encodeURIComponent(barcode.trim())}`);
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="w-full h-12 touch-manipulation md:hidden"
        onClick={() => setScannerOpen(true)}
      >
        <ScanBarcode className="h-5 w-5" />
        Scan &amp; Add Product
      </Button>

      <MobileBarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </>
  );
}
