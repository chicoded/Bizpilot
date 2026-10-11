"use client";

import { DepartmentShell, Section, NairaField, IntField, NotesField, fmt } from "./department-shell";
import { upsertKitchenReport } from "@/actions/hotel";
import { ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Form = {
  totalSales: number;
  costOfGoodsSold: number;
  wasteCost: number;
  itemSummary: { name: string; qtySold: number; value: number }[];
  compMealsCount: number;
  compMealsValue: number;
  staffMealsCount: number;
  staffMealsValue: number;
  notes: string;
};

const EMPTY: Form = {
  totalSales: 0,
  costOfGoodsSold: 0,
  wasteCost: 0,
  itemSummary: [],
  compMealsCount: 0,
  compMealsValue: 0,
  staffMealsCount: 0,
  staffMealsValue: 0,
  notes: "",
};

function loadFrom(report: any): Form {
  const r = report?.kitchenReport;
  return {
    totalSales: Number(r?.totalSales ?? 0),
    costOfGoodsSold: Number(r?.costOfGoodsSold ?? 0),
    wasteCost: Number(r?.wasteCost ?? 0),
    itemSummary: (r?.itemSummary as Form["itemSummary"]) ?? [],
    compMealsCount: Number(r?.compMealsCount ?? 0),
    compMealsValue: Number(r?.compMealsValue ?? 0),
    staffMealsCount: Number(r?.staffMealsCount ?? 0),
    staffMealsValue: Number(r?.staffMealsValue ?? 0),
    notes: r?.notes ?? "",
  };
}

export function HotelKitchenClient() {
  return (
    <DepartmentShell<Form>
      title="Kitchen Report"
      subtitle="Food sales totals, comp meals, waste, and optional item summary"
      deptId="kitchen"
      empty={EMPTY}
      loadFromReport={loadFrom}
      onSave={async (f, date) => upsertKitchenReport({ reportDate: date, ...f })}
      tint="from-orange-500 to-red-600"
      icon={<ChefHat className="w-5 h-5" />}
      renderForm={(form, setForm) => {
        const grossProfit = form.totalSales - form.costOfGoodsSold;
        const margin =
          form.totalSales > 0
            ? Math.round((grossProfit / form.totalSales) * 100)
            : 0;
        return (
          <>
            <Section title="Daily totals" description="Sales cost and waste summary">
              <div className="grid gap-4 md:grid-cols-3">
                <NairaField
                  label="Total food sales"
                  value={form.totalSales}
                  onChange={(v) => setForm({ ...form, totalSales: v })}
                />
                <NairaField
                  label="Cost of goods sold (COGS)"
                  value={form.costOfGoodsSold}
                  onChange={(v) => setForm({ ...form, costOfGoodsSold: v })}
                />
                <NairaField
                  label="Waste / spoilage cost"
                  value={form.wasteCost}
                  onChange={(v) => setForm({ ...form, wasteCost: v })}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60">
                  <p className="text-muted-foreground">Gross profit</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {fmt(grossProfit)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-muted-foreground">Gross margin</p>
                  <p className="text-xl font-bold">{margin}%</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-muted-foreground">Total comp + staff meals value</p>
                  <p className="text-xl font-bold">
                    {fmt(form.compMealsValue + form.staffMealsValue)}
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Complimentary & staff meals" description="Track meals given free or to staff">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <IntField
                    label="Complimentary meals (count)"
                    value={form.compMealsCount}
                    onChange={(v) => setForm({ ...form, compMealsCount: v })}
                  />
                  <NairaField
                    label="Comp meals value"
                    value={form.compMealsValue}
                    onChange={(v) => setForm({ ...form, compMealsValue: v })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <IntField
                    label="Staff meals (count)"
                    value={form.staffMealsCount}
                    onChange={(v) => setForm({ ...form, staffMealsCount: v })}
                  />
                  <NairaField
                    label="Staff meals value"
                    value={form.staffMealsValue}
                    onChange={(v) => setForm({ ...form, staffMealsValue: v })}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Item summary (optional)"
              description="Summarised best sellers or top items — full detail not required"
            >
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
      <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-xs text-muted-foreground">
        <div className="md:col-span-5"><Label>Item</Label></div>
        <div className="md:col-span-2"><Label>Qty sold</Label></div>
        <div className="md:col-span-4"><Label>Sale value (₦)</Label></div>
        <div className="md:col-span-1" />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center p-3 rounded-xl border border-border/80">
          <div className="md:col-span-5">
            <div className="md:hidden text-xs text-muted-foreground mb-1">Item</div>
            <Input placeholder="e.g. Lustro Haven" value={row.name} onChange={(e) => {
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
        <Plus className="w-4 h-4 mr-2" /> Add item
      </Button>
    </div>
  );
}
