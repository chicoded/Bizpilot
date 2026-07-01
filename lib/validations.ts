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

export const updateBusinessSchema = businessSchema.pick({
  name: true,
  industry: true,
  currency: true,
  address: true,
  phone: true,
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  category: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(5),
  batchNumber: z.string().trim().optional(),
  expiryDate: z.string().trim().optional(),
});

export const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().int().min(1),
});

export const saleSchema = z
  .object({
    items: z.array(saleItemSchema).min(1, "Add at least one item"),
    customerId: z.string().optional(),
    paymentMethod: z.enum(["CASH", "TRANSFER", "POS", "CREDIT"]),
    discount: z.coerce.number().min(0).default(0),
    tax: z.coerce.number().min(0).default(0),
    isCredit: z.boolean().default(false),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "CREDIT" && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a customer for credit sales",
        path: ["customerId"],
      });
    }
  });

export const debtPaymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
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

export const supplyRequestSchema = z
  .object({
    supplierId: z.string().min(1),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.coerce.number().int().min(1),
        })
      )
      .default([]),
    customMessage: z.string().max(1000).optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const hasItems = data.items.length > 0;
    const hasMessage = Boolean(data.customMessage?.trim());
    if (!hasItems && !hasMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one product or describe what you need",
        path: ["customMessage"],
      });
    }
  });

export const customerBroadcastSchema = z
  .object({
    message: z
      .string()
      .min(1, "Message is required")
      .max(1000, "Message is too long"),
    audience: z.enum(["all", "debtors", "selected"]),
    customerIds: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.audience === "selected" &&
      (!data.customerIds || data.customerIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one customer",
        path: ["customerIds"],
      });
    }
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

export const teamInviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["MANAGER", "CASHIER", "STAFF"]),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["MANAGER", "CASHIER", "STAFF"]),
});

export type BusinessInput = z.infer<typeof businessSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplyRequestInput = z.infer<typeof supplyRequestSchema>;
export type CustomerBroadcastInput = z.infer<typeof customerBroadcastSchema>;
