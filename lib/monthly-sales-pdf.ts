import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthlySalesReport } from "@/types";
import { formatCurrency } from "@/lib/utils";

const BRAND = [30, 58, 95] as const;
const EMERALD = [16, 185, 129] as const;
const MARGIN = { left: 14, right: 14 };

function fmt(amount: number, currency: string): string {
  return formatCurrency(amount, currency);
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("BizPilot AI", MARGIN.left, 13);
  doc.setFontSize(9);
  doc.text("Monthly Sales Intelligence Report", MARGIN.left, 21);
  doc.setFontSize(11);
  doc.text(title, pageWidth - MARGIN.right, 13, { align: "right" });
  doc.setFontSize(9);
  doc.text(subtitle, pageWidth - MARGIN.right, 21, { align: "right" });
}

function addFooter(doc: jsPDF, page: number, total: number) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `BizPilot AI · Confidential business report · Page ${page} of ${total}`,
    MARGIN.left,
    h - 8
  );
  doc.text(
    `Generated ${new Date().toLocaleString("en-NG")}`,
    doc.internal.pageSize.getWidth() - MARGIN.right,
    h - 8,
    { align: "right" }
  );
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    doc.addPage();
    return 24;
  }
  return y;
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 16);
  doc.setFontSize(11);
  doc.setTextColor(...BRAND);
  doc.text(text, MARGIN.left, y);
  return y + 6;
}

function changeCell(value: number): string {
  if (value > 0) return `▲ ${value}%`;
  if (value < 0) return `▼ ${Math.abs(value)}%`;
  return "—";
}

