"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocalData } from "@/components/providers/local-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/ui/status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Save,
  Send,
  Undo2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { getDailyReport, submitDepartment } from "@/actions/hotel";
import { formatNGN } from "@/lib/hotel-utils";
import { startTransition } from "react";

export interface DepartmentShellProps<T> {
  title: string;
  subtitle: string;
  deptId: "reception" | "kitchen" | "bar" | "spa" | "store";
  empty: T;
  loadFromReport: (report: any) => T;
  onSave: (form: T, date: string) => Promise<any>;
  renderForm: (
    form: T,
    setForm: (f: T) => void
  ) => ReactNode;
  tint: string;
  icon: ReactNode;
}

const STATUS_STYLES: Record<string, "default" | "warning" | "success" | "info"> = {
  DRAFT: "default",
  SUBMITTED: "info",
  RETURNED: "warning",
  APPROVED: "success",
};

const STATUS_FIELD_KEY = {
  reception: "receptionStatus",
  kitchen: "kitchenStatus",
  bar: "barStatus",
  spa: "spaStatus",
  store: "storeStatus",
} as const;

const RETURN_NOTE_KEY = {
  reception: "reception",
  kitchen: "kitchen",
  bar: "bar",
  spa: "spa",
  store: "store",
} as const;

export function DepartmentShell<T extends object>({
  title,
  subtitle,
  deptId,
  empty,
  loadFromReport,
  onSave,
  renderForm,
  tint,
  icon,
}: DepartmentShellProps<T>) {
  const { status: ctxStatus } = useLocalData();
  const params = useSearchParams();
  const today = new Date();
  const initialDate =
    params.get("date") ??
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const [reportDate, setReportDate] = useState(initialDate);
  const [form, setForm] = useState<T>(empty);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "submitting" | "done">(
    "idle"
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(
    async (date: string) => {
      setLoading(true);
      try {
        const r = await getDailyReport(date);
        setReport(r);
        if (r) {
          setForm(loadFromReport(r) ?? empty);
        } else {
          setForm(empty);
        }
      } finally {
        setLoading(false);
      }
    },
    [empty, loadFromReport]
  );

  useEffect(() => {
    if (ctxStatus === "ready") void load(reportDate);
  }, [ctxStatus, reportDate, load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form, reportDate);
      setSavedAt(new Date().toLocaleTimeString());
      startTransition(() => load(reportDate));
    } finally {
      setSaving(false);
    }
  }, [form, reportDate, onSave, load]);

  const submit = useCallback(async () => {
    setSubmitState("submitting");
    try {
      await onSave(form, reportDate);
      await submitDepartment(reportDate, deptId);
      setSavedAt(new Date().toLocaleTimeString());
      startTransition(() => load(reportDate));
    } finally {
      setSubmitState("idle");
    }
  }, [form, reportDate, deptId, onSave, load]);

  const status = report ? report[STATUS_FIELD_KEY[deptId]] : "DRAFT";
  const returnNotes = report?.returnNotes?.[RETURN_NOTE_KEY[deptId]] ?? null;

  if (loading || !report) {
    return (
      <AppShell title={title} subtitle="Loading…" maxWidth="wide">
        <Skeleton className="h-96 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      maxWidth="wide"
      actions={
        <Link href={`/hotel/reports?date=${reportDate}`} className="print:hidden">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      }
    >
      <Card className="mb-6 print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl text-white bg-gradient-to-br ${tint}`}>
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label>Business date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                </div>
                {savedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Saved {savedAt}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusChip variant={STATUS_STYLES[status] ?? "default"}>
                {status}
              </StatusChip>
              <Button
                variant="outline"
                onClick={() => void save()}
                disabled={saving || submitState === "submitting"}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Save draft
              </Button>
              <Button
                onClick={() => void submit()}
                disabled={
                  saving ||
                  submitState === "submitting" ||
                  status === "APPROVED"
                }
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit to management
              </Button>
            </div>
          </div>

          {returnNotes && (
            <div className="mt-5 p-4 rounded-xl border border-amber-300/50 bg-amber-50/70 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <Undo2 className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Report returned — please correct
                  </p>
                  <p className="text-sm mt-1 text-amber-800/80 dark:text-amber-200/80 whitespace-pre-wrap">
                    {returnNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {renderForm(form, setForm)}
    </AppShell>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NairaField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  placeholder?: string;
  min?: number;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
          ₦
        </span>
        <Input
          type="number"
          className="pl-8"
          min={props.min ?? 0}
          step="100"
          placeholder={props.placeholder ?? "0"}
          value={String(props.value)}
          onChange={(e) => props.onChange(Number(e.target.value || 0))}
        />
      </div>
    </Field>
  );
}

export function IntField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <Input
        type="number"
        min={props.min ?? 0}
        step="1"
        value={String(props.value)}
        onChange={(e) => props.onChange(Math.max(props.min ?? 0, parseInt(e.target.value || "0", 10)))}
      />
    </Field>
  );
}

export function NotesField(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Notes (optional)">
      <Textarea
        rows={3}
        placeholder="Any additional notes for management…"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

export const fmt = formatNGN;
