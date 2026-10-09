"use client";

import { DepartmentShell, Section, NairaField, NotesField, fmt } from "./department-shell";
import { upsertStoreReport, hotelStoreCategories } from "@/actions/hotel";
import { Warehouse, Plus, Trash2, Upload, ArrowRightLeft } from "lucide-react";
import { Input, Button } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HotelStoreCategory } from "@prisma/client";

type CatRow = {
  category: HotelStoreCategory | "";
  openingQty: number;
  purchases: number;
  receipts: number;
  issues: number;
  closingQty: number;
  value: number;
};

type PurchaseRow = {
  category: HotelStoreCategory | "";
  item: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  invoiceNo: string;
};

type IssueRow = {
  category: HotelStoreCategory | "";
  item: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  issuedTo: string;
};

type AdjustmentRow = {
  category: HotelStoreCategory | "";
  item: string;
  qtyDiff: number;
  reason: string;
  costImpact: number;
};

type Form = {
  openingStockValue: number;
  purchasesValue: number;
  receiptsValue: number;
  issuesValue: number;
  closingStockValue: number;
  categoryBreakdown: CatRow[];
  purchaseItems: PurchaseRow[];
  issueItems: IssueRow[];
  adjustmentItems: AdjustmentRow[];
  notes: string;
};

const CATS: { value: HotelStoreCategory; label: string }[] = hotelStoreCategories() as any;

const EMPTY: Form = {
  openingStockValue: 0,
  purchasesValue: 0,
  receiptsValue: 0,
  issuesValue: 0,
  closingStockValue: 0,
  categoryBreakdown: CATS.map((c) => ({
    category: c.value,
    openingQty: 0,
    purchases: 0,
    receipts: 0,
    issues: 0,
    closingQty: 0,
    value: 0,
  })),
  purchaseItems: [{ category: "", item: "", qty: 0, unitCost: 0, totalCost: 0, supplier: "", invoiceNo: "" }],
  issueItems: [{ category: "", item: "", qty: 0, unitCost: 0, totalCost: 0, issuedTo: "Kitchen" }],
  adjustmentItems: [],
  notes: "",
};

function loadFrom(report: any): Form {
  const r = report?.storeReport;
  if (!r) return EMPTY;
  return {
    openingStockValue: Number(r.openingStockValue ?? 0),
    purchasesValue: Number(r.purchasesValue ?? 0),
    receiptsValue: Number(r.receiptsValue ?? 0),
    issuesValue: Number(r.issuesValue ?? 0),
    closingStockValue: Number(r.closingStockValue ?? 0),
    categoryBreakdown: (r.categoryBreakdown as CatRow[]) ?? EMPTY.categoryBreakdown,
    purchaseItems: (r.purchaseItems as PurchaseRow[]) ?? EMPTY.purchaseItems,
    issueItems: (r.issueItems as IssueRow[]) ?? EMPTY.issueItems,
    adjustmentItems: (r.adjustmentItems as AdjustmentRow[]) ?? EMPTY.adjustmentItems,
    notes: r.notes ?? "",
  };
}

