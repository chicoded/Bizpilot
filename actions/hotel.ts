"use server";

import { prisma } from "@/lib/db";
import { requireBusinessContext, requireOwner } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import type { Role, HotelDepartment, HotelReportStatus } from "@prisma/client";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, subDays, parseISO, startOfWeek, endOfWeek } from "date-fns";

type DepartmentId = "reception" | "kitchen" | "bar" | "spa" | "store";

const DEPT_STATUS_FIELD: Record<DepartmentId, keyof {
  receptionStatus: never; kitchenStatus: never; barStatus: never; spaStatus: never; storeStatus: never;
}> = {
  reception: "receptionStatus",
  kitchen: "kitchenStatus",
  bar: "barStatus",
  spa: "spaStatus",
  store: "storeStatus",
};

const DEPT_SUBMITTED_BY_FIELD: Record<DepartmentId, keyof {
  receptionSubmittedBy: never; kitchenSubmittedBy: never; barSubmittedBy: never; spaSubmittedBy: never; storeSubmittedBy: never;
}> = {
  reception: "receptionSubmittedBy",
  kitchen: "kitchenSubmittedBy",
  bar: "barSubmittedBy",
  spa: "spaSubmittedBy",
  store: "storeSubmittedBy",
};

const DEPT_SUBMITTED_AT_FIELD: Record<DepartmentId, keyof {
  receptionSubmittedAt: never; kitchenSubmittedAt: never; barSubmittedAt: never; spaSubmittedAt: never; storeSubmittedAt: never;
}> = {
  reception: "receptionSubmittedAt",
  kitchen: "kitchenSubmittedAt",
  bar: "barSubmittedAt",
  spa: "spaSubmittedAt",
  store: "storeSubmittedAt",
};

function canSubmitDepartment(role: Role, dept: DepartmentId): boolean {
  // OWNER and MANAGER can submit anything (management override)
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "CASHIER") return dept === "reception" || dept === "bar";
  if (role === "STAFF") return dept === "kitchen" || dept === "spa" || dept === "store";
  return false;
}

function canManageHotel(role: Role): boolean {
  return hasPermission(role, ["OWNER", "MANAGER"]);
}

function normalizeDate(dateStr: string | Date): Date {
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  // Strip time: keep only date portion at local midnight.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function ensureDailyReport(reportDate: string | Date) {
  const ctx = await requireBusinessContext();
  const date = normalizeDate(reportDate);

  return prisma.hotelDailyReport.upsert({
    where: {
      businessId_reportDate: {
        businessId: ctx.businessId,
        reportDate: date,
      },
    },
    create: {
      businessId: ctx.businessId,
      reportDate: date,
    },
    update: {},
    include: {
      receptionReport: true,
      kitchenReport: true,
      barReport: true,
      spaReport: true,
      storeReport: true,
      expenses: true,
    },
  });
}

