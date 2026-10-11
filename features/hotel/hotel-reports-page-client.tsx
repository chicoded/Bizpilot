"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useLocalData } from "@/components/providers/local-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble,
  ChefHat,
  Wine,
  Sparkles,
  Warehouse,
  Calendar,
  ArrowRight,
  Download,
  Printer,
} from "lucide-react";
import {
  getDailyReport,
  exportDailyReportCsv,
} from "@/actions/hotel";
import { formatNGN } from "@/lib/hotel-utils";
import { startTransition } from "react";
import Link from "next/link";

const DEPARTMENTS = [
  {
    id: "reception",
    label: "Reception",
    href: "/hotel/reports/reception",
    icon: BedDouble,
    description: "Rooms, payments, booked & vacant rooms",
    tint: "from-sky-500 to-blue-600",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    href: "/hotel/reports/kitchen",
    icon: ChefHat,
    description: "Food sales totals & item summary",
    tint: "from-orange-500 to-red-600",
  },
  {
    id: "bar",
    label: "Bar",
    href: "/hotel/reports/bar",
    icon: Wine,
    description: "Drinks sales & waste",
    tint: "from-purple-500 to-fuchsia-600",
  },
  {
    id: "spa",
    label: "Spa / Masseuse",
    href: "/hotel/reports/spa",
    icon: Sparkles,
    description: "Revenue, treatments & therapists",
    tint: "from-emerald-500 to-teal-600",
  },
  {
    id: "store",
    label: "Stores & Issuance",
    href: "/hotel/reports/store",
    icon: Warehouse,
    description: "Issue stock to Kitchen/Spa/Reception, purchases & count",
    tint: "from-amber-500 to-yellow-600",
  },
] as const;

type DeptId = (typeof DEPARTMENTS)[number]["id"];

const STATUS_STYLES: Record<string, "default" | "warning" | "success" | "info"> = {
  DRAFT: "default",
  SUBMITTED: "info",
  RETURNED: "warning",
  APPROVED: "success",
};

export function HotelReportsPageClient() {
  const { currency, status: ctxStatus } = useLocalData();
  const router = useRouter();
  const params = useSearchParams();
  const today = new Date();
  const initialDate =
    params.get("date") ??
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const [reportDate, setReportDate] = useState(initialDate);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const d = await getDailyReport(date);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ctxStatus === "ready") void load(reportDate);
  }, [ctxStatus, reportDate, load]);

  const downloadCsv = useCallback(() => {
    startTransition(async () => {
      const csv = await exportDailyReportCsv(reportDate);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hotel-daily-report-${reportDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [reportDate]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  if (loading || !data) {
    return (
      <AppShell title="Hotel Reports" subtitle="Loading report…" maxWidth="wide">
        <Skeleton className="h-20 rounded-2xl mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  const statusField: Record<DeptId, any> = {
    reception: data.receptionStatus,
    kitchen: data.kitchenStatus,
    bar: data.barStatus,
    spa: data.spaStatus,
    store: data.storeStatus,
  };

  const submittedAtField: Record<DeptId, any> = {
    reception: data.receptionSubmittedAt,
    kitchen: data.kitchenSubmittedAt,
    bar: data.barSubmittedAt,
    spa: data.spaSubmittedAt,
    store: data.storeSubmittedAt,
  };

  return (
    <AppShell
      title="Hotel Daily Reports"
      subtitle="Five departments · one consolidated view"
      maxWidth="wide"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={printReport} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={downloadCsv} size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      }
    >
      <Card className="mb-6 print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
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
            <div className="flex flex-wrap gap-2 text-sm">
              <StatusChip
                variant={
                  data.approvedAt ? "success" : data.receptionStatus === "SUBMITTED" ? "info" : "default"
                }
              >
                {data.approvedAt ? "Approved" : "Open"}
              </StatusChip>
              {data.approvedBy && (
                <span className="text-muted-foreground">
                  by {data.approvedBy}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const status = statusField[dept.id];
          const submittedAt = submittedAtField[dept.id];
          return (
            <Card
              key={dept.id}
              className="relative overflow-hidden hover:shadow-md transition"
            >
              <div
                className={`h-1 w-full bg-gradient-to-r ${dept.tint}`}
                aria-hidden
              />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className={`p-2 rounded-xl bg-gradient-to-br ${dept.tint} text-white`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <StatusChip variant={STATUS_STYLES[status] ?? "default"}>
                    {status}
                  </StatusChip>
                </div>
                <CardTitle className="text-base mt-3">{dept.label}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {dept.description}
                </p>
              </CardHeader>
              <CardContent>
                {submittedAt ? (
                  <p className="text-xs text-muted-foreground mb-3">
                    Last submitted {new Date(submittedAt).toLocaleTimeString()}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">
                    Not submitted
                  </p>
                )}
                <Link href={`${dept.href}?date=${reportDate}`}>
                  <Button className="w-full" variant="default" size="sm">
                    Open <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Reception received</p>
              <p className="text-lg font-semibold mt-1">
                {formatNGN(data.totals?.receptionPayments ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Kitchen + Bar sales</p>
              <p className="text-lg font-semibold mt-1">
                {formatNGN(
                  (data.totals?.kitchenSales ?? 0) +
                    (data.totals?.barSales ?? 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total inflow</p>
              <p className="text-lg font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                {formatNGN(data.totals?.totalReportedInflow ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Net cash movement</p>
              <p
                className={`text-lg font-semibold mt-1 ${
                  (data.totals?.netReportedCashMovement ?? 0) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatNGN(data.totals?.netReportedCashMovement ?? 0)}
              </p>
            </div>
          </div>

          {data.discrepancies && data.discrepancies.length > 0 && (
            <div className="mt-6 p-4 rounded-xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/20">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Reconciliation discrepancies
              </p>
              <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                {data.discrepancies.map((d: string, i: number) => (
                  <li key={i} className="text-muted-foreground">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