export function HotelStoreClient() {
  return (
    <DepartmentShell<Form>
      title="Stores & Issuance"
      subtitle="Issue stock to Kitchen/Spa/Reception. Purchases, receipts, closing by category."
      deptId="store"
      empty={EMPTY}
      loadFromReport={loadFrom}
      onSave={async (f, date) => upsertStoreReport({ reportDate: date, ...f })}
      tint="from-amber-500 to-yellow-600"
      icon={<Warehouse className="w-5 h-5" />}
      renderForm={(form, setForm) => {
        const flowCheck =
          form.openingStockValue + form.purchasesValue + form.receiptsValue - form.issuesValue;
        const diff = flowCheck - form.closingStockValue;

        const catPurchases = form.categoryBreakdown.reduce((s, c) => s + c.purchases * (c.value / Math.max(1, c.closingQty || 1)) * 0, 0);
        const sumPurchaseDetail = form.purchaseItems.reduce((s, r) => s + (r.totalCost || r.qty * r.unitCost), 0);
        const sumIssueDetail = form.issueItems.reduce((s, r) => s + (r.totalCost || r.qty * r.unitCost), 0);

        return (
          <>
            <Section title="Daily stock flow values (₦)" description="Top-level figures">
              <div className="grid gap-4 md:grid-cols-5">
                <NairaField
                  label="Opening stock value"
                  value={form.openingStockValue}
                  onChange={(v) => setForm({ ...form, openingStockValue: v })}
                />
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Upload className="w-3 h-3" /> Purchases
                  </div>
                  <div className="space-y-1">
                    <NairaField
                      label=""
                      value={form.purchasesValue}
                      onChange={(v) => setForm({ ...form, purchasesValue: v })}
                    />
                    {Math.abs(sumPurchaseDetail - form.purchasesValue) > 1 && (
                      <p className="text-xs text-amber-600">
                        Detail totals {fmt(sumPurchaseDetail)}
                      </p>
                    )}
                  </div>
                </div>
                <NairaField
                  label="Receipts (returns in)"
                  value={form.receiptsValue}
                  onChange={(v) => setForm({ ...form, receiptsValue: v })}
                />
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <ArrowRightLeft className="w-3 h-3" /> Issues (out)
                  </div>
                  <div className="space-y-1">
                    <NairaField
                      label=""
                      value={form.issuesValue}
                      onChange={(v) => setForm({ ...form, issuesValue: v })}
                    />
                    {Math.abs(sumIssueDetail - form.issuesValue) > 1 && (
                      <p className="text-xs text-amber-600">
                        Detail totals {fmt(sumIssueDetail)}
                      </p>
                    )}
                  </div>
                </div>
                <NairaField
                  label="Closing stock value"
                  value={form.closingStockValue}
                  onChange={(v) => setForm({ ...form, closingStockValue: v })}
                />
              </div>
              <div className="mt-4 p-4 rounded-xl bg-card border border-border text-sm">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <span className="text-muted-foreground">Formula check: Opening + Purchases + Receipts − Issues = </span>
                    <span className="font-semibold">{fmt(flowCheck)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">vs Closing: </span>
                    <span className={`font-semibold ${Math.abs(diff) > 500 ? "text-rose-600" : "text-emerald-600"}`}>
                      {fmt(form.closingStockValue)} · diff {fmt(diff)}
                    </span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Per-category quantities — exactly 5 categories" description="Housekeeping · Kitchen · Spa · Laundry · Other">
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-xs text-muted-foreground">
                  <div className="md:col-span-2">Category</div>
                  <div className="md:col-span-1 text-right">Opening</div>
                  <div className="md:col-span-1 text-right">+ Purchased</div>
                  <div className="md:col-span-1 text-right">+ Received</div>
                  <div className="md:col-span-1 text-right">− Issued</div>
                  <div className="md:col-span-1 text-right">= Closing</div>
                  <div className="md:col-span-3 text-right">Closing value (₦)</div>
                </div>
                {form.categoryBreakdown.map((row, i) => {
                  const expected =
                    row.openingQty + row.purchases + row.receipts - row.issues;
                  return (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-3 p-3 rounded-xl border border-border/80">
                      <div className="col-span-2 md:col-span-2">
                        <div className="md:hidden text-xs text-muted-foreground mb-1">Category</div>
                        <div className="font-medium text-sm py-2">
                          {CATS.find((c) => c.value === row.category)?.label ?? row.category}
                        </div>
                      </div>
                      {[
                        ["openingQty", "Opening"] as const,
                        ["purchases", "+ Purch"] as const,
                        ["receipts", "+ Recv"] as const,
                        ["issues", "− Issue"] as const,
                        ["closingQty", "= Close"] as const,
                      ].map(([key, label]) => (
                        <div key={key} className="md:col-span-1">
                          <div className="md:hidden text-xs text-muted-foreground mb-1">{label}</div>
                          <Input
                            type="number"
                            min={0}
                            value={String((row as any)[key])}
                            onChange={(e) => {
                              const n = [...form.categoryBreakdown];
                              n[i] = { ...row, [key]: parseInt(e.target.value || "0", 10) };
                              setForm({ ...form, categoryBreakdown: n });
                            }}
                          />
                        </div>
                      ))}
                      <div className="col-span-2 md:col-span-3">
                        <div className="md:hidden text-xs text-muted-foreground mb-1">Value (₦)</div>
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={String(row.value)}
                          onChange={(e) => {
                            const n = [...form.categoryBreakdown];
                            n[i] = { ...row, value: parseInt(e.target.value || "0", 10) };
                            setForm({ ...form, categoryBreakdown: n });
                          }}
                        />
                      </div>
                      <div className="md:col-span-1 flex items-start md:items-center justify-end">
                        {expected !== row.closingQty && (
                          <span className="text-xs text-rose-600">Qty check: expect {expected}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Purchase receipts" description="New stock bought in — does not double-count internal transfers">
              <LineEditor<PurchaseRow>
                emptyRow={{ category: "", item: "", qty: 0, unitCost: 0, totalCost: 0, supplier: "", invoiceNo: "" }}
                rows={form.purchaseItems}
                setRows={(rows) => setForm({ ...form, purchaseItems: rows })}
                columns={[
                  {
                    key: "category",
                    label: "Category",
                    render: (r, set) => (
                      <Select
                        value={r.category || undefined}
                        onValueChange={(v) => set({ ...r, category: v as HotelStoreCategory })}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
                        <SelectContent>
                          {CATS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                    md: 2,
                  },
                  {
                    key: "item",
                    label: "Item",
                    render: (r, set) => (
                      <Input placeholder="Detergent 5L" value={r.item}
                        onChange={(e) => set({ ...r, item: e.target.value })} />
                    ),
                    md: 2,
                  },
                  {
                    key: "qty",
                    label: "Qty",
                    render: (r, set) => (
                      <Input type="number" min={0} value={String(r.qty)}
                        onChange={(e) => {
                          const q = parseInt(e.target.value || "0", 10);
                          set({ ...r, qty: q, totalCost: q * r.unitCost });
                        }} />
                    ),
                    md: 1,
                  },
                  {
                    key: "unitCost",
                    label: "Unit ₦",
                    render: (r, set) => (
                      <Input type="number" min={0} step={50} value={String(r.unitCost)}
                        onChange={(e) => {
                          const u = parseInt(e.target.value || "0", 10);
                          set({ ...r, unitCost: u, totalCost: u * r.qty });
                        }} />
                    ),
                    md: 1,
                  },
                  {
                    key: "totalCost",
                    label: "Total ₦",
                    render: (r, set) => (
                      <Input type="number" min={0} step={500} value={String(r.totalCost)}
                        onChange={(e) => set({ ...r, totalCost: parseInt(e.target.value || "0", 10) })} />
                    ),
                    md: 2,
                  },
                  {
                    key: "supplier",
                    label: "Supplier",
                    render: (r, set) => (
                      <Input placeholder="Supplier name" value={r.supplier}
                        onChange={(e) => set({ ...r, supplier: e.target.value })} />
                    ),
                    md: 2,
                  },
                  {
                    key: "invoiceNo",
                    label: "Invoice #",
                    render: (r, set) => (
                      <Input placeholder="INV-001" value={r.invoiceNo}
                        onChange={(e) => set({ ...r, invoiceNo: e.target.value })} />
                    ),
                    md: 1,
                  },
                ]}
              />
              <p className="text-sm mt-3 text-muted-foreground">
                Purchases detail sum:{" "}
                <span className="font-semibold text-foreground">
                  {fmt(sumPurchaseDetail)}
                </span>
              </p>
            </Section>

            <Section title="Issues / items issued out to departments" description="Internal transfers — not counted as expenses">
              <LineEditor<IssueRow>
                emptyRow={{ category: "", item: "", qty: 0, unitCost: 0, totalCost: 0, issuedTo: "Kitchen" }}
                rows={form.issueItems}
                setRows={(rows) => setForm({ ...form, issueItems: rows })}
                columns={[
                  {
                    key: "category",
                    label: "Category",
                    render: (r, set) => (
                      <Select
                        value={r.category || undefined}
                        onValueChange={(v) => set({ ...r, category: v as HotelStoreCategory })}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
                        <SelectContent>
                          {CATS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                    md: 2,
                  },
                  {
                    key: "item",
                    label: "Item",
                    render: (r, set) => (
                      <Input placeholder="Towels, soap…" value={r.item}
                        onChange={(e) => set({ ...r, item: e.target.value })} />
                    ),
                    md: 3,
                  },
                  {
                    key: "qty",
                    label: "Qty",
                    render: (r, set) => (
                      <Input type="number" min={0} value={String(r.qty)}
                        onChange={(e) => {
                          const q = parseInt(e.target.value || "0", 10);
                          set({ ...r, qty: q, totalCost: q * r.unitCost });
                        }} />
                    ),
                    md: 1,
                  },
                  {
                    key: "unitCost",
                    label: "Unit ₦",
                    render: (r, set) => (
                      <Input type="number" min={0} step={50} value={String(r.unitCost)}
                        onChange={(e) => {
                          const u = parseInt(e.target.value || "0", 10);
                          set({ ...r, unitCost: u, totalCost: u * r.qty });
                        }} />
                    ),
                    md: 1,
                  },
                  {
                    key: "totalCost",
                    label: "Total ₦",
                    render: (r, set) => (
                      <Input type="number" min={0} step={500} value={String(r.totalCost)}
                        onChange={(e) => set({ ...r, totalCost: parseInt(e.target.value || "0", 10) })} />
                    ),
                    md: 2,
                  },
                  {
                    key: "issuedTo",
                    label: "Issued to",
                    render: (r, set) => (
                      <Input placeholder="Kitchen / Spa / Reception" value={r.issuedTo}
                        onChange={(e) => set({ ...r, issuedTo: e.target.value })} />
                    ),
                    md: 2,
                  },
                ]}
              />
              <p className="text-sm mt-3 text-muted-foreground">
                Issues detail sum:{" "}
                <span className="font-semibold text-foreground">{fmt(sumIssueDetail)}</span>
              </p>
            </Section>

            <Section title="Stock adjustments (optional)" description="Damages, write-offs, counts">
              <LineEditor<AdjustmentRow>
                emptyRow={{ category: "", item: "", qtyDiff: 0, reason: "", costImpact: 0 }}
                rows={form.adjustmentItems}
                setRows={(rows) => setForm({ ...form, adjustmentItems: rows })}
                columns={[
                  {
                    key: "category",
                    label: "Category",
                    render: (r, set) => (
                      <Select
                        value={r.category || undefined}
                        onValueChange={(v) => set({ ...r, category: v as HotelStoreCategory })}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose" /></SelectTrigger>
                        <SelectContent>
                          {CATS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                    md: 2,
                  },
                  {
                    key: "item",
                    label: "Item",
                    render: (r, set) => (
                      <Input value={r.item} onChange={(e) => set({ ...r, item: e.target.value })} />
                    ),
                    md: 3,
                  },
                  {
                    key: "qtyDiff",
                    label: "Qty diff",
                    render: (r, set) => (
                      <Input type="number" value={String(r.qtyDiff)}
                        onChange={(e) => set({ ...r, qtyDiff: parseInt(e.target.value || "0", 10) })} />
                    ),
                    md: 1,
                  },
                  {
                    key: "reason",
                    label: "Reason",
                    render: (r, set) => (
                      <Input placeholder="Damage, theft, expiry…" value={r.reason}
                        onChange={(e) => set({ ...r, reason: e.target.value })} />
                    ),
                    md: 3,
                  },
                  {
                    key: "costImpact",
                    label: "Cost impact ₦",
                    render: (r, set) => (
                      <Input type="number" step={500} value={String(r.costImpact)}
                        onChange={(e) => set({ ...r, costImpact: parseInt(e.target.value || "0", 10) })} />
                    ),
                    md: 2,
                  },
                ]}
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

function LineEditor<R extends object>({
  rows,
  setRows,
  emptyRow,
  columns,
}: {
  rows: R[];
  setRows: (r: R[]) => void;
  emptyRow: R;
  columns: {
    key: string;
    label: string;
    render: (row: R, set: (r: R) => void) => React.ReactNode;
    md?: number;
  }[];
}) {
  const data = rows.length ? rows : [emptyRow];
  const colCount = columns.reduce((s, c) => s + (c.md ?? 1), 0) + 1;
  return (
    <div className="space-y-3">
      <div className="hidden md:grid gap-3 px-2 text-xs text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {columns.map((c) => (
          <div key={c.key} style={{ gridColumn: `span ${c.md ?? 1} / span ${c.md ?? 1}` }}>
            <Label>{c.label}</Label>
          </div>
        ))}
        <div />
      </div>
      {data.map((row, i) => (
        <div
          key={i}
          className="grid gap-3 items-start md:items-center p-3 rounded-xl border border-border/80"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {columns.map((c) => (
            <div key={c.key} style={{ gridColumn: `span ${c.md ?? 1} / span ${c.md ?? 1}` }}>
              <div className="md:hidden text-xs text-muted-foreground mb-1">{c.label}</div>
              {c.render(row, (nr) => {
                const next = [...data];
                next[i] = nr;
                setRows(next);
              })}
            </div>
          ))}
          <div className="flex justify-end items-start md:items-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-rose-600"
              onClick={() => {
                if (data.length === 1) return setRows([emptyRow]);
                setRows(data.filter((_, j) => j !== i));
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setRows([...data, emptyRow])}>
        <Plus className="w-4 h-4 mr-2" /> Add line
      </Button>
    </div>
  );
}