export async function getDailyReport(reportDate: string | Date) {
  const ctx = await requireBusinessContext();
  const date = normalizeDate(reportDate);

  const report = await prisma.hotelDailyReport.findUnique({
    where: {
      businessId_reportDate: {
        businessId: ctx.businessId,
        reportDate: date,
      },
    },
    include: {
      receptionReport: true,
      kitchenReport: true,
      barReport: true,
      spaReport: true,
      storeReport: true,
      expenses: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!report) return null;

  // Financial calculations as specified
  const receptionPayments = Number(report.receptionReport?.totalPaymentsReceived ?? 0);
  const kitchenSales = Number(report.kitchenReport?.totalSales ?? 0);
  const barSales = Number(report.barReport?.totalSales ?? 0);
  const spaPaidSales = Number(report.spaReport?.paidRevenue ?? 0);
  const totalReportedInflow = receptionPayments + kitchenSales + barSales + spaPaidSales;

  const actualExpensesPaid = report.expenses.reduce(
    (sum, e) => sum + Number(e.amountPaid),
    0
  );
  const outstandingExpenses = report.expenses.reduce(
    (sum, e) => sum + Number(e.outstanding),
    0
  );

  // Detect discrepancies
  const discrepancies: string[] = [];
  if (report.receptionReport) {
    const totalCalc =
      Number(report.receptionReport.cashPayments) +
      Number(report.receptionReport.transferPayments) +
      Number(report.receptionReport.posPayments) +
      Number(report.receptionReport.creditPayments);
    if (Math.abs(totalCalc - Number(report.receptionReport.totalPaymentsReceived)) > 0.01) {
      discrepancies.push(
        `Reception: Payments breakdown (₦${totalCalc.toLocaleString()}) ≠ Total received (₦${Number(
          report.receptionReport.totalPaymentsReceived
        ).toLocaleString()})`
      );
    }
  }

  const netReportedCashMovement = totalReportedInflow - actualExpensesPaid;

  return {
    ...report,
    totals: {
      receptionPayments,
      kitchenSales,
      barSales,
      spaPaidSales,
      totalReportedInflow,
      actualExpensesPaid,
      outstandingExpenses,
      netReportedCashMovement,
    },
    discrepancies,
  };
}

const UpsertReceptionSchema = z.object({
  reportDate: z.string().min(1),
  totalRooms: z.coerce.number().int().min(0).default(0),
  bookedRoomValue: z.coerce.number().min(0).default(0),
  complimentaryRooms: z.coerce.number().int().min(0).default(0),
  complimentaryValue: z.coerce.number().min(0).default(0),
  cashPayments: z.coerce.number().min(0).default(0),
  transferPayments: z.coerce.number().min(0).default(0),
  posPayments: z.coerce.number().min(0).default(0),
  creditPayments: z.coerce.number().min(0).default(0),
  bookedRooms: z.array(z.unknown()).default([]),
  vacantRooms: z.array(z.unknown()).default([]),
  itemsIssued: z.array(z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
});

export async function upsertReceptionReport(
  raw: z.infer<typeof UpsertReceptionSchema>
) {
  const ctx = await requireBusinessContext();
  if (!canSubmitDepartment(ctx.role, "reception")) {
    throw new Error("You are not allowed to submit reception reports");
  }
  const parsed = UpsertReceptionSchema.parse(raw);
  const date = normalizeDate(parsed.reportDate);
  const totalPaymentsReceived =
    parsed.cashPayments + parsed.transferPayments + parsed.posPayments + parsed.creditPayments;

  const report = await ensureDailyReport(date);

  const upserted = await prisma.hotelReceptionReport.upsert({
    where: { hotelDailyReportId: report.id },
    create: {
      hotelDailyReportId: report.id,
      businessId: ctx.businessId,
      totalRooms: parsed.totalRooms,
      bookedRoomValue: parsed.bookedRoomValue,
      complimentaryRooms: parsed.complimentaryRooms,
      complimentaryValue: parsed.complimentaryValue,
      totalPaymentsReceived,
      cashPayments: parsed.cashPayments,
      transferPayments: parsed.transferPayments,
      posPayments: parsed.posPayments,
      creditPayments: parsed.creditPayments,
      bookedRooms: parsed.bookedRooms as any,
      vacantRooms: parsed.vacantRooms as any,
      itemsIssued: parsed.itemsIssued as any,
      notes: parsed.notes,
    },
    update: {
      totalRooms: parsed.totalRooms,
      bookedRoomValue: parsed.bookedRoomValue,
      complimentaryRooms: parsed.complimentaryRooms,
      complimentaryValue: parsed.complimentaryValue,
      totalPaymentsReceived,
      cashPayments: parsed.cashPayments,
      transferPayments: parsed.transferPayments,
      posPayments: parsed.posPayments,
      creditPayments: parsed.creditPayments,
      bookedRooms: parsed.bookedRooms as any,
      vacantRooms: parsed.vacantRooms as any,
      itemsIssued: parsed.itemsIssued as any,
      notes: parsed.notes,
    },
  });

  return upserted;
}

const UpsertKitchenSchema = z.object({
  reportDate: z.string().min(1),
  totalSales: z.coerce.number().min(0).default(0),
  costOfGoodsSold: z.coerce.number().min(0).default(0),
  wasteCost: z.coerce.number().min(0).default(0),
  itemSummary: z.array(z.unknown()).optional(),
  compMealsCount: z.coerce.number().int().min(0).default(0),
  compMealsValue: z.coerce.number().min(0).default(0),
  staffMealsCount: z.coerce.number().int().min(0).default(0),
  staffMealsValue: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
});

export async function upsertKitchenReport(
  raw: z.infer<typeof UpsertKitchenSchema>
) {
  const ctx = await requireBusinessContext();
  if (!canSubmitDepartment(ctx.role, "kitchen")) {
    throw new Error("You are not allowed to submit kitchen reports");
  }
  const parsed = UpsertKitchenSchema.parse(raw);
  const date = normalizeDate(parsed.reportDate);
  const report = await ensureDailyReport(date);

  return prisma.hotelKitchenReport.upsert({
    where: { hotelDailyReportId: report.id },
    create: {
      hotelDailyReportId: report.id,
      businessId: ctx.businessId,
      totalSales: parsed.totalSales,
      costOfGoodsSold: parsed.costOfGoodsSold,
      wasteCost: parsed.wasteCost,
      itemSummary: parsed.itemSummary as any,
      compMealsCount: parsed.compMealsCount,
      compMealsValue: parsed.compMealsValue,
      staffMealsCount: parsed.staffMealsCount,
      staffMealsValue: parsed.staffMealsValue,
      notes: parsed.notes,
    },
    update: {
      totalSales: parsed.totalSales,
      costOfGoodsSold: parsed.costOfGoodsSold,
      wasteCost: parsed.wasteCost,
      itemSummary: parsed.itemSummary as any,
      compMealsCount: parsed.compMealsCount,
      compMealsValue: parsed.compMealsValue,
      staffMealsCount: parsed.staffMealsCount,
      staffMealsValue: parsed.staffMealsValue,
      notes: parsed.notes,
    },
  });
}

const UpsertBarSchema = z.object({
  reportDate: z.string().min(1),
  totalSales: z.coerce.number().min(0).default(0),
  costOfGoodsSold: z.coerce.number().min(0).default(0),
  itemSummary: z.array(z.unknown()).optional(),
  compDrinksCount: z.coerce.number().int().min(0).default(0),
  compDrinksValue: z.coerce.number().min(0).default(0),
  spillageWasteCost: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
});

export async function upsertBarReport(raw: z.infer<typeof UpsertBarSchema>) {
  const ctx = await requireBusinessContext();
  if (!canSubmitDepartment(ctx.role, "bar")) {
    throw new Error("You are not allowed to submit bar reports");
  }
  const parsed = UpsertBarSchema.parse(raw);
  const date = normalizeDate(parsed.reportDate);
  const report = await ensureDailyReport(date);

  return prisma.hotelBarReport.upsert({
    where: { hotelDailyReportId: report.id },
    create: {
      hotelDailyReportId: report.id,
      businessId: ctx.businessId,
      totalSales: parsed.totalSales,
      costOfGoodsSold: parsed.costOfGoodsSold,
      itemSummary: parsed.itemSummary as any,
      compDrinksCount: parsed.compDrinksCount,
      compDrinksValue: parsed.compDrinksValue,
      spillageWasteCost: parsed.spillageWasteCost,
      notes: parsed.notes,
    },
    update: {
      totalSales: parsed.totalSales,
      costOfGoodsSold: parsed.costOfGoodsSold,
      itemSummary: parsed.itemSummary as any,
      compDrinksCount: parsed.compDrinksCount,
      compDrinksValue: parsed.compDrinksValue,
      spillageWasteCost: parsed.spillageWasteCost,
      notes: parsed.notes,
    },
  });
}

const UpsertSpaSchema = z.object({
  reportDate: z.string().min(1),
  paidRevenue: z.coerce.number().min(0).default(0),
  treatmentSummary: z.array(z.unknown()).default([]),
  complimentaryCount: z.coerce.number().int().min(0).default(0),
  complimentaryValue: z.coerce.number().min(0).default(0),
  pendingServicesCount: z.coerce.number().int().min(0).default(0),
  pendingServicesValue: z.coerce.number().min(0).default(0),
  therapistBreakdown: z.array(z.unknown()).optional(),
  therapistHoursWorked: z.array(z.unknown()).optional(),
  productRetailSales: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
});

export async function upsertSpaReport(raw: z.infer<typeof UpsertSpaSchema>) {
  const ctx = await requireBusinessContext();
  if (!canSubmitDepartment(ctx.role, "spa")) {
    throw new Error("You are not allowed to submit spa reports");
  }
  const parsed = UpsertSpaSchema.parse(raw);
  const date = normalizeDate(parsed.reportDate);
  const report = await ensureDailyReport(date);

  return prisma.hotelSpaReport.upsert({
    where: { hotelDailyReportId: report.id },
    create: {
      hotelDailyReportId: report.id,
      businessId: ctx.businessId,
      paidRevenue: parsed.paidRevenue,
      treatmentSummary: parsed.treatmentSummary as any,
      complimentaryCount: parsed.complimentaryCount,
      complimentaryValue: parsed.complimentaryValue,
      pendingServicesCount: parsed.pendingServicesCount,
      pendingServicesValue: parsed.pendingServicesValue,
      therapistBreakdown: parsed.therapistBreakdown as any,
      therapistHoursWorked: parsed.therapistHoursWorked as any,
      productRetailSales: parsed.productRetailSales,
      notes: parsed.notes,
    },
    update: {
      paidRevenue: parsed.paidRevenue,
      treatmentSummary: parsed.treatmentSummary as any,
      complimentaryCount: parsed.complimentaryCount,
      complimentaryValue: parsed.complimentaryValue,
      pendingServicesCount: parsed.pendingServicesCount,
      pendingServicesValue: parsed.pendingServicesValue,
      therapistBreakdown: parsed.therapistBreakdown as any,
      therapistHoursWorked: parsed.therapistHoursWorked as any,
      productRetailSales: parsed.productRetailSales,
      notes: parsed.notes,
    },
  });
}

const UpsertStoreSchema = z.object({
  reportDate: z.string().min(1),
  openingStockValue: z.coerce.number().min(0).default(0),
  purchasesValue: z.coerce.number().min(0).default(0),
  receiptsValue: z.coerce.number().min(0).default(0),
  issuesValue: z.coerce.number().min(0).default(0),
  closingStockValue: z.coerce.number().min(0).default(0),
  categoryBreakdown: z.array(z.unknown()).default([]),
  purchaseItems: z.array(z.unknown()).optional(),
  issueItems: z.array(z.unknown()).optional(),
  adjustmentItems: z.array(z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
});

export async function upsertStoreReport(raw: z.infer<typeof UpsertStoreSchema>) {
  const ctx = await requireBusinessContext();
  if (!canSubmitDepartment(ctx.role, "store")) {
    throw new Error("You are not allowed to submit store reports");
  }
  const parsed = UpsertStoreSchema.parse(raw);
  const date = normalizeDate(parsed.reportDate);
  const report = await ensureDailyReport(date);

  return prisma.hotelStoreReport.upsert({
    where: { hotelDailyReportId: report.id },
    create: {
      hotelDailyReportId: report.id,
      businessId: ctx.businessId,
      openingStockValue: parsed.openingStockValue,
      purchasesValue: parsed.purchasesValue,
      receiptsValue: parsed.receiptsValue,
      issuesValue: parsed.issuesValue,
      closingStockValue: parsed.closingStockValue,
      categoryBreakdown: parsed.categoryBreakdown as any,
      purchaseItems: parsed.purchaseItems as any,
      issueItems: parsed.issueItems as any,
      adjustmentItems: parsed.adjustmentItems as any,
      notes: parsed.notes,
    },
    update: {
      openingStockValue: parsed.openingStockValue,
      purchasesValue: parsed.purchasesValue,
      receiptsValue: parsed.receiptsValue,
      issuesValue: parsed.issuesValue,
      closingStockValue: parsed.closingStockValue,
      categoryBreakdown: parsed.categoryBreakdown as any,
      purchaseItems: parsed.purchaseItems as any,
      issueItems: parsed.issueItems as any,
      adjustmentItems: parsed.adjustmentItems as any,
      notes: parsed.notes,
    },
  });
}

export async function submitDepartment(
  reportDate: string | Date,
  dept: DepartmentId
) {
  const ctx = await requireBusinessContext();
  if (!canSubmitDepartment(ctx.role, dept)) {
    throw new Error("You are not allowed to submit this department's report");
  }
  const date = normalizeDate(reportDate);
  await ensureDailyReport(date);

  const statusField = DEPT_STATUS_FIELD[dept];
  const byField = DEPT_SUBMITTED_BY_FIELD[dept];
  const atField = DEPT_SUBMITTED_AT_FIELD[dept];

  return prisma.hotelDailyReport.update({
    where: {
      businessId_reportDate: {
        businessId: ctx.businessId,
        reportDate: date,
      },
    },
    data: {
      [statusField]: "SUBMITTED",
      [byField]: ctx.userId,
      [atField]: new Date(),
    },
  });
}

export async function returnDepartment(
  reportDate: string | Date,
  dept: DepartmentId,
  note: string
) {
  const ctx = await requireBusinessContext();
  if (!canManageHotel(ctx.role)) {
    throw new Error("Only management can return reports");
  }
  const date = normalizeDate(reportDate);
  const statusField = DEPT_STATUS_FIELD[dept];

  const current = await prisma.hotelDailyReport.findUnique({
    where: {
      businessId_reportDate: {
        businessId: ctx.businessId,
        reportDate: date,
      },
    },
    select: { returnNotes: true },
  });

  const existing = (current?.returnNotes as Record<string, string> | null) ?? {};

  return prisma.hotelDailyReport.update({
    where: {
      businessId_reportDate: {
        businessId: ctx.businessId,
        reportDate: date,
      },
    },
    data: {
      [statusField]: "RETURNED",
      returnNotes: { ...existing, [dept]: note, _lastUpdated: new Date().toISOString() },
    },
  });
}

export async function approveDailyReport(reportDate: string | Date) {
  const ctx = await requireBusinessContext();
  if (!canManageHotel(ctx.role)) {
    throw new Error("Only management can approve reports");
  }
  const date = normalizeDate(reportDate);

  return prisma.hotelDailyReport.update({
    where: {
      businessId_reportDate: {
        businessId: ctx.businessId,
        reportDate: date,
      },
    },
    data: {
      receptionStatus: "APPROVED",
      kitchenStatus: "APPROVED",
      barStatus: "APPROVED",
      spaStatus: "APPROVED",
      storeStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: ctx.userId,
    },
  });
}

const ExpenseSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  category: z.enum([
    "FUEL",
    "REPAIRS_AND_MAINTENANCE",
    "SALARIES_AND_WAGES",
    "SUPPLIES",
    "UTILITIES",
    "OTHER_OPERATIONAL",
  ]),
  description: z.string().min(1).max(500),
  amount: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0).default(0),
  receiptUrl: z.string().max(1000).optional(),
  paidTo: z.string().max(200).optional(),
  referenceNo: z.string().max(100).optional(),
  reportDate: z.string().optional(),
});

export async function createHotelExpense(
  raw: z.infer<typeof ExpenseSchema>
) {
  const ctx = await requireBusinessContext();
  if (!canManageHotel(ctx.role) && ctx.role !== "CASHIER") {
    throw new Error("Not allowed to create hotel expenses");
  }
  const parsed = ExpenseSchema.parse(raw);
  const amountPaid = Math.min(parsed.amountPaid, parsed.amount);
  const outstanding = parsed.amount - amountPaid;
  const paymentStatus: "UNPAID" | "PARTIAL" | "PAID" =
    outstanding <= 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

  const date = normalizeDate(parsed.date);
  let reportLink: { hotelDailyReportId?: string } = {};
  if (parsed.reportDate) {
    const report = await ensureDailyReport(parsed.reportDate);
    reportLink = { hotelDailyReportId: report.id };
  }

  return prisma.hotelExpense.create({
    data: {
      businessId: ctx.businessId,
      date,
      category: parsed.category,
      description: parsed.description,
      amount: parsed.amount,
      amountPaid,
      outstanding,
      paymentStatus,
      receiptUrl: parsed.receiptUrl,
      paidTo: parsed.paidTo,
      referenceNo: parsed.referenceNo,
      createdBy: ctx.userId,
      ...reportLink,
    },
  });
}

export async function updateHotelExpense(
  raw: z.infer<typeof ExpenseSchema> & { id: string }
) {
  const ctx = await requireBusinessContext();
  if (!canManageHotel(ctx.role) && ctx.role !== "CASHIER") {
    throw new Error("Not allowed to update hotel expenses");
  }
  const parsed = ExpenseSchema.parse(raw) as z.infer<typeof ExpenseSchema> & { id: string };
  const amountPaid = Math.min(parsed.amountPaid, parsed.amount);
  const outstanding = parsed.amount - amountPaid;
  const paymentStatus: "UNPAID" | "PARTIAL" | "PAID" =
    outstanding <= 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

  const date = normalizeDate(parsed.date);
  let reportLink: { hotelDailyReportId?: string } = {};
  if (parsed.reportDate) {
    const report = await ensureDailyReport(parsed.reportDate);
    reportLink = { hotelDailyReportId: report.id };
  }

  return prisma.hotelExpense.update({
    where: { id: parsed.id, businessId: ctx.businessId },
    data: {
      date,
      category: parsed.category,
      description: parsed.description,
      amount: parsed.amount,
      amountPaid,
      outstanding,
      paymentStatus,
      receiptUrl: parsed.receiptUrl,
      paidTo: parsed.paidTo,
      referenceNo: parsed.referenceNo,
      ...reportLink,
    },
  });
}

export async function deleteHotelExpense(id: string) {
  const ctx = await requireOwner();
  return prisma.hotelExpense.delete({
    where: { id, businessId: ctx.businessId },
  });
}

type Range = "day" | "week" | "month" | "all";

export async function listHotelExpenses(range: Range = "month", fromDate?: string, toDate?: string) {
  const ctx = await requireBusinessContext();
  let gte: Date | undefined;
  let lte: Date | undefined;

  if (fromDate && toDate) {
    gte = normalizeDate(fromDate);
    lte = normalizeDate(toDate);
  } else {
    const now = new Date();
    if (range === "day") {
      gte = normalizeDate(now);
      lte = normalizeDate(now);
    } else if (range === "week") {
      gte = startOfWeek(now, { weekStartsOn: 1 });
      lte = endOfWeek(now, { weekStartsOn: 1 });
    } else if (range === "month") {
      gte = startOfMonth(now);
      lte = endOfMonth(now);
    }
  }

  const where: any = {
    businessId: ctx.businessId,
    ...(gte || lte
      ? { date: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } }
      : {}),
  };

  const items = await prisma.hotelExpense.findMany({
    where,
    orderBy: { date: "desc" },
    take: 500,
  });

  const totalAmount = items.reduce((s, e) => s + Number(e.amount), 0);
  const totalPaid = items.reduce((s, e) => s + Number(e.amountPaid), 0);
  const totalOutstanding = items.reduce((s, e) => s + Number(e.outstanding), 0);

  const byCategory = items.reduce<Record<string, { amount: number; paid: number; outstanding: number }>>((acc, e) => {
    const existing = acc[e.category] ?? { amount: 0, paid: 0, outstanding: 0 };
    acc[e.category] = {
      amount: existing.amount + Number(e.amount),
      paid: existing.paid + Number(e.amountPaid),
      outstanding: existing.outstanding + Number(e.outstanding),
    };
    return acc;
  }, {});

  return { items, totalAmount, totalPaid, totalOutstanding, byCategory };
}

