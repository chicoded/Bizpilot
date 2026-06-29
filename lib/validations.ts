import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  industry: z.enum([
    "PHARMACY",
    "RETAIL",
    "SUPERMARKET",
    "COSMETICS",
    "FASHION",
    "MINI_MART",
    "ELECTRONICS",
    "OTHER",
  ]),
  currency: z.string().default("NGN"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  supplierId: z.string().optional(),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(5),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().int().min(1),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
  customerId: z.string().optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "POS", "CREIT"]),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  isCredit: z.boolean().default(false),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.enum([
    "RENT",
    "FUEL",
    "SALARY",
    "TRANSPORTATION",
    "ELECTRICITY",
    "SUPPLIES",
    "MAINTENANCE",
    "OTHER",
  ]),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
  businessId: z.string(),
});

export const whatsappConfigSchema = z.object({
  isEnabled: z.boolean(),
  autoReplyEnabled: z.boolean(),
  whatsappNumber: z.string().optional(),
  greetingMessage: z.string().max(500).optional(),
});

export type BusinessInput = z.infer<typeof businessSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
