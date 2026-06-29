import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FullReport } from "@/types";

function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function generateExcelBuffer(
  report: FullReport,
  businessName: string
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["BizPilot AI Report"],
    ["Business", businessName],
    ["Period", report.periodLabel],
    [""],
    ["Metric", "Value"],
    ["Revenue", report.summary.revenue],
    ["Gross Profit", report.summary.profit],
    ["Expenses", report.summary.expenses],
    ["Net Profit", report.summary.netProfit],
    ["Number of Sales", report.summary.salesCount],
    ["Average Sale", report.summary.avgSaleValue],
    ["Inventory Cost Value", report.summary.inventoryCostValue],
    ["Inventory Retail Value", report.summary.inventoryRetailValue],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Daily trend
  const trendData = [
    ["Date", "Revenue", "Profit", "Expenses"],
    ...report.dailyTrend.map((d) => [d.date, d.revenue, d.profit, d.expenses]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendData), "Daily Trend");

  // Expenses
  const expenseData = [
    ["Category", "Amount", "Percentage"],
    ...report.expenseBreakdown.map((e) => [e.label, e.amount, `${e.percentage}%`]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseData), "Expenses");

  // Top products
  const productData = [
    ["Product", "Qty Sold", "Revenue"],
    ...report.topProducts.map((p) => [p.name, p.quantitySold, p.revenue]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(productData), "Top Products");

  // Inventory
  const inventoryData = [
    ["Product", "Category", "Qty", "Cost Value", "Retail Value"],
    ...report.inventoryValuation.map((i) => [
      i.name,
      i.category ?? "",
      i.quantity,
      i.costValue,
      i.retailValue,
    ]),
    ["", "", "TOTAL", report.inventoryTotals.cost, report.inventoryTotals.retail],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inventoryData), "Inventory");

  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

export function generatePdfBuffer(
  report: FullReport,
  businessName: string
): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("BizPilot AI", 14, 12);
  doc.setFontSize(10);
  doc.text("Business Report", 14, 20);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(14);
  doc.text(businessName, 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(report.periodLabel, 14, 48);
  doc.text(`Generated ${new Date().toLocaleDateString("en-NG")}`, 14, 54);

  // Summary table
  autoTable(doc, {
    startY: 62,
    head: [["Metric", "Value"]],
    body: [
      ["Revenue", formatNgn(report.summary.revenue)],
      ["Gross Profit", formatNgn(report.summary.profit)],
      ["Expenses", formatNgn(report.summary.expenses)],
      ["Net Profit", formatNgn(report.summary.netProfit)],
      ["Sales Count", String(report.summary.salesCount)],
      ["Avg Sale Value", formatNgn(report.summary.avgSaleValue)],
      ["Inventory (Cost)", formatNgn(report.inventoryTotals.cost)],
      ["Inventory (Retail)", formatNgn(report.inventoryTotals.retail)],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 58, 95] },
    margin: { left: 14, right: 14 },
  });

  let finalY = doc.lastAutoTable.finalY ?? 120;

  if (report.expenseBreakdown.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Expense Breakdown", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Category", "Amount", "%"]],
      body: report.expenseBreakdown.map((e) => [
        e.label,
        formatNgn(e.amount),
        `${e.percentage}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 },
    });
    finalY = doc.lastAutoTable.finalY ?? finalY + 60;
  }

  if (report.topProducts.length > 0) {
    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text("Top Selling Products", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Product", "Qty Sold", "Revenue"]],
      body: report.topProducts.map((p) => [
        p.name,
        String(p.quantitySold),
        formatNgn(p.revenue),
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
      margin: { left: 14, right: 14 },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by BizPilot AI — bizpilot.ai", 14, doc.internal.pageSize.getHeight() - 10);

  return new Uint8Array(doc.output("arraybuffer"));
}

/** Web Fetch API body — copies bytes so TS accepts BlobPart (ArrayBuffer, not ArrayBufferLike). */
export function toExportBlob(data: Uint8Array, mimeType: string): Blob {
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  return new Blob([bytes], { type: mimeType });
}
