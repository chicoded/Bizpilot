"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIInsight } from "@/types";

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
};

const styleMap = {
  success: "border-emerald-200 bg-emerald-50/50",
  warning: "border-amber-200 bg-amber-50/50",
  danger: "border-red-200 bg-red-50/50",
  info: "border-blue-200 bg-blue-50/50",
};

const iconColorMap = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
  info: "text-blue-500",
};

interface AIInsightsWidgetProps {
  insights: AIInsight[];
}

export function AIInsightsWidget({ insights }: AIInsightsWidgetProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.type];
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                styleMap[insight.type]
              )}
            >
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", iconColorMap[insight.type])}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {insight.message}
                </p>
                {insight.action && insight.actionHref && (
                  <Link
                    href={insight.actionHref}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-biz-blue"
                  >
                    {insight.action}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
