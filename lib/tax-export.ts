import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TAX_DISCLAIMER } from "@/lib/tax/constants";
import type { TaxDashboardData } from "@/types/tax";

function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function generateTaxExcelBuffer(
  data: TaxDashboardData,
  businessName: string
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["BizPilot Tax Estimate Report"],
    ["Business", businessName],
    [TAX_DISCLAIMER],
    [""],
    ["Today's estimates"],
    ["Revenue", data.today.revenue],
    ["VAT collected", data.today.vatCollected],
    ["Profit", data.today.profit],
    ["Tax estimate", data.today.estimatedTax],
    [""],
    ["This month"],
    ["Revenue", data.monthly?.estimatedRevenue ?? 0],
    ["Expenses", data.monthly?.estimatedExpenses ?? 0],
    ["Profit", data.monthly?.estimatedProfit ?? 0],
    ["VAT collected", data.monthly?.estimatedVATCollected ?? 0],
    ["Tax estimate", data.monthly?.estimatedTax ?? 0],
    ["Confidence %", data.monthly?.confidence ?? 0],
    [""],
    ["Annual forecast"],
    ["Projected revenue", data.forecast.projectedAnnualRevenue],
    ["Projected profit", data.forecast.projectedAnnualProfit],
    ["Projected tax", data.forecast.projectedAnnualTax],
    ["YTD revenue", data.forecast.ytdRevenue],
    [""],
    ["Compliance score", `${data.compliance.score}%`],
    ...data.compliance.checks.map((c) => [c.label, c.passed ? "OK" : "Needs attention"]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Tax Estimate");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

export function generateTaxPdfBuffer(
  data: TaxDashboardData,
  businessName: string
): Uint8Array {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("BizPilot Tax Estimate Report", 14, 18);
  doc.setFontSize(10);
  doc.text(businessName, 14, 26);
  doc.setTextColor(120);
  const disclaimerLines = doc.splitTextToSize(TAX_DISCLAIMER, 180);
  doc.text(disclaimerLines, 14, 34);

  autoTable(doc, {
    startY: 34 + disclaimerLines.length * 5,
    head: [["Metric", "Estimate (NGN)"]],
    body: [
      ["Today's revenue", formatNgn(data.today.revenue)],
      ["Today's VAT", formatNgn(data.today.vatCollected)],
      ["Today's profit", formatNgn(data.today.profit)],
      ["Today's tax", formatNgn(data.today.estimatedTax)],
      ["Monthly revenue", formatNgn(data.monthly?.estimatedRevenue ?? 0)],
      ["Monthly expenses", formatNgn(data.monthly?.estimatedExpenses ?? 0)],
      ["Monthly tax", formatNgn(data.monthly?.estimatedTax ?? 0)],
      ["Projected annual tax", formatNgn(data.forecast.projectedAnnualTax)],
      ["Compliance score", `${data.compliance.score}%`],
    ],
  });

  return new Uint8Array(doc.output("arraybuffer"));
}
