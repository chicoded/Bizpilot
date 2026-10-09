"use client";

import { DepartmentShell, Section, NairaField, IntField, NotesField, fmt } from "./department-shell";
import { upsertSpaReport } from "@/actions/hotel";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { Input, Button } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TreatmentRow = {
  name: string;
  therapist: string;
  qty: number;
  value: number;
};

type TherapistStatRow = { therapist: string; revenue: number; treatments: number };
type TherapistHourRow = { therapist: string; hours: number };

type Form = {
  paidRevenue: number;
  treatmentSummary: TreatmentRow[];
  complimentaryCount: number;
  complimentaryValue: number;
  pendingServicesCount: number;
  pendingServicesValue: number;
  therapistBreakdown: TherapistStatRow[];
  therapistHoursWorked: TherapistHourRow[];
  productRetailSales: number;
  notes: string;
};

const EMPTY: Form = {
  paidRevenue: 0,
  treatmentSummary: [{ name: "", therapist: "", qty: 0, value: 0 }],
  complimentaryCount: 0,
  complimentaryValue: 0,
  pendingServicesCount: 0,
  pendingServicesValue: 0,
  therapistBreakdown: [],
  therapistHoursWorked: [],
  productRetailSales: 0,
  notes: "",
};

function loadFrom(report: any): Form {
  const r = report?.spaReport;
  return {
    paidRevenue: Number(r?.paidRevenue ?? 0),
    treatmentSummary:
      (r?.treatmentSummary as TreatmentRow[])?.length
        ? (r.treatmentSummary as TreatmentRow[])
        : [{ name: "", therapist: "", qty: 0, value: 0 }],
    complimentaryCount: Number(r?.complimentaryCount ?? 0),
    complimentaryValue: Number(r?.complimentaryValue ?? 0),
    pendingServicesCount: Number(r?.pendingServicesCount ?? 0),
    pendingServicesValue: Number(r?.pendingServicesValue ?? 0),
    therapistBreakdown: (r?.therapistBreakdown as TherapistStatRow[]) ?? [],
    therapistHoursWorked: (r?.therapistHoursWorked as TherapistHourRow[]) ?? [],
    productRetailSales: Number(r?.productRetailSales ?? 0),
    notes: r?.notes ?? "",
  };
}

