export type LocalProduct = {
  id: string;
  businessId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  purchasePrice: number;
  sellingPrice: number;
  unitsPerPack: number;
  quantity: number;
  reorderLevel: number;
  batchNumber: string | null;
  expiryDate: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
};

export type LocalCustomer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  debt: number;
  lifetimeValue: number;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
};

export type LocalSaleItem = {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  sellingPrice: number;
  total: number;
};

export type LocalSale = {
  id: string;
  businessId: string;
  receiptNumber: string;
  items: LocalSaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalCost: number;
  profit: number;
  paymentMethod: string;
  customerId: string | null;
  isCredit: boolean;
  createdAt: string;
  syncedAt: string | null;
};

export type LocalExpense = {
  id: string;
  businessId: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  createdAt: string;
  syncedAt: string | null;
};

export type LocalBusinessMeta = {
  businessId: string;
  name: string;
  currency: string;
  updatedAt: string;
};

export type BackupFrequencyUnit = "days" | "weeks" | "months";

export type BackupConfig = {
  enabled: boolean;
  frequencyUnit: BackupFrequencyUnit;
  frequencyInterval: number;
  gmailEmail: string | null;
  gmailAccessToken: string | null;
  gmailTokenExpiry: number | null;
  /** Email backup file to Gmail */
  backupToGmail: boolean;
  /** Upload backup file to Google Drive */
  backupToDrive: boolean;
  lastBackupAt: string | null;
  lastBackupStatus: "success" | "error" | null;
  lastBackupMessage: string | null;
};

export type LocalBackupSnapshot = {
  id: string;
  businessId: string;
  createdAt: string;
  sizeBytes: number;
  payload: string;
};
