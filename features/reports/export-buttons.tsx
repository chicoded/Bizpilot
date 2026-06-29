"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { ReportPeriod } from "@/types";

interface ExportButtonsProps {
  period: ReportPeriod;
}

export function ExportButtons({ period }: ExportButtonsProps) {
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  async function handleExport(format: "pdf" | "excel") {
    setLoading(format);
    try {
      const res = await fetch(`/api/reports/export?period=${period}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `bizpilot-report.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("excel")}
        disabled={loading !== null}
      >
        {loading === "excel" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("pdf")}
        disabled={loading !== null}
      >
        {loading === "pdf" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        PDF
      </Button>
    </div>
  );
}
