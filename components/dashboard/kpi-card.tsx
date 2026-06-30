"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type KPIIconName =
  | "trendingUp"
  | "trendingDown"
  | "dollarSign"
  | "users";

function KpiIcon({ name, className }: { name: KPIIconName; className: string }) {
  switch (name) {
    case "trendingUp":
      return <TrendingUp className={className} />;
    case "trendingDown":
      return <TrendingDown className={className} />;
    case "dollarSign":
      return <DollarSign className={className} />;
    case "users":
      return <Users className={className} />;
  }
}

interface KPICardProps {
  title: string;
  value: number;
  currency?: string;
  iconName: KPIIconName;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger";
  delay?: number;
}

const variantStyles = {
  default: "from-biz-blue/10 to-biz-blue/5 text-biz-blue",
  success: "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
  warning: "from-amber-500/10 to-amber-500/5 text-amber-600",
  danger: "from-red-500/10 to-red-500/5 text-red-600",
};

export function KPICard({
  title,
  value,
  currency = "NGN",
  iconName,
  trend,
  variant = "default",
  delay = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {formatCurrency(value, currency)}
              </p>
              {trend && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    trend.value >= 0 ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}% {trend.label}
                </p>
              )}
            </div>
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
                variantStyles[variant]
              )}
            >
              <KpiIcon name={iconName} className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
