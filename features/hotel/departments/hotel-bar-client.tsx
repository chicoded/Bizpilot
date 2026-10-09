"use client";

import { DepartmentShell, Section, NairaField, IntField, NotesField, fmt } from "./department-shell";
import { upsertBarReport } from "@/actions/hotel";
import { Wine, Plus, Trash2 } from "lucide-react";
import { Input, Button } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Form = {
  totalSales: number;
  costOfGoodsSold: number;
  itemSummary: { name: string; qtySold: number; value: number }[];
  compDrinksCount: number;
  compDrinksValue: number;
  spillageWasteCost: number;
  notes: string;
};

const EMPTY: Form = {
  totalSales: 0,
  costOfGoodsSold: 0,
  itemSummary: [],
  compDrinksCount: 0,
  compDrinksValue: 0,
  spillageWasteCost: 0,
  notes: "",
};

function loadFrom(report: any): Form {
  const r = report?.barReport;
  return {
    totalSales: Number(r?.totalSales ?? 0),
    costOfGoodsSold: Number(r?.costOfGoodsSold ?? 0),
    itemSummary: (r?.itemSummary as Form["itemSummary"]) ?? [],
    compDrinksCount: Number(r?.compDrinksCount ?? 0),
    compDrinksValue: Number(r?.compDrinksValue ?? 0),
    spillageWasteCost: Number(r?.spillageWasteCost ?? 0),
    notes: r?.notes ?? "",
  };
}

export function HotelBarClient() {
  return (
    <DepartmentShell<Form>
      title="Bar Report"
      subtitle="Drink sales, comps, spillage, and optional item summary"
      deptId="bar"
      empty={EMPTY}
      loadFromReport={loadFrom}
      onSave={async (f, date) => upsertBarReport({ reportDate: date, ...f })}
      tint="from-purple-500 to-fuchsia-600"
      icon={<Wine className="w-5 h-5" />}
      renderForm={(form, setForm) => {
        const gross = form.totalSales - form.costOfGoodsSold;
        const margin =
          form.totalSales > 0 ? Math.round((gross / form.totalSales) * 100) : 0;
        return (
          <>
            <Section title="Daily bar totals">
              <div className="grid gap-4 md:grid-cols-3">
                <NairaField
                  label="Total drink sales"
                  value={form.totalSales}
                  onChange={(v) => setForm({ ...form, totalSales: v })}
                />
                <NairaField
                  label="Cost of drinks (COGS)"
                  value={form.costOfGoodsSold}
                  onChange={(v) => setForm({ ...form, costOfGoodsSold: v })}
                />
                <NairaField
                  label="Spillage & waste cost"
                  value={form.spillageWasteCost}
                  onChange={(v) => setForm({ ...form, spillageWasteCost: v })}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60">
                  <p className="text-muted-foreground">Gross profit</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {fmt(gross)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-muted-foreground">Gross margin</p>
                  <p className="text-xl font-bold">{margin}%</p>
                </div>
              </div>
            </Section>

            <Section title="Complimentary drinks">
              <div className="grid gap-4 md:grid-cols-2">
                <IntField
                  label="Comp drinks count"
                  value={form.compDrinksCount}
                  onChange={(v) => setForm({ ...form, compDrinksCount: v })}
                />
                <NairaField
                  label="Comp drinks value"
                  value={form.compDrinksValue}
                  onChange={(v) => setForm({ ...form, compDrinksValue: v })}
                />
              </div>
            </Section>

            <Section title="Item summary (optional)">
              <ItemSummaryEditor
                value={form.itemSummary}
                onChange={(rows) => setForm({ ...form, itemSummary: rows })}
              />
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

function ItemSummaryEditor({
  value,
  onChange,
}: {
  value: { name: string; qtySold: number; value: number }[];
  onChange: (rows: { name: string; qtySold: number; value: number }[]) => void;
}) {
  const empty = { name: "", qtySold: 0, value: 0 };
  const rows = value.length ? value : [empty];
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center p-3 rounded-xl border border-border/80">
          <div className="md:col-span-5">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Drink</div>
            <Input placeholder="e.g. Strawberry Daiquiri" value={row.name} onChange={(e) => {
              const n = [...rows]; n[i] = { ...row, name: e.target.value }; onChange(n);
            }} />
          </div>
          <div className="md:col-span-2">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Qty</div>
            <Input type="number" min={0} value={String(row.qtySold)} onChange={(e) => {
              const n = [...rows]; n[i] = { ...row, qtySold: parseInt(e.target.value || "0", 10) }; onChange(n);
            }} />
          </div>
          <div className="md:col-span-4">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Value</div>
            <Input type="number" min={0} step={500} value={String(row.value)} onChange={(e) => {
              const n = [...rows]; n[i] = { ...row, value: parseInt(e.target.value || "0", 10) }; onChange(n);
            }} />
          </div>
          <div className="md:col-span-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-rose-600"
              onClick={() => {
                if (rows.length === 1) return onChange([empty]);
                onChange(rows.filter((_, j) => j !== i));
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, empty])}>
        <Plus className="w-4 h-4 mr-2" /> Add drink
      </Button>
    </div>
  );
}
