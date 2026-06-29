"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DailyDataPoint } from "@/types";

interface SalesTrendChartProps {
  data: DailyDataPoint[];
  title?: string;
}

export function SalesTrendChart({
  data,
  title = "Sales & Profit Trend",
}: SalesTrendChartProps) {
  const hasData = data.some((d) => d.revenue > 0 || d.expenses > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No sales data for this period
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "revenue"
                      ? "Revenue"
                      : name === "profit"
                        ? "Profit"
                        : "Expenses",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#1e3a5f"
                  strokeWidth={2}
                  dot={false}
                  name="Profit"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Expenses"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