export function HotelSpaClient() {
  return (
    <DepartmentShell<Form>
      title="Spa / Masseuse Report"
      subtitle="Treatment revenue, therapists, comp & pending services"
      deptId="spa"
      empty={EMPTY}
      loadFromReport={loadFrom}
      onSave={async (f, date) => upsertSpaReport({ reportDate: date, ...f })}
      tint="from-emerald-500 to-teal-600"
      icon={<Sparkles className="w-5 h-5" />}
      renderForm={(form, setForm) => {
        const totalFromTreatments = form.treatmentSummary.reduce(
          (s, r) => s + ((r.value || 0) * (r.qty || 1)),
          0
        );
        return (
          <>
            <Section title="Spa revenue & services overview">
              <div className="grid gap-4 md:grid-cols-3">
                <NairaField
                  label="Paid treatment revenue"
                  value={form.paidRevenue}
                  onChange={(v) => setForm({ ...form, paidRevenue: v })}
                  hint="Actual money received today"
                />
                <NairaField
                  label="Retail product sales"
                  value={form.productRetailSales}
                  onChange={(v) => setForm({ ...form, productRetailSales: v })}
                />
                <NairaField
                  label="Total paid spa income"
                  value={form.paidRevenue + form.productRetailSales}
                  onChange={() => {}}
                  hint="Computed — read only"
                />
              </div>
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60">
                <p className="text-sm">
                  Treatment detail sum:{" "}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {fmt(totalFromTreatments)}
                  </span>
                </p>
              </div>
            </Section>

            <Section title="Treatments performed today" description="Service, therapist, count and value">
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-xs text-muted-foreground">
                  <div className="md:col-span-4"><Label>Treatment</Label></div>
                  <div className="md:col-span-3"><Label>Therapist</Label></div>
                  <div className="md:col-span-1"><Label>Qty</Label></div>
                  <div className="md:col-span-3"><Label>Total value (₦)</Label></div>
                  <div className="md:col-span-1" />
                </div>
                {form.treatmentSummary.map((row, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center p-3 rounded-xl border border-border/80">
                    <div className="md:col-span-4">
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Treatment</div>
                      <Input
                        placeholder="Swedish 60min"
                        value={row.name}
                        onChange={(e) => {
                          const n = [...form.treatmentSummary];
                          n[i] = { ...row, name: e.target.value };
                          setForm({ ...form, treatmentSummary: n });
                        }}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Therapist</div>
                      <Input
                        placeholder="e.g. Joy"
                        value={row.therapist}
                        onChange={(e) => {
                          const n = [...form.treatmentSummary];
                          n[i] = { ...row, therapist: e.target.value };
                          setForm({ ...form, treatmentSummary: n });
                        }}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Qty</div>
                      <Input
                        type="number"
                        min={0}
                        value={String(row.qty)}
                        onChange={(e) => {
                          const n = [...form.treatmentSummary];
                          n[i] = { ...row, qty: parseInt(e.target.value || "0", 10) };
                          setForm({ ...form, treatmentSummary: n });
                        }}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <div className="md:hidden text-xs text-muted-foreground mb-1">Value</div>
                      <Input
                        type="number"
                        min={0}
                        step={500}
                        value={String(row.value)}
                        onChange={(e) => {
                          const n = [...form.treatmentSummary];
                          n[i] = { ...row, value: parseInt(e.target.value || "0", 10) };
                          setForm({ ...form, treatmentSummary: n });
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 text-muted-foreground hover:text-rose-600"
                        onClick={() => {
                          if (form.treatmentSummary.length === 1) return;
                          setForm({
                            ...form,
                            treatmentSummary: form.treatmentSummary.filter((_, j) => j !== i),
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      treatmentSummary: [
                        ...form.treatmentSummary,
                        { name: "", therapist: "", qty: 0, value: 0 },
                      ],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-2" /> Add treatment
                </Button>
              </div>
            </Section>

            <Section title="Complimentary & pending services">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <IntField
                    label="Complimentary count"
                    value={form.complimentaryCount}
                    onChange={(v) => setForm({ ...form, complimentaryCount: v })}
                  />
                  <NairaField
                    label="Comp services value"
                    value={form.complimentaryValue}
                    onChange={(v) => setForm({ ...form, complimentaryValue: v })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <IntField
                    label="Pending count"
                    value={form.pendingServicesCount}
                    onChange={(v) => setForm({ ...form, pendingServicesCount: v })}
                  />
                  <NairaField
                    label="Pending value"
                    value={form.pendingServicesValue}
                    onChange={(v) => setForm({ ...form, pendingServicesValue: v })}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Therapist breakdown (optional)"
              description="Per-therapist revenue summary and hours worked"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <TherapistStatsEditor
                  rows={form.therapistBreakdown}
                  onChange={(rows) => setForm({ ...form, therapistBreakdown: rows })}
                />
                <TherapistHoursEditor
                  rows={form.therapistHoursWorked}
                  onChange={(rows) => setForm({ ...form, therapistHoursWorked: rows })}
                />
              </div>
            </Section>

            <Section title="Notes">
              <NotesField
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
              />
            </Section>
          </>
        );
      }}
    />
  );
}

function TherapistStatsEditor({
  rows,
  onChange,
}: {
  rows: TherapistStatRow[];
  onChange: (r: TherapistStatRow[]) => void;
}) {
  const empty: TherapistStatRow = { therapist: "", revenue: 0, treatments: 0 };
  const data = rows.length ? rows : [empty];
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Therapist revenue & treatments</p>
      {data.map((r, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-10 gap-3 p-3 rounded-xl border border-border/80">
          <div className="md:col-span-4">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Therapist</div>
            <Input
              placeholder="Name"
              value={r.therapist}
              onChange={(e) => {
                const n = [...data];
                n[i] = { ...r, therapist: e.target.value };
                onChange(n);
              }}
            />
          </div>
          <div className="md:col-span-3">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Revenue</div>
            <Input
              type="number"
              min={0}
              placeholder="₦"
              value={String(r.revenue)}
              onChange={(e) => {
                const n = [...data];
                n[i] = { ...r, revenue: parseInt(e.target.value || "0", 10) };
                onChange(n);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <div className="md:hidden text-xs text-muted-foreground mb-1"># Treatments</div>
            <Input
              type="number"
              min={0}
              value={String(r.treatments)}
              onChange={(e) => {
                const n = [...data];
                n[i] = { ...r, treatments: parseInt(e.target.value || "0", 10) };
                onChange(n);
              }}
            />
          </div>
          <div className="md:col-span-1 flex justify-end items-start md:items-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-rose-600"
              onClick={() => {
                if (data.length === 1) return;
                onChange(data.filter((_, j) => j !== i));
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...data, empty])}>
        <Plus className="w-4 h-4 mr-2" /> Add
      </Button>
    </div>
  );
}

function TherapistHoursEditor({
  rows,
  onChange,
}: {
  rows: TherapistHourRow[];
  onChange: (r: TherapistHourRow[]) => void;
}) {
  const empty: TherapistHourRow = { therapist: "", hours: 0 };
  const data = rows.length ? rows : [empty];
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Therapist hours worked</p>
      {data.map((r, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-10 gap-3 p-3 rounded-xl border border-border/80">
          <div className="md:col-span-6">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Therapist</div>
            <Input
              placeholder="Name"
              value={r.therapist}
              onChange={(e) => {
                const n = [...data];
                n[i] = { ...r, therapist: e.target.value };
                onChange(n);
              }}
            />
          </div>
          <div className="md:col-span-3">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Hours</div>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={String(r.hours)}
              onChange={(e) => {
                const n = [...data];
                n[i] = { ...r, hours: parseFloat(e.target.value || "0") };
                onChange(n);
              }}
            />
          </div>
          <div className="md:col-span-1 flex justify-end items-start md:items-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-rose-600"
              onClick={() => {
                if (data.length === 1) return;
                onChange(data.filter((_, j) => j !== i));
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...data, empty])}>
        <Plus className="w-4 h-4 mr-2" /> Add
      </Button>
    </div>
  );
}
