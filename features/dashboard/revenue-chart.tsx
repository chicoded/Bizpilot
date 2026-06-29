"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DailyDataPoint } from "@/types";

interface RevenueChartProps {
  businessId: string;
}

export function RevenueChart({ businessId }: RevenueChartProps) {
  const [data, setData] = useState<DailyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports?period=week")
      .then((r) => r.json())
      .then((report) => {
        setData(report.dailyTrend ?? []);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] bg-muted/50 rounded-xl animate-pulse" />
        ) : !hasData ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No sales this week yet
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
