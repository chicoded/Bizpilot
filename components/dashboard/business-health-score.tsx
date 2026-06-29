"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { cn, getHealthColor, getHealthLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BusinessHealthResult } from "@/types";

interface BusinessHealthScoreProps {
  health: BusinessHealthResult;
}

export function BusinessHealthScore({ health }: BusinessHealthScoreProps) {
  const scoreColor = getHealthColor(health.score);
  const label = getHealthLabel(health.score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-biz-emerald/20 bg-gradient-to-br from-white via-white to-emerald-50/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-biz-emerald" />
              Business Health
            </CardTitle>
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Score ring */}
          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-100"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${health.score * 2.64} 264`}
                  className={scoreColor}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-bold", scoreColor)}>
                  {health.score}
                </span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
            </div>

            {/* Breakdown bars */}
            <div className="flex-1 space-y-2">
              {Object.entries(health.breakdown).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">
                      {key}
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                  <Progress value={value} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {health.strengths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Strengths
              </p>
              {health.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {health.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Warnings
              </p>
              {health.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {health.recommendations.length > 0 && (
            <div className="space-y-2 rounded-xl bg-biz-blue/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-biz-blue">
                Recommendations
              </p>
              {health.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-biz-blue" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/ai"
            className="block text-center text-sm font-medium text-biz-blue hover:underline"
          >
            Ask AI for details →
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
