"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REPORT_PERIODS, type ReportPeriod } from "@/types";

export function ReportPeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("period") as ReportPeriod) || "month";

  function setPeriod(period: ReportPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <Tabs value={current} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
      <TabsList>
        {REPORT_PERIODS.map((p) => (
          <TabsTrigger key={p.value} value={p.value}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
