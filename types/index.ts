export interface InventoryListProduct {
  id: string;
  name: string;
  category: string | null;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: Date | null;
  imageUrl: string | null;
}

export interface InventoryDetailProduct extends InventoryListProduct {
  barcode: string | null;
  purchasePrice: number;
  unitsPerPack: number;
  supplierId: string | null;
}

export interface ProductApiItem {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  barcode: string | null;
  imageUrl: string | null;
}

export interface ReportSummary {
  revenue: number;
  profit: number;
  expenses: number;
  netProfit: number;
  salesCount: number;
  avgSaleValue: number;
  inventoryCostValue: number;
  inventoryRetailValue: number;
}

export interface DailyDataPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  expenses: number;
}

export interface ExpenseBreakdown {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface TopProduct {
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface InventoryValuationItem {
  name: string;
  category?: string;
  quantity: number;
  costValue: number;
  retailValue: number;
}

export type ReportPeriod = "today" | "week" | "month" | "quarter" | "year";

export interface FullReport {
  period: ReportPeriod;
  periodLabel: string;
  dateRange: { start: string; end: string };
  summary: ReportSummary;
  dailyTrend: DailyDataPoint[];
  expenseBreakdown: ExpenseBreakdown[];
  topProducts: TopProduct[];
  inventoryValuation: InventoryValuationItem[];
  inventoryTotals: { cost: number; retail: number; productCount: number };
}

export interface MonthlySalesProductRow {
  name: string;
  category?: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  marginPct: number;
}

export interface MonthlyPaymentMixRow {
  method: string;
  label: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface MonthlyWeeklyRow {
  label: string;
  revenue: number;
  profit: number;
  salesCount: number;
  expenses: number;
}

export interface MonthlySalesReport {
  businessName: string;
  currency: string;
  periodLabel: string;
  monthKey: string;
  dateRange: { start: string; end: string };
  summary: ReportSummary;
  comparison: {
    previousLabel: string;
    previous: ReportSummary;
    revenueChangePct: number;
    profitChangePct: number;
    salesCountChangePct: number;
    expensesChangePct: number;
  };
  metrics: {
    profitMarginPct: number;
    netMarginPct: number;
    avgDailyRevenue: number;
    avgDailyProfit: number;
    activeSellingDays: number;
    totalDaysInPeriod: number;
    sellThroughRatePct: number;
  };
  dailyTrend: DailyDataPoint[];
  weeklyBreakdown: MonthlyWeeklyRow[];
  paymentMix: MonthlyPaymentMixRow[];
  creditSummary: {
    creditSalesCount: number;
    creditRevenue: number;
    creditRevenuePct: number;
  };
  topProductsByRevenue: MonthlySalesProductRow[];
  topProductsByQuantity: MonthlySalesProductRow[];
  expenseBreakdown: ExpenseBreakdown[];
  monthlyTrend: { label: string; revenue: number; profit: number; expenses: number }[];
  peakDay: { date: string; label: string; revenue: number; profit: number } | null;
  insights: string[];
}

export const REPORT_PERIODS = [
  { value: "today" as const, label: "Today" },
  { value: "week" as const, label: "This Week" },
  { value: "month" as const, label: "This Month" },
  { value: "quarter" as const, label: "This Quarter" },
  { value: "year" as const, label: "This Year" },
];

export interface BusinessHealthResult {
  score: number;
  strengths: string[];
  warnings: string[];
  recommendations: string[];
  breakdown: {
    sales: number;
    profit: number;
    inventory: number;
    cashflow: number;
    customers: number;
  };
}

export interface DashboardKPIs {
  revenueToday: number;
  expensesToday: number;
  profitToday: number;
  lowStockCount: number;
  expiringCount: number;
  debtorsCount: number;
  totalDebt: number;
}

export interface AIInsight {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  title: string;
  message: string;
  action?: string;
  actionHref?: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export const INDUSTRIES = [
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "RETAIL", label: "Retail Shop" },
  { value: "SUPERMARKET", label: "Supermarket" },
  { value: "COSMETICS", label: "Cosmetic Store" },
  { value: "FASHION", label: "Fashion Store" },
  { value: "MINI_MART", label: "Mini Mart" },
  { value: "ELECTRONICS", label: "Electronics Store" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "FAST_FOOD", label: "Fast Food" },
  { value: "CAFE", label: "Cafe" },
  { value: "OTHER", label: "Other" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "FUEL", label: "Fuel / Generator" },
  { value: "SALARY", label: "Salary" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
] as const;

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER", label: "Bank Transfer" },
  { value: "POS", label: "POS" },
  { value: "CREDIT", label: "Credit" },
] as const;

export type SubscriptionPlanId = "STARTER" | "BUSINESS" | "AI_PRO";

export type PlanFeature =
  | "inventory"
  | "pos"
  | "reports"
  | "debts"
  | "export"
  | "ai";

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  priceKobo: number;
  features: string[];
  highlights: PlanFeature[];
}

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlanDefinition[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: 5000,
    priceKobo: 500000,
    features: ["Inventory", "POS", "Basic Reports", "1 User"],
    highlights: ["inventory", "pos", "reports", "ai"],
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: 15000,
    priceKobo: 1500000,
    features: [
      "Everything in Starter",
      "Debt Management",
      "5 Users",
      "Export Reports",
      "AI Assistant",
    ],
    highlights: ["inventory", "pos", "reports", "debts", "export", "ai"],
  },
  {
    id: "AI_PRO",
    name: "AI Pro",
    price: 30000,
    priceKobo: 3000000,
    features: [
      "Everything in Business",
      "Priority support",
      "Health Score insights",
      "Unlimited Users",
    ],
    highlights: ["inventory", "pos", "reports", "debts", "export", "ai"],
  },
];
