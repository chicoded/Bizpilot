"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";

export function TaxExportButtons() {
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  async function download(format: "pdf" | "excel") {
    setLoading(format);
    try {
      const res = await fetch(`/api/tax/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "pdf" ? "bizpilot-tax-estimate.pdf" : "bizpilot-tax-estimate.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not export report. Try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => download("pdf")}
        disabled={loading !== null}
      >
        {loading === "pdf" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => download("excel")}
        disabled={loading !== null}
      >
        {loading === "excel" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Excel
      </Button>
    </div>
  );
}
