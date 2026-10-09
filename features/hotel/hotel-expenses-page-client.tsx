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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Download,
  Printer,
  Receipt as ReceiptIcon,
} from "lucide-react";
import {
  createHotelExpense,
  updateHotelExpense,
  deleteHotelExpense,
  listHotelExpenses,
  hotelExpenseCategories,
  formatNGN,
} from "@/actions/hotel";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { startTransition } from "react";

type Range = "day" | "week" | "month" | "all";

type ExpenseForm = {
  id?: string;
  date: string;
  category: any;
  description: string;
  amount: number;
  amountPaid: number;
  paidTo: string;
  referenceNo: string;
  receiptUrl: string;
  reportDate: string;
};

const EMPTY: ExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  category: "FUEL",
  description: "",
  amount: 0,
  amountPaid: 0,
  paidTo: "",
  referenceNo: "",
  receiptUrl: "",
  reportDate: new Date().toISOString().slice(0, 10),
};

const CATS = hotelExpenseCategories();

export function HotelExpensesPageClient() {
  const { status: ctxStatus, currency } = useLocalData();
  const [range, setRange] = useState<Range>("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      setData(await listHotelExpenses(r));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ctxStatus === "ready") void load(range);
  }, [ctxStatus, range, load]);

  const openNew = useCallback(() => {
    setForm(EMPTY);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: any) => {
    setForm({
      id: row.id,
      date: new Date(row.date).toISOString().slice(0, 10),
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      amountPaid: Number(row.amountPaid),
      paidTo: row.paidTo ?? "",
      referenceNo: row.referenceNo ?? "",
      receiptUrl: row.receiptUrl ?? "",
      reportDate: row.hotelDailyReportId
        ? ""
        : new Date(row.date).toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  }, []);

  const save = useCallback(async () => {
    if (!form.description || !form.category) return;
    setSaving(true);
    try {
      if (form.id) {
        await updateHotelExpense(form as any);
      } else {
        await createHotelExpense(form as any);
      }
      setDialogOpen(false);
      startTransition(() => load(range));
    } finally {
      setSaving(false);
    }
  }, [form, range, load]);

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Delete this expense?")) return;
      await deleteHotelExpense(id);
      startTransition(() => load(range));
    },
    [range, load]
  );

  const downloadCsv = useCallback(() => {
    if (!data) return;
    const rows = [
      ["Date", "Category", "Description", "Amount", "Paid", "Outstanding", "Status", "Paid to", "Ref"],
      ...data.items.map((e: any) => [
        format(new Date(e.date), "yyyy-MM-dd"),
        e.category,
        e.description,
        String(e.amount),
        String(e.amountPaid),
        String(e.outstanding),
        e.paymentStatus,
        e.paidTo ?? "",
        e.referenceNo ?? "",
      ]),
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
    a.download = `hotel-expenses-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, range]);

  const outstanding = data?.totalOutstanding ?? 0;

  if (loading || !data) {
    return (
      <AppShell title="Hotel Expenses" subtitle="Loading…" maxWidth="wide">
        <Skeleton className="h-96 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Hotel Expenses"
      subtitle="Track operational costs — only money paid counts as outflow"
      maxWidth="wide"
      actions={
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Add expense
          </Button>
        </div>
      }
    >
      <Card className="mb-6 print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Label>Period</Label>
            <SegmentedControl
              options={[
                { value: "day", label: "Today" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "all", label: "All" },
              ]}
              value={range}
              onChange={(v) => setRange(v as Range)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Kpi label="Total invoiced" value={formatNGN(data.totalAmount)} tint="bg-slate-100 dark:bg-slate-900" />
        <Kpi
          label="Actually paid (outflow)"
          value={formatNGN(data.totalPaid)}
          tint="bg-emerald-50 dark:bg-emerald-950/30"
          highlight
        />
        <Kpi
          label="Outstanding (unpaid)"
          value={formatNGN(outstanding)}
          tint="bg-amber-50 dark:bg-amber-950/30"
          warn={outstanding > 0}
        />
        <Kpi
          label="Expense count"
          value={String(data.items.length)}
          tint="bg-slate-100 dark:bg-slate-900"
        />
      </div>

      {Object.keys(data.byCategory).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.byCategory).map(([cat, row]: any) => (
                <div
                  key={cat}
                  className="flex items-start justify-between p-3 rounded-xl border border-border"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {CATS.find((c: any) => c.value === cat)?.label ?? cat}
                    </p>
                    <p className="text-base font-semibold">
                      {formatNGN(row.amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Paid / O/s</p>
                    <p className="text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatNGN(row.paid)}
                      </span>{" "}
                      /{" "}
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {formatNGN(row.outstanding)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No expenses yet — click “Add expense” to begin
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-3 pr-3 font-medium">Date</th>
                    <th className="py-3 pr-3 font-medium">Category</th>
                    <th className="py-3 pr-3 font-medium">Description</th>
                    <th className="py-3 pr-3 text-right font-medium">Amount</th>
                    <th className="py-3 pr-3 text-right font-medium">Paid</th>
                    <th className="py-3 pr-3 text-right font-medium">O/s</th>
                    <th className="py-3 pr-3 font-medium">Status</th>
                    <th className="py-3 pr-3 font-medium print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {format(new Date(e.date), "dd MMM yyyy")}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {CATS.find((c: any) => c.value === e.category)?.label ??
                          e.category}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="max-w-md">
                          <p>{e.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {e.paidTo && <span>Paid to: {e.paidTo}</span>}
                            {e.referenceNo && <span>Ref: {e.referenceNo}</span>}
                            {e.receiptUrl && (
                              <a
                                href={e.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:underline"
                              >
                                <ReceiptIcon className="w-3 h-3" /> Receipt
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatNGN(e.amount)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                        {formatNGN(e.amountPaid)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap text-amber-600 dark:text-amber-400">
                        {formatNGN(e.outstanding)}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <ExpenseStatusChip status={e.paymentStatus} />
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap print:hidden">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(e)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-rose-600"
                            onClick={() => remove(e.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {CATS.map((c: any) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="What was it for?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total amount (₦)</Label>
              <Input
                type="number"
                min={0}
                step={500}
                value={String(form.amount)}
                onChange={(e) => {
                  const amt = Number(e.target.value || 0);
                  const paid = Math.min(form.amountPaid, amt);
                  setForm({ ...form, amount: amt, amountPaid: paid });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount paid today (₦)</Label>
              <Input
                type="number"
                min={0}
                step={500}
                value={String(form.amountPaid)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amountPaid: Math.min(
                      Number(e.target.value || 0),
                      form.amount
                    ),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Only paid money counts toward outflow. Outstanding:{" "}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatNGN(Math.max(0, form.amount - form.amountPaid))}
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Paid to</Label>
              <Input
                placeholder="Supplier / staff name"
                value={form.paidTo}
                onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reference / invoice #</Label>
              <Input
                placeholder="INV-001"
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Receipt URL (optional)</Label>
              <Input
                placeholder="https://…"
                value={form.receiptUrl}
                onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 p-3 rounded-xl border border-border">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Payment status</p>
                  <p className="text-base font-semibold">
                    <ExpenseStatusChip
                      status={
                        form.amountPaid >= form.amount
                          ? "PAID"
                          : form.amountPaid > 0
                          ? "PARTIAL"
                          : "UNPAID"
                      }
                    />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">Outstanding balance</p>
                  <p className="text-lg font-bold">
                    {formatNGN(Math.max(0, form.amount - form.amountPaid))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save()} disabled={saving || !form.description}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  tint,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  tint: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl ${tint}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : warn
            ? "text-amber-600 dark:text-amber-400"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ExpenseStatusChip({ status }: { status: "UNPAID" | "PARTIAL" | "PAID" }) {
  if (status === "PAID") return <StatusChip variant="success">Paid in full</StatusChip>;
  if (status === "PARTIAL") return <StatusChip variant="warning">Partially paid</StatusChip>;
  return <StatusChip variant="info">Unpaid</StatusChip>;
}