export async function listDailyReports(range: Range = "month") {
  const ctx = await requireBusinessContext();
  const now = new Date();
  let gte: Date;
  if (range === "week") gte = subDays(now, 14);
  else if (range === "month") gte = startOfMonth(now);
  else gte = subDays(now, 90);

  return prisma.hotelDailyReport.findMany({
    where: {
      businessId: ctx.businessId,
      reportDate: { gte },
    },
    orderBy: { reportDate: "desc" },
    take: 90,
    include: {
      receptionReport: { select: { totalPaymentsReceived: true } },
      kitchenReport: { select: { totalSales: true } },
      barReport: { select: { totalSales: true } },
      spaReport: { select: { paidRevenue: true } },
      expenses: { select: { amountPaid: true, outstanding: true } },
    },
  });
}

export async function exportDailyReportCsv(reportDate: string | Date): Promise<string> {
  const report = await getDailyReport(reportDate);
  if (!report) return "";

  const rows: string[][] = [];
  const header = (name: string) => rows.push([name]);
  const kv = (k: string, v: unknown) => rows.push([k, String(v ?? "")]);

  header("Haven Lagos - Daily Report");
  kv("Date", format(report.reportDate, "yyyy-MM-dd"));
  header("");
  header("Department Status");
  kv("Reception", report.receptionStatus);
  kv("Kitchen", report.kitchenStatus);
  kv("Bar", report.barStatus);
  kv("Spa", report.spaStatus);
  kv("Store", report.storeStatus);
  header("");
  header("Consolidated Financials");
  kv("Reception payments received", report.totals.receptionPayments);
  kv("Kitchen reported sales", report.totals.kitchenSales);
  kv("Bar reported sales", report.totals.barSales);
  kv("Spa paid sales", report.totals.spaPaidSales);
  kv("Total reported inflow", report.totals.totalReportedInflow);
  kv("Actual expenses paid", report.totals.actualExpensesPaid);
  kv("Net reported cash movement", report.totals.netReportedCashMovement);
  kv("Outstanding expenses", report.totals.outstandingExpenses);
  header("");
  header("Expenses");
  rows.push(["Date", "Category", "Description", "Amount", "Paid", "Outstanding", "Status"]);
  for (const e of report.expenses) {
    rows.push([
      format(e.date, "yyyy-MM-dd"),
      e.category,
      e.description,
      String(e.amount),
      String(e.amountPaid),
      String(e.outstanding),
      e.paymentStatus,
    ]);
  }

  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
}
