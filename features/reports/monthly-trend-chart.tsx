"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#1e3a5f", "#2d5a8e", "#10b981", "#059669", "#f59e0b", "#ef4444"];

interface MonthlyTrendChartProps {
  data: { label: string; revenue: number; profit: number; expenses: number }[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">6-Month Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No monthly data yet
          </div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
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
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
