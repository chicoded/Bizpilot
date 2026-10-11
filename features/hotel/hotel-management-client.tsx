"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalData } from "@/components/providers/local-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  Undo2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BedDouble,
  ChefHat,
  Wine,
  Sparkles,
  Warehouse,
  DollarSign,
  LayoutGrid,
  FileText,
  X,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  approveDailyReport,
  returnDepartment,
  getDailyReport,
  listDailyReports,
  exportDailyReportCsv,
} from "@/actions/hotel";
import { formatNGN } from "@/lib/hotel-utils";
import { format } from "date-fns";
import { startTransition } from "react";
import Link from "next/link";

const DEPTS = [
  { id: "reception", label: "Reception", icon: BedDouble, href: "/hotel/reports/reception", tint: "text-sky-500 bg-sky-50 dark:bg-sky-950/30" },
  { id: "kitchen", label: "Kitchen", icon: ChefHat, href: "/hotel/reports/kitchen", tint: "text-orange-500 bg-orange-50 dark:bg-orange-950/30" },
  { id: "bar", label: "Bar", icon: Wine, href: "/hotel/reports/bar", tint: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
  { id: "spa", label: "Spa", icon: Sparkles, href: "/hotel/reports/spa", tint: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
  { id: "store", label: "Stores & Issuance", icon: Warehouse, href: "/hotel/reports/store", tint: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
] as const;

const STATUS_VARIANT: Record<string, "default" | "success" | "info" | "warning"> = {
  DRAFT: "default",
  SUBMITTED: "info",
  RETURNED: "warning",
  APPROVED: "success",
};

type DeptId = (typeof DEPTS)[number]["id"];

export function HotelManagementClient() {
  const { status: ctxStatus } = useLocalData();
  const today = new Date();
  const initial = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const [reportDate, setReportDate] = useState(initial);
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnDept, setReturnDept] = useState<DeptId | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([
        getDailyReport(date),
        listDailyReports("month"),
      ]);
      setReport(r);
      setHistory(h as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ctxStatus === "ready") void load(reportDate);
  }, [ctxStatus, reportDate, load]);

  const approveAll = useCallback(async () => {
    if (!confirm("Approve all 5 department reports for this date? This action is final.")) return;
    setActing(true);
    try {
      await approveDailyReport(reportDate);
      startTransition(() => load(reportDate));
    } finally {
      setActing(false);
    }
  }, [reportDate, load]);

  const returnOne = useCallback(async () => {
    if (!returnDept || !returnNote.trim()) return;
    setActing(true);
    try {
      await returnDepartment(reportDate, returnDept, returnNote.trim());
      setReturnDept(null);
      setReturnNote("");
      startTransition(() => load(reportDate));
    } finally {
      setActing(false);
    }
  }, [reportDate, returnDept, returnNote, load]);

  const downloadCsv = useCallback(() => {
    startTransition(async () => {
      const csv = await exportDailyReportCsv(reportDate);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hotel-management-${reportDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [reportDate]);

  const exportHistoryCsv = useCallback(() => {
    const rows = [
      ["Date", "Reception", "Kitchen", "Bar", "Spa", "Store", "Inflow", "Expenses paid", "Net"],
      ...history.map((h: any) => {
        const inflow =
          Number(h.receptionReport?.totalPaymentsReceived ?? 0) +
          Number(h.kitchenReport?.totalSales ?? 0) +
          Number(h.barReport?.totalSales ?? 0) +
          Number(h.spaReport?.paidRevenue ?? 0);
        const exp = h.expenses.reduce(
          (s: number, e: any) => s + Number(e.amountPaid),
          0
        );
        return [
          format(new Date(h.reportDate), "yyyy-MM-dd"),
          h.receptionStatus,
          h.kitchenStatus,
          h.barStatus,
          h.spaStatus,
          h.storeStatus,
          String(inflow),
          String(exp),
          String(inflow - exp),
        ];
      }),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c);
            if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hotel-management-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  if (loading || !report) {
    return (
      <AppShell title="Hotel Management" subtitle="Loading…" maxWidth="wide">
        <Skeleton className="h-96 rounded-2xl" />
      </AppShell>
    );
  }

  const totals = report.totals ?? {};
  const anySubmitted =
    report.receptionStatus === "SUBMITTED" ||
    report.kitchenStatus === "SUBMITTED" ||
    report.barStatus === "SUBMITTED" ||
    report.spaStatus === "SUBMITTED" ||
    report.storeStatus === "SUBMITTED";
  const allApproved =
    report.receptionStatus === "APPROVED" &&
    report.kitchenStatus === "APPROVED" &&
    report.barStatus === "APPROVED" &&
    report.spaStatus === "APPROVED" &&
    report.storeStatus === "APPROVED";

  const deptStatusField: Record<DeptId, any> = {
    reception: report.receptionStatus,
    kitchen: report.kitchenStatus,
    bar: report.barStatus,
    spa: report.spaStatus,
    store: report.storeStatus,
  };

  return (
    <AppShell
      title="Hotel Management"
      subtitle="Five-department consolidation · review · approve · return · history"
      maxWidth="wide"
      actions={
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="w-4 h-4 mr-2" /> Daily CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportHistoryCsv}>
            <FileText className="w-4 h-4 mr-2" /> History CSV
          </Button>
          <Button
            size="sm"
            onClick={approveAll}
            disabled={acting || !anySubmitted || allApproved}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {allApproved ? "Already approved" : "Approve all reports"}
          </Button>
        </div>
      }
    >
      <Card className="mb-6 print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Business date</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {allApproved ? (
                <StatusChip variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" /> All approved
                </StatusChip>
              ) : (
                <>
                  <SubmissionStatus status={report.receptionStatus} label="Reception" />
                  <SubmissionStatus status={report.kitchenStatus} label="Kitchen" />
                  <SubmissionStatus status={report.barStatus} label="Bar" />
                  <SubmissionStatus status={report.spaStatus} label="Spa" />
                  <SubmissionStatus status={report.storeStatus} label="Store" />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <InflowCard
          title="Reception payments"
          value={totals.receptionPayments ?? 0}
          icon={<BedDouble className="w-5 h-5" />}
          tint="from-sky-500 to-blue-600"
        />
        <InflowCard
          title="Kitchen + Bar sales"
          value={(totals.kitchenSales ?? 0) + (totals.barSales ?? 0)}
          icon={<ChefHat className="w-5 h-5" />}
          tint="from-orange-500 to-red-600"
        />
        <InflowCard
          title="Spa paid sales"
          value={totals.spaPaidSales ?? 0}
          icon={<Sparkles className="w-5 h-5" />}
          tint="from-emerald-500 to-teal-600"
        />
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-600" />
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total reported inflow
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {formatNGN(totals.totalReportedInflow ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              = Reception + Kitchen + Bar + Spa paid
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4" /> Actual expenses paid
                </p>
                <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                  {formatNGN(totals.actualExpensesPaid ?? 0)}
                </p>
              </div>
              <Link href="/hotel/expenses">
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Only amounts actually paid. Unpaid expenses are excluded.
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Outstanding expenses
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {formatNGN(totals.outstandingExpenses ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Unpaid + partial balances not yet impacting cash.
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 relative overflow-hidden">
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              (totals.netReportedCashMovement ?? 0) >= 0
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-gradient-to-r from-rose-500 to-red-600"
            }`}
          />
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {(totals.netReportedCashMovement ?? 0) >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}{" "}
              Net reported cash movement
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                (totals.netReportedCashMovement ?? 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatNGN(totals.netReportedCashMovement ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Total inflow − Actual expenses paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department submission cards */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Department reports</CardTitle>
          <CardDescription>
            Review each report, open for detail, return with notes or approve all together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {DEPTS.map((d) => {
              const Icon = d.icon;
              const status = deptStatusField[d.id];
              const returnNote = report.returnNotes?.[d.id] ?? null;
              return (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-border hover:border-ring/60 transition flex flex-col"
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-xl ${d.tint}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <StatusChip variant={STATUS_VARIANT[status] ?? "default"}>
                      {status}
                    </StatusChip>
                  </div>
                  <h3 className="text-sm font-semibold mt-3">{d.label}</h3>
                  <DeptSummary report={report} dept={d.id} />
                  {returnNote && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs">
                      <p className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                        <Undo2 className="w-3.5 h-3.5" /> Returned
                      </p>
                      <p className="text-amber-800/70 dark:text-amber-200/80 mt-1 whitespace-pre-wrap">
                        {returnNote}
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Link href={`${d.href}?date=${reportDate}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        Open
                      </Button>
                    </Link>
                    {status !== "APPROVED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReturnDept(d.id)}
                      >
                        <Undo2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation discrepancies */}
      {report.discrepancies && report.discrepancies.length > 0 && (
        <Card className="mb-6 border-amber-300/50 dark:border-amber-900/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Reconciliation
              discrepancies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {report.discrepancies.map((d: string, i: number) => (
                <li key={i} className="text-muted-foreground">
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Expenses for the day */}
      {report.expenses && report.expenses.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Expenses for this date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-3 pr-3 font-medium">Category</th>
                    <th className="py-3 pr-3 font-medium">Description</th>
                    <th className="py-3 pr-3 text-right font-medium">Amount</th>
                    <th className="py-3 pr-3 text-right font-medium">Paid</th>
                    <th className="py-3 pr-3 text-right font-medium">O/s</th>
                    <th className="py-3 pr-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/60">
                      <td className="py-3 pr-3">{e.category}</td>
                      <td className="py-3 pr-3">{e.description}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {formatNGN(e.amount)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatNGN(e.amountPaid)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                        {formatNGN(e.outstanding)}
                      </td>
                      <td className="py-3 pr-3">
                        <StatusChip
                          variant={
                            e.paymentStatus === "PAID"
                              ? "success"
                              : e.paymentStatus === "PARTIAL"
                              ? "warning"
                              : "info"
                          }
                        >
                          {e.paymentStatus}
                        </StatusChip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">30 / 90 day history</CardTitle>
          <CardDescription>Daily · weekly · monthly at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              <HistoryRows rows={history} period="day" />
            </TabsContent>
            <TabsContent value="weekly">
              <HistoryRows rows={history} period="week" />
            </TabsContent>
            <TabsContent value="monthly">
              <HistoryRows rows={history} period="month" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!returnDept} onOpenChange={(o) => !o && setReturnDept(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return {returnDept && DEPTS.find((d) => d.id === returnDept)?.label} report</DialogTitle>
            <DialogDescription>
              Explain what must be corrected. The department will see this note when they reopen their report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Correction note</Label>
            <Textarea
              rows={4}
              placeholder="E.g. Room count doesn’t match wing breakdown. Please reconcile before resubmitting."
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDept(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={returnOne}
              disabled={acting || !returnNote.trim()}
            >
              {acting ? "Returning…" : "Return for corrections"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SubmissionStatus({ status, label }: { status: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-border">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "APPROVED"
            ? "bg-emerald-500"
            : status === "SUBMITTED"
            ? "bg-sky-500"
            : status === "RETURNED"
            ? "bg-amber-500"
            : "bg-slate-400"
        }`}
      />
      {label} · {status}
    </span>
  );
}

function DeptSummary({ report, dept }: { report: any; dept: DeptId }) {
  if (dept === "reception") {
    const r = report.receptionReport;
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <p>Rooms booked: {r?.totalRooms ? `${r.totalRooms - 0}` : "—"}</p>
        <p>Payments: {formatNGN(r?.totalPaymentsReceived ?? 0)}</p>
      </div>
    );
  }
  if (dept === "kitchen") {
    const r = report.kitchenReport;
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <p>Sales: {formatNGN(r?.totalSales ?? 0)}</p>
        <p>COGS: {formatNGN(r?.costOfGoodsSold ?? 0)}</p>
      </div>
    );
  }
  if (dept === "bar") {
    const r = report.barReport;
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <p>Sales: {formatNGN(r?.totalSales ?? 0)}</p>
        <p>Waste: {formatNGN(r?.spillageWasteCost ?? 0)}</p>
      </div>
    );
  }
  if (dept === "spa") {
    const r = report.spaReport;
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <p>Paid: {formatNGN(r?.paidRevenue ?? 0)}</p>
        <p>
          Comp/pending: {r?.complimentaryCount ?? 0} / {r?.pendingServicesCount ?? 0}
        </p>
      </div>
    );
  }
  const r = report.storeReport;
  return (
    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
      <p>Purchases: {formatNGN(r?.purchasesValue ?? 0)}</p>
      <p>Issues out: {formatNGN(r?.issuesValue ?? 0)}</p>
    </div>
  );
}

function InflowCard({
  title,
  value,
  icon,
  tint,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tint}`} />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatNGN(value)}</p>
          </div>
          <div
            className={`p-2 rounded-xl text-white bg-gradient-to-br ${tint}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryRows({
  rows,
  period,
}: {
  rows: any[];
  period: "day" | "week" | "month";
}) {
  const grouped = useMemo(() => {
    const bucket = new Map<string, { inflow: number; outflow: number; net: number; count: number }>();
    for (const r of rows) {
      const date = new Date(r.reportDate);
      let key: string;
      if (period === "day") key = format(date, "dd MMM yyyy");
      else if (period === "week") {
        const start = new Date(date);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        key = format(start, "dd MMM yyyy") + " week";
      } else key = format(date, "MMM yyyy");
      const inflow =
        Number(r.receptionReport?.totalPaymentsReceived ?? 0) +
        Number(r.kitchenReport?.totalSales ?? 0) +
        Number(r.barReport?.totalSales ?? 0) +
        Number(r.spaReport?.paidRevenue ?? 0);
      const outflow = r.expenses.reduce(
        (s: number, e: any) => s + Number(e.amountPaid),
        0
      );
      const existing = bucket.get(key) ?? {
        inflow: 0,
        outflow: 0,
        net: 0,
        count: 0,
      };
      bucket.set(key, {
        inflow: existing.inflow + inflow,
        outflow: existing.outflow + outflow,
        net: existing.net + (inflow - outflow),
        count: existing.count + 1,
      });
    }
    return Array.from(bucket.entries()).slice(0, 30);
  }, [rows, period]);

  if (grouped.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground text-sm">
        No other days in recent history yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="py-3 pr-3 font-medium">Period</th>
            <th className="py-3 pr-3 text-right font-medium"># Days</th>
            <th className="py-3 pr-3 text-right font-medium">Inflow</th>
            <th className="py-3 pr-3 text-right font-medium">Expenses paid</th>
            <th className="py-3 pr-3 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([periodKey, agg]) => (
            <tr key={periodKey} className="border-b border-border/60">
              <td className="py-3 pr-3 font-medium">{periodKey}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{agg.count}</td>
              <td className="py-3 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatNGN(agg.inflow)}
              </td>
              <td className="py-3 pr-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                {formatNGN(agg.outflow)}
              </td>
              <td
                className={`py-3 pr-3 text-right tabular-nums font-semibold ${
                  agg.net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatNGN(agg.net)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
