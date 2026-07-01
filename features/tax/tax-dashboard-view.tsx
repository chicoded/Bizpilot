"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaxDisclaimer, TaxInsightIcon } from "@/components/tax/tax-disclaimer";
import { formatCurrency } from "@/lib/utils";
import type { TaxDashboardData } from "@/types/tax";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  Settings,
  Shield,
  TrendingUp,
} from "lucide-react";
import { TaxExportButtons } from "@/features/tax/tax-export-buttons";

interface TaxDashboardViewProps {
  data: TaxDashboardData;
  currency: string;
}

export function TaxDashboardView({ data, currency }: TaxDashboardViewProps) {
  const complianceLabel =
    data.compliance.score >= 85
      ? "Good"
      : data.compliance.score >= 60
        ? "Needs attention"
        : "Incomplete";

  return (
    <div className="space-y-4">
      <TaxDisclaimer />

      {!data.profileComplete && (
        <Card className="border-biz-blue/30 bg-biz-blue/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Complete your tax profile</p>
              <p className="text-sm text-muted-foreground">
                Configure registration and VAT settings for better estimates.
              </p>
            </div>
            <Button asChild>
              <Link href="/tax/settings">
                <Settings className="h-4 w-4" />
                Tax settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TaxKpiCard
          label="Today's revenue"
          value={formatCurrency(data.today.revenue, currency)}
        />
        <TaxKpiCard
          label="Est. VAT today"
          value={
            data.today.vatEnabled
              ? formatCurrency(data.today.vatCollected, currency)
              : "N/A"
          }
          hint={data.today.vatEnabled ? `${(data.today.vatRate * 100).toFixed(1)}% rate` : "VAT off"}
        />
        <TaxKpiCard
          label="Est. profit today"
          value={formatCurrency(data.today.profit, currency)}
        />
        <TaxKpiCard
          label="Est. tax today"
          value={formatCurrency(data.today.estimatedTax, currency)}
          accent
        />
      </div>

      {data.monthly && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">This month (estimate)</p>
              <span className="text-xs text-muted-foreground">
                Confidence {data.monthly.confidence}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Revenue" value={formatCurrency(data.monthly.estimatedRevenue, currency)} />
              <Stat label="Expenses" value={formatCurrency(data.monthly.estimatedExpenses, currency)} />
              <Stat label="Profit" value={formatCurrency(data.monthly.estimatedProfit, currency)} />
              <Stat label="VAT collected" value={formatCurrency(data.monthly.estimatedVATCollected, currency)} />
              <Stat
                label="Tax estimate"
                value={formatCurrency(data.monthly.estimatedTax, currency)}
                className="col-span-2 font-semibold text-biz-blue"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-biz-blue" />
              <p className="font-semibold">Compliance score</p>
              <span className="ml-auto text-2xl font-bold text-biz-blue">
                {data.compliance.score}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{complianceLabel}</p>
            <ul className="space-y-2">
              {data.compliance.checks.map((check) => (
                <li key={check.id} className="flex items-center gap-2 text-sm">
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <CircleAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  <span className={check.passed ? "" : "text-amber-800"}>
                    {check.label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-biz-emerald" />
              <p className="font-semibold">Tax forecast (estimate)</p>
            </div>
            <p className="text-xs text-muted-foreground">
              If current pace continues this year
            </p>
            <div className="space-y-2 text-sm">
              <Stat
                label="Projected annual revenue"
                value={formatCurrency(data.forecast.projectedAnnualRevenue, currency)}
              />
              <Stat
                label="Projected annual profit"
                value={formatCurrency(data.forecast.projectedAnnualProfit, currency)}
              />
              <Stat
                label="Projected annual tax"
                value={formatCurrency(data.forecast.projectedAnnualTax, currency)}
                className="font-semibold text-biz-blue"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              YTD revenue: {formatCurrency(data.forecast.ytdRevenue, currency)} · VAT
              threshold guide: {formatCurrency(data.forecast.vatThreshold, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.insights.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold">AI insights & reminders</p>
            <ul className="space-y-3">
              {data.insights.map((insight) => (
                <li
                  key={insight.id}
                  className="flex gap-3 rounded-xl border bg-slate-50/50 p-3 text-sm"
                >
                  <TaxInsightIcon type={insight.type} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-muted-foreground mt-0.5">{insight.message}</p>
                    {insight.actionHref && (
                      <Link
                        href={insight.actionHref}
                        className="inline-flex items-center gap-1 text-biz-blue text-xs font-medium mt-2 hover:underline"
                      >
                        {insight.actionLabel ?? "View"}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-biz-blue" />
            <div>
              <p className="font-semibold">Tax reports</p>
              <p className="text-sm text-muted-foreground">
                Download estimate summaries (PDF or Excel)
              </p>
            </div>
          </div>
          <TaxExportButtons />
        </CardContent>
      </Card>
    </div>
  );
}

function TaxKpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-xl font-bold mt-1 ${accent ? "text-biz-blue" : ""}`}
        >
          {value}
        </p>
        {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
