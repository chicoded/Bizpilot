"use client";

import { useState } from "react";
import { DepartmentShell, Section, NairaField, IntField, NotesField, Field, fmt } from "./department-shell";
import {
  upsertReceptionReport,
} from "@/actions/hotel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, BedDouble, Trash2 } from "lucide-react";

type BookedRoomRow = { wing: string; rooms: number; value: number };
type VacantRoomRow = { wing: string; rooms: number };
type IssuedItemRow = { item: string; qty: number; cost: number };

type Form = {
  totalRooms: number;
  bookedRoomValue: number;
  complimentaryRooms: number;
  complimentaryValue: number;
  cashPayments: number;
  transferPayments: number;
  posPayments: number;
  creditPayments: number;
  bookedRooms: BookedRoomRow[];
  vacantRooms: VacantRoomRow[];
  itemsIssued: IssuedItemRow[];
  notes: string;
};

const EMPTY: Form = {
  totalRooms: 12,
  bookedRoomValue: 0,
  complimentaryRooms: 0,
  complimentaryValue: 0,
  cashPayments: 0,
  transferPayments: 0,
  posPayments: 0,
  creditPayments: 0,
  bookedRooms: [{ wing: "", rooms: 0, value: 0 }],
  vacantRooms: [{ wing: "", rooms: 0 }],
  itemsIssued: [{ item: "", qty: 0, cost: 0 }],
  notes: "",
};

function loadFrom(report: any): Form {
  const r = report?.receptionReport;
  return {
    totalRooms: Number(r?.totalRooms ?? 12),
    bookedRoomValue: Number(r?.bookedRoomValue ?? 0),
    complimentaryRooms: Number(r?.complimentaryRooms ?? 0),
    complimentaryValue: Number(r?.complimentaryValue ?? 0),
    cashPayments: Number(r?.cashPayments ?? 0),
    transferPayments: Number(r?.transferPayments ?? 0),
    posPayments: Number(r?.posPayments ?? 0),
    creditPayments: Number(r?.creditPayments ?? 0),
    bookedRooms: Array.isArray(r?.bookedRooms) && r.bookedRooms.length
      ? r.bookedRooms
      : [{ wing: "", rooms: 0, value: 0 }],
    vacantRooms: Array.isArray(r?.vacantRooms) && r.vacantRooms.length
      ? r.vacantRooms
      : [{ wing: "", rooms: 0 }],
    itemsIssued: Array.isArray(r?.itemsIssued) && r.itemsIssued.length
      ? r.itemsIssued
      : [{ item: "", qty: 0, cost: 0 }],
    notes: r?.notes ?? "",
  };
}

