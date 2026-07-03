"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Loader2,
  TrendingUp,
  BarChart3,
  Printer,
} from "lucide-react";
import { getRecentMonthOptions } from "@/lib/monthly-report-months";

interface MonthlySalesReportCardProps {
  defaultMonth: string;
  canExport: boolean;
}

export function MonthlySalesReportCard({
  defaultMonth,
  canExport,
}: MonthlySalesReportCardProps) {
  const [month, setMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const monthOptions = getRecentMonthOptions(12);

  async function downloadPdf() {
    if (!canExport) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly-sales?month=${month}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `bizpilot-sales-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Could not generate PDF. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-biz-blue/20 bg-gradient-to-br from-biz-blue/5 to-transparent dark:from-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand" />
          Monthly Sales Report (PDF)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Industry-grade analysis with revenue trends, payment mix, product
          margins, weekly breakdown, and actionable insights — ready to print or
          share.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-biz-emerald shrink-0" />
            Month-over-month comparison
          </li>
          <li className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-biz-emerald shrink-0" />
            Daily & weekly sales ledger
          </li>
          <li className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-biz-emerald shrink-0" />
            Payment channel & credit analysis
          </li>
          <li className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-biz-emerald shrink-0" />
            Top products with profit margins
          </li>
        </ul>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="select-native flex-1 sm:max-w-xs"
            aria-label="Select month"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            onClick={downloadPdf}
            disabled={loading || !canExport}
            className="h-11 sm:min-w-[180px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>

        {!canExport ? (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
            PDF export requires the Business plan. Upgrade at{" "}
            <a href="/settings/billing" className="text-brand font-medium underline">
              Settings → Billing
            </a>
            .
          </p>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Open the PDF and use Print (Ctrl+P) for a hard copy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
