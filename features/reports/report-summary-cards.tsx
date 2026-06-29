"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Package, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ReportSummary } from "@/types";
import { cn } from "@/lib/utils";

interface ReportSummaryCardsProps {
  summary: ReportSummary;
  currency?: string;
  revenueChange?: number;
  profitChange?: number;
}

const cards = [
  { key: "revenue", label: "Revenue", icon: TrendingUp, variant: "success" as const, field: "revenue" as const },
  { key: "profit", label: "Gross Profit", icon: DollarSign, variant: "default" as const, field: "profit" as const },
  { key: "expenses", label: "Expenses", icon: Receipt, variant: "warning" as const, field: "expenses" as const },
  { key: "netProfit", label: "Net Profit", icon: TrendingDown, variant: "default" as const, field: "netProfit" as const },
];

const variantStyles = {
  default: "from-biz-blue/10 to-biz-blue/5 text-biz-blue",
  success: "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
  warning: "from-amber-500/10 to-amber-500/5 text-amber-600",
};

export function ReportSummaryCards({
  summary,
  currency = "NGN",
  revenueChange,
  profitChange,
}: ReportSummaryCardsProps) {
  const trends: Record<string, number | undefined> = {
    revenue: revenueChange,
    profit: profitChange,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const value = summary[card.field];
        const trend = trends[card.field];
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {card.label}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {formatCurrency(value, currency)}
                    </p>
                    {trend !== undefined && (
                      <p
                        className={cn(
                          "text-xs font-medium mt-1",
                          trend >= 0 ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {trend >= 0 ? "+" : ""}
                        {trend}% vs last week
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br",
                      variantStyles[card.variant]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="col-span-2 lg:col-span-4"
      >
        <Card className="bg-biz-blue/5 border-biz-blue/10">
          <CardContent className="p-4 flex flex-wrap gap-6 justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-biz-blue" />
              <div>
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="font-bold">{summary.salesCount} transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-biz-blue" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Sale</p>
                <p className="font-bold">{formatCurrency(summary.avgSaleValue, currency)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-biz-emerald" />
              <div>
                <p className="text-xs text-muted-foreground">Inventory Value</p>
                <p className="font-bold">
                  {formatCurrency(summary.inventoryRetailValue, currency)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">retail</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