export function HotelReceptionClient() {
  return (
    <DepartmentShell<Form>
      title="Reception Report"
      subtitle="Rooms, payments received, booked & vacant rooms, items issued"
      deptId="reception"
      empty={EMPTY}
      loadFromReport={loadFrom}
      onSave={async (f, date) => upsertReceptionReport({ reportDate: date, ...f })}
      tint="from-sky-500 to-blue-600"
      icon={<BedDouble className="w-5 h-5" />}
      renderForm={(form, setForm) => {
        const paymentsTotal =
          form.cashPayments +
          form.transferPayments +
          form.posPayments +
          form.creditPayments;
        const bookedRoomsCount = form.bookedRooms.reduce(
          (s, r) => s + (r.rooms || 0),
          0
        );
        const bookedRoomsValueSum = form.bookedRooms.reduce(
          (s, r) => s + (r.value || 0),
          0
        );
        const vacantRoomsCount = form.vacantRooms.reduce(
          (s, r) => s + (r.rooms || 0),
          0
        );

        return (
          <>
            <Section title="Room reconciliation" description="Occupancy overview for the business date">
              <div className="grid gap-4 md:grid-cols-3">
                <IntField
                  label="Total rooms in hotel"
                  value={form.totalRooms}
                  onChange={(v) => setForm({ ...form, totalRooms: v })}
                />
                <NairaField
                  label="Booked-room total value"
                  value={form.bookedRoomValue}
                  onChange={(v) => setForm({ ...form, bookedRoomValue: v })}
                  hint="Value of occupied rooms (not cash received)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <IntField
                    label="Complimentary rooms"
                    value={form.complimentaryRooms}
                    onChange={(v) => setForm({ ...form, complimentaryRooms: v })}
                  />
                  <NairaField
                    label="Comp value"
                    value={form.complimentaryValue}
                    onChange={(v) => setForm({ ...form, complimentaryValue: v })}
                  />
                </div>
              </div>
            </Section>

            <Section title="Payments received today" description="Record actual cash inflow — breakdown sums to total automatically">
              <div className="grid gap-4 md:grid-cols-4">
                <NairaField
                  label="Cash"
                  value={form.cashPayments}
                  onChange={(v) => setForm({ ...form, cashPayments: v })}
                />
                <NairaField
                  label="Bank transfer"
                  value={form.transferPayments}
                  onChange={(v) => setForm({ ...form, transferPayments: v })}
                />
                <NairaField
                  label="POS terminal"
                  value={form.posPayments}
                  onChange={(v) => setForm({ ...form, posPayments: v })}
                />
                <NairaField
                  label="Credit / room charge"
                  value={form.creditPayments}
                  onChange={(v) => setForm({ ...form, creditPayments: v })}
                />
              </div>
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Total payments received
                  </p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {fmt(paymentsTotal)}
                  </p>
                </div>
              </div>
            </Section>

            <Section
              title="Booked rooms — grouped by wing"
              description="Number of rooms and their value per wing"
            >
              <DynamicTable<BookedRoomRow>
                columns={[
                  { key: "wing", label: "Wing / block", render: (r, set) => (
                    <Input
                      placeholder="e.g. Wing A, First Floor"
                      value={r.wing}
                      onChange={(e) => set({ ...r, wing: e.target.value })}
                    />
                  )},
                  { key: "rooms", label: "Rooms booked", render: (r, set) => (
                    <Input
                      type="number"
                      min={0}
                      value={String(r.rooms)}
                      onChange={(e) =>
                        set({ ...r, rooms: parseInt(e.target.value || "0", 10) })
                      }
                    />
                  )},
                  { key: "value", label: "Value (₦)", render: (r, set) => (
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      value={String(r.value)}
                      onChange={(e) =>
                        set({ ...r, value: parseInt(e.target.value || "0", 10) })
                      }
                    />
                  )},
                ]}
                emptyRow={{ wing: "", rooms: 0, value: 0 }}
                rows={form.bookedRooms}
                setRows={(rows) => setForm({ ...form, bookedRooms: rows })}
                rowKey={(r, i) => `${r.wing}-${i}`}
              />
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <Summary label="Total rooms booked" value={String(bookedRoomsCount)} />
                <Summary label="Room value from groups" value={fmt(bookedRoomsValueSum)} highlight />
                <Summary label="Net available rooms" value={String(Math.max(0, form.totalRooms - bookedRoomsCount - form.complimentaryRooms))} />
              </div>
            </Section>

            <Section title="Vacant rooms — grouped by wing">
              <DynamicTable<VacantRoomRow>
                columns={[
                  { key: "wing", label: "Wing / block", render: (r, set) => (
                    <Input
                      placeholder="Wing A"
                      value={r.wing}
                      onChange={(e) => set({ ...r, wing: e.target.value })}
                    />
                  )},
                  { key: "rooms", label: "Vacant rooms", render: (r, set) => (
                    <Input
                      type="number"
                      min={0}
                      value={String(r.rooms)}
                      onChange={(e) =>
                        set({ ...r, rooms: parseInt(e.target.value || "0", 10) })
                      }
                    />
                  )},
                ]}
                emptyRow={{ wing: "", rooms: 0 }}
                rows={form.vacantRooms}
                setRows={(rows) => setForm({ ...form, vacantRooms: rows })}
                rowKey={(r, i) => `v-${r.wing}-${i}`}
              />
              <div className="mt-3 text-sm">
                Vacant rooms total:{" "}
                <span className="font-semibold">{vacantRoomsCount}</span>
              </div>
            </Section>

            <Section title="Items issued from store to front desk">
              <DynamicTable<IssuedItemRow>
                columns={[
                  { key: "item", label: "Item", render: (r, set) => (
                    <Input
                      placeholder="Room key card, soap packs…"
                      value={r.item}
                      onChange={(e) => set({ ...r, item: e.target.value })}
                    />
                  )},
                  { key: "qty", label: "Qty", render: (r, set) => (
                    <Input
                      type="number"
                      min={0}
                      value={String(r.qty)}
                      onChange={(e) =>
                        set({ ...r, qty: parseInt(e.target.value || "0", 10) })
                      }
                    />
                  )},
                  { key: "cost", label: "Unit cost (₦)", render: (r, set) => (
                    <Input
                      type="number"
                      min={0}
                      value={String(r.cost)}
                      onChange={(e) =>
                        set({ ...r, cost: parseInt(e.target.value || "0", 10) })
                      }
                    />
                  )},
                ]}
                emptyRow={{ item: "", qty: 0, cost: 0 }}
                rows={form.itemsIssued}
                setRows={(rows) => setForm({ ...form, itemsIssued: rows })}
                rowKey={(r, i) => `i-${r.item}-${i}`}
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

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-xl border border-border bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold mt-0.5 ${highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function DynamicTable<R extends object>({
  columns,
  emptyRow,
  rows,
  setRows,
  rowKey,
}: {
  columns: { key: string; label: string; render: (row: R, setRow: (r: R) => void) => React.ReactNode }[];
  emptyRow: R;
  rows: R[];
  setRows: (rows: R[]) => void;
  rowKey: (row: R, index: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="hidden md:grid gap-3 px-2 text-xs text-muted-foreground"
           style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 44px` }}>
        {columns.map((c) => (
          <Label key={c.key}>{c.label}</Label>
        ))}
        <div />
      </div>
      {rows.map((row, i) => (
        <div
          key={rowKey(row, i)}
          className="grid gap-3 md:gap-3 items-start md:items-center p-3 rounded-xl border border-border/80"
          style={{ gridTemplateColumns: `1fr ${columns.length > 1 ? '1fr' : ''} ${columns.length > 2 ? '1fr' : ''} 36px` }}
        >
          {columns.map((c) => (
            <div key={c.key} className="md:block">
              <div className="md:hidden text-xs text-muted-foreground mb-1">{c.label}</div>
              {c.render(row, (nr) => {
                const next = [...rows];
                next[i] = nr;
                setRows(next);
              })}
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 md:mt-0 w-9 h-9 text-muted-foreground hover:text-rose-600"
            onClick={() => {
              if (rows.length === 1) return setRows([emptyRow]);
              setRows(rows.filter((_, j) => j !== i));
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRows([...rows, emptyRow])}
      >
        <Plus className="w-4 h-4 mr-2" /> Add row
      </Button>
    </div>
  );
}