export function generateMonthlySalesPdfBuffer(
  report: MonthlySalesReport
): Uint8Array {
  const doc = new jsPDF();
  const currency = report.currency;
  let y = 40;

  addHeader(doc, report.businessName, report.periodLabel);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(
    `Reporting period: ${report.periodLabel} · Currency: ${currency}`,
    MARGIN.left,
    y
  );
  y += 10;

  // Executive summary
  y = sectionTitle(doc, y, "Executive Summary");
  autoTable(doc, {
    startY: y,
    head: [["Metric", "This Month", `vs ${report.comparison.previousLabel}`]],
    body: [
      [
        "Total Revenue",
        fmt(report.summary.revenue, currency),
        changeCell(report.comparison.revenueChangePct),
      ],
      [
        "Gross Profit",
        fmt(report.summary.profit, currency),
        changeCell(report.comparison.profitChangePct),
      ],
      [
        "Operating Expenses",
        fmt(report.summary.expenses, currency),
        changeCell(report.comparison.expensesChangePct),
      ],
      [
        "Net Profit",
        fmt(report.summary.netProfit, currency),
        "—",
      ],
      [
        "Transactions",
        String(report.summary.salesCount),
        changeCell(report.comparison.salesCountChangePct),
      ],
      [
        "Avg Transaction Value",
        fmt(report.summary.avgSaleValue, currency),
        "—",
      ],
      [
        "Gross Margin",
        `${report.metrics.profitMarginPct}%`,
        "—",
      ],
      [
        "Net Margin",
        `${report.metrics.netMarginPct}%`,
        "—",
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [...BRAND], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: MARGIN,
  });
  y = (doc.lastAutoTable.finalY ?? y) + 10;

  // Performance metrics
  y = sectionTitle(doc, y, "Sales Performance Metrics");
  autoTable(doc, {
    startY: y,
    head: [["KPI", "Value"]],
    body: [
      [
        "Avg revenue on active selling days",
        fmt(report.metrics.avgDailyRevenue, currency),
      ],
      [
        "Avg profit on active selling days",
        fmt(report.metrics.avgDailyProfit, currency),
      ],
      [
        "Active selling days",
        `${report.metrics.activeSellingDays} of ${report.metrics.totalDaysInPeriod} days (${report.metrics.sellThroughRatePct}%)`,
      ],
      [
        "Peak sales day",
        report.peakDay
          ? `${report.peakDay.label} — ${fmt(report.peakDay.revenue, currency)}`
          : "No sales recorded",
      ],
      [
        "Credit sales share",
        `${report.creditSummary.creditRevenuePct}% (${report.creditSummary.creditSalesCount} sales, ${fmt(report.creditSummary.creditRevenue, currency)})`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [...EMERALD], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: MARGIN,
  });
  y = (doc.lastAutoTable.finalY ?? y) + 10;

  // 6-month trend
  y = sectionTitle(doc, y, "6-Month Revenue Trend");
  autoTable(doc, {
    startY: y,
    head: [["Month", "Revenue", "Gross Profit", "Expenses", "Net Profit"]],
    body: report.monthlyTrend.map((m) => [
      m.label,
      fmt(m.revenue, currency),
      fmt(m.profit, currency),
      fmt(m.expenses, currency),
      fmt(m.profit - m.expenses, currency),
    ]),
    theme: "striped",
    headStyles: { fillColor: [...BRAND], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: MARGIN,
  });
  y = (doc.lastAutoTable.finalY ?? y) + 10;

  // Weekly breakdown
  if (report.weeklyBreakdown.length > 0) {
    y = ensureSpace(doc, y, 40);
    y = sectionTitle(doc, y, "Weekly Breakdown");
    autoTable(doc, {
      startY: y,
      head: [["Week", "Revenue", "Profit", "Expenses", "Sales", "Net"]],
      body: report.weeklyBreakdown.map((w) => [
        w.label,
        fmt(w.revenue, currency),
        fmt(w.profit, currency),
        fmt(w.expenses, currency),
        String(w.salesCount),
        fmt(w.profit - w.expenses, currency),
      ]),
      theme: "striped",
      headStyles: { fillColor: [...BRAND], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      margin: MARGIN,
    });
    y = (doc.lastAutoTable.finalY ?? y) + 10;
  }

  // Payment mix
  if (report.paymentMix.length > 0) {
    y = ensureSpace(doc, y, 40);
    y = sectionTitle(doc, y, "Payment Channel Analysis");
    autoTable(doc, {
      startY: y,
      head: [["Channel", "Transactions", "Revenue", "Share"]],
      body: report.paymentMix.map((p) => [
        p.label,
        String(p.count),
        fmt(p.revenue, currency),
        `${p.percentage}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [...EMERALD], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: MARGIN,
    });
    y = (doc.lastAutoTable.finalY ?? y) + 10;
  }

  // Daily ledger (compact)
  y = ensureSpace(doc, y, 40);
  y = sectionTitle(doc, y, "Daily Sales Ledger");
  const dailyRows = report.dailyTrend.filter(
    (d) => d.revenue > 0 || d.expenses > 0
  );
  autoTable(doc, {
    startY: y,
    head: [["Date", "Revenue", "Gross Profit", "Expenses", "Net"]],
    body: (dailyRows.length > 0 ? dailyRows : report.dailyTrend).map((d) => [
      d.date,
      fmt(d.revenue, currency),
      fmt(d.profit, currency),
      fmt(d.expenses, currency),
      fmt(d.profit - d.expenses, currency),
    ]),
    theme: "striped",
    headStyles: { fillColor: [...BRAND], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: MARGIN,
    pageBreak: "auto",
  });
  y = (doc.lastAutoTable.finalY ?? y) + 10;

  // Top products
  if (report.topProductsByRevenue.length > 0) {
    y = ensureSpace(doc, y, 40);
    y = sectionTitle(doc, y, "Top Products by Revenue");
    autoTable(doc, {
      startY: y,
      head: [["Product", "Qty", "Revenue", "Profit", "Margin"]],
      body: report.topProductsByRevenue.map((p) => [
        p.name,
        String(p.quantitySold),
        fmt(p.revenue, currency),
        fmt(p.profit, currency),
        `${p.marginPct}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [...BRAND], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: MARGIN,
    });
    y = (doc.lastAutoTable.finalY ?? y) + 10;
  }

  // Expenses
  if (report.expenseBreakdown.length > 0) {
    y = ensureSpace(doc, y, 40);
    y = sectionTitle(doc, y, "Expense Breakdown");
    autoTable(doc, {
      startY: y,
      head: [["Category", "Amount", "Share"]],
      body: report.expenseBreakdown.map((e) => [
        e.label,
        fmt(e.amount, currency),
        `${e.percentage}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [...EMERALD], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: MARGIN,
    });
    y = (doc.lastAutoTable.finalY ?? y) + 10;
  }

  // Insights
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, "Insights & Recommendations");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  for (const insight of report.insights) {
    y = ensureSpace(doc, y, 8);
    const lines = doc.splitTextToSize(
      `• ${insight}`,
      doc.internal.pageSize.getWidth() - MARGIN.left - MARGIN.right
    );
    doc.text(lines, MARGIN.left, y);
    y += lines.length * 4.5 + 2;
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
