"use client";

import { ScanBarcode } from "lucide-react";

export function ExternalScannerStatus() {
  return (
    <div className="hidden md:flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-foreground">
      <ScanBarcode className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>
        <span className="font-semibold">USB scanner ready</span>
        <span className="text-muted-foreground">
          {" "}
          — plug in your barcode scanner and scan into the search box, or scan
          anywhere on this page.
        </span>
      </span>
    </div>
  );
}
