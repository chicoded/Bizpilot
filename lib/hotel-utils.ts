import type { HotelStoreCategory, HotelExpenseCategory } from "@prisma/client";

export function formatNGN(amount: number | string | bigint): string {
  const n = typeof amount === "bigint" ? Number(amount) : Number(amount);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function hotelStoreCategories(): { value: HotelStoreCategory; label: string }[] {
  return [
    { value: "HOUSEKEEPING", label: "Housekeeping Supplies" },
    { value: "KITCHEN", label: "Kitchen Supplies" },
    { value: "SPA", label: "Spa Supplies" },
    { value: "LAUNDRY", label: "Laundry Supplies" },
    { value: "OTHER", label: "Other Store Items" },
  ];
}

export function hotelExpenseCategories(): { value: HotelExpenseCategory; label: string }[] {
  return [
    { value: "FUEL", label: "Fuel" },
    { value: "REPAIRS_AND_MAINTENANCE", label: "Repairs & Maintenance" },
    { value: "SALARIES_AND_WAGES", label: "Salaries & Wages" },
    { value: "SUPPLIES", label: "Supplies" },
    { value: "UTILITIES", label: "Utilities" },
    { value: "OTHER_OPERATIONAL", label: "Other Operational" },
  ];
}
