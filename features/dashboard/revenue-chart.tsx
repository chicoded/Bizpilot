"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { useTheme } from "@/components/providers/theme-provider";
import { getLocalWeeklyRevenue } from "@/lib/local-data/sales";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  businessId: string;
}

export function RevenueChart({ businessId }: RevenueChartProps) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const [data, setData] = useState<
    Awaited<ReturnType<typeof getLocalWeeklyRevenue>>
  >([]);
  const [loading, setLoading] = useState(true);

  const gridColor = isDark ? "hsl(222 22% 22%)" : "#f0f0f0";
  const tickColor = isDark ? "hsl(215 15% 72%)" : "#64748b";
  const tooltipBg = isDark ? "hsl(222 35% 12%)" : "#ffffff";
  const tooltipText = isDark ? "hsl(210 25% 96%)" : "#0f172a";

  useEffect(() => {
    void getLocalWeeklyRevenue(businessId)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">Revenue This Week</CardTitle>
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
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: tickColor }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={{ stroke: gridColor }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={{ stroke: gridColor }}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${gridColor}`,
                    background: tooltipBg,
                    color: tooltipText,
                    boxShadow: isDark
                      ? "0 4px 12px rgba(0,0,0,0.4)"
                      : "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ color: tickColor }}
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
