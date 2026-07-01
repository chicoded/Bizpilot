"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { updateProductImageUrl, getInventoryProduct, createInventoryProduct, getProductsForSale, updateInventoryProduct } from "@/lib/products";
import { businessSchema, productSchema, expenseSchema, saleSchema, customerSchema, debtPaymentSchema, updateBusinessSchema } from "@/lib/validations";
import { syncClerkUser, requireBusinessContext, requireSectionAccess } from "@/lib/auth";
import { setActiveBusinessId } from "@/lib/active-business";
import {
  deleteProductImage,
  uploadProductImage,
  validateProductImageFile,
} from "@/lib/product-images";
import { Role, Prisma } from "@prisma/client";
import { calculateSaleVat } from "@/lib/tax/vat";
import { getActiveTaxRules } from "@/lib/tax/rules";
import { triggerTaxRecalculation } from "@/lib/tax/engine";

export async function createBusiness(formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  await syncClerkUser({
    id: user.id,
    emailAddresses: user.emailAddresses,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  });

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    currency: formData.get("currency") || "NGN",
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const business = await prisma.business.create({
    data: {
      ...parsed.data,
      memberships: {
        create: {
          userId: user.id,
          role: Role.OWNER,
        },
      },
      subscription: {
        create: {
          plan: "STARTER",
          status: "TRIAL",
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      userId: user.id,
      action: "business.created",
      entity: "business",
      entityId: business.id,
    },
  });

  await setActiveBusinessId(business.id);

  revalidatePath("/dashboard");
  return { success: true, businessId: business.id };
}

function formValue(value: FormDataEntryValue | null): string | undefined {
  if (value === null) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A product with this SKU already exists";
    }
    if (error.code === "P2022") {
      return "Database schema is out of date. In Supabase SQL Editor run: ALTER TABLE \"products\" ADD COLUMN IF NOT EXISTS \"imageUrl\" TEXT;";
    }
  }
  if (error instanceof Error) {
    if (error.message.includes("Body exceeded") || error.message.includes("413")) {
      return "Image is too large. Use a file under 5 MB.";
    }
    if (process.env.NODE_ENV === "development") {
      return error.message;
    }
  }
  return fallback;
}

function formatFieldErrors(error: Record<string, string[] | undefined>): string {
  const message = Object.values(error).flat().find(Boolean);
  return message ?? "Please check your inputs";
}

async function applyProductImageFromForm(
  formData: FormData,
  businessId: string,
  productId: string,
  existingImageUrl: string | null
): Promise<{ imageUrl: string | null; unchanged: boolean; error?: string }> {
  const removeImage = formData.get("removeImage") === "true";
  const imageFile = formData.get("image");

  if (removeImage) {
    await deleteProductImage(existingImageUrl);
    return { imageUrl: null, unchanged: false };
  }

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { imageUrl: existingImageUrl, unchanged: true };
  }

  const validationError = validateProductImageFile(imageFile);
  if (validationError) {
    return { imageUrl: existingImageUrl, unchanged: true, error: validationError };
  }

  try {
    if (existingImageUrl) {
      await deleteProductImage(existingImageUrl);
    }
    const imageUrl = await uploadProductImage(businessId, imageFile, productId);
    return { imageUrl, unchanged: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload image";
    return { imageUrl: existingImageUrl, unchanged: true, error: message };
  }
}

export async function createProduct(formData: FormData) {
  try {
    const user = await currentUser();
    if (!user) {
      return { error: "You must be signed in to add products" };
    }

    await syncClerkUser({
      id: user.id,
      emailAddresses: user.emailAddresses,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });

    const ctx = await requireSectionAccess("inventory");

    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      sku: formValue(formData.get("sku")),
      barcode: formValue(formData.get("barcode")),
      category: formValue(formData.get("category")),
      purchasePrice: formData.get("purchasePrice"),
      sellingPrice: formData.get("sellingPrice"),
      quantity: formData.get("quantity"),
      reorderLevel: formData.get("reorderLevel"),
      batchNumber: formValue(formData.get("batchNumber")),
      expiryDate: formValue(formData.get("expiryDate")),
      supplierId: formValue(formData.get("supplierId")),
    });

    if (!parsed.success) {
      return { error: formatFieldErrors(parsed.error.flatten().fieldErrors) };
    }

    const { expiryDate, sku, barcode, category, batchNumber, supplierId, ...rest } =
      parsed.data;

    let resolvedSupplierId: string | null = null;
    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, businessId: ctx.businessId },
        select: { id: true },
      });
      if (!supplier) {
        return { error: "Selected supplier not found" };
      }
      resolvedSupplierId = supplier.id;
    }

    const product = await createInventoryProduct({
      ...rest,
      sku: sku ?? null,
      barcode: barcode ?? null,
      category: category ?? null,
      batchNumber: batchNumber ?? null,
      supplierId: resolvedSupplierId,
      businessId: ctx.businessId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    const imageResult = await applyProductImageFromForm(
      formData,
      ctx.businessId,
      product.id,
      null
    );

    if (imageResult.error) {
      revalidatePath("/inventory");
      return {
        success: true,
        product,
        warning: `Product saved, but image upload failed: ${imageResult.error}`,
      };
    }

    if (!imageResult.unchanged && imageResult.imageUrl !== null) {
      await updateProductImageUrl(product.id, imageResult.imageUrl);
    } else if (!imageResult.unchanged && imageResult.imageUrl === null) {
      await updateProductImageUrl(product.id, null);
    }

    revalidatePath("/inventory");
    return { success: true, product };
  } catch (error) {
    if (error instanceof Error && error.message.includes("access")) {
      return { error: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "A product with this SKU already exists" };
    }
    console.error("createProduct failed:", error);
    return { error: "Could not save product. Check your connection and try again." };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    const ctx = await requireSectionAccess("inventory");

    const existing = await getInventoryProduct(ctx.businessId, productId);
    if (!existing) {
      return { error: "Product not found" };
    }

    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      sku: formValue(formData.get("sku")),
      barcode: formValue(formData.get("barcode")),
      category: formValue(formData.get("category")),
      purchasePrice: formData.get("purchasePrice"),
      sellingPrice: formData.get("sellingPrice"),
      quantity: formData.get("quantity"),
      reorderLevel: formData.get("reorderLevel"),
      batchNumber: formValue(formData.get("batchNumber")),
      expiryDate: formValue(formData.get("expiryDate")),
      supplierId: formValue(formData.get("supplierId")),
    });

    if (!parsed.success) {
      return { error: formatFieldErrors(parsed.error.flatten().fieldErrors) };
    }

    const { expiryDate, sku, barcode, category, batchNumber, quantity, supplierId, ...rest } =
      parsed.data;

    let resolvedSupplierId: string | null = null;
    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, businessId: ctx.businessId },
        select: { id: true },
      });
      if (!supplier) {
        return { error: "Selected supplier not found" };
      }
      resolvedSupplierId = supplier.id;
    }

    const quantityDelta = quantity - existing.quantity;

    const imageResult = await applyProductImageFromForm(
      formData,
      ctx.businessId,
      productId,
      existing.imageUrl
    );

    let imageWarning: string | undefined;
    if (imageResult.error) {
      imageWarning = `Product saved, but image upload failed: ${imageResult.error}`;
    }

    await prisma.$transaction(async (tx) => {
      await updateInventoryProduct(
        productId,
        {
          ...rest,
          quantity,
          sku: sku ?? null,
          barcode: barcode ?? null,
          category: category ?? null,
          batchNumber: batchNumber ?? null,
          supplierId: resolvedSupplierId,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
        tx
      );

      if (quantityDelta !== 0) {
        await tx.stockAdjustment.create({
          data: {
            productId,
            businessId: ctx.businessId,
            type: "MANUAL",
            quantity: quantityDelta,
            reason: "Inventory update",
            createdBy: ctx.userId,
          },
        });
      }
    });

    if (!imageResult.error && !imageResult.unchanged) {
      await updateProductImageUrl(productId, imageResult.imageUrl);
    }

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${productId}`);
    return imageWarning
      ? { success: true, warning: imageWarning }
      : { success: true };
  } catch (error) {
    console.error("updateProduct failed:", error);
    return { error: formatActionError(error, "Could not update product") };
  }
}

export async function createExpense(formData: FormData) {
  const ctx = await requireSectionAccess("expenses");
  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
    date: formData.get("date") || undefined,
  });

  if (!parsed.success) {
    return { error: formatFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const expense = await prisma.expense.create({
    data: {
      businessId: ctx.businessId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      createdBy: ctx.userId,
    },
    select: { id: true },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/tax");
  await triggerTaxRecalculation(ctx.businessId);
  return { success: true, expense };
}

export async function deleteExpense(expenseId: string) {
  try {
    const ctx = await requireSectionAccess("expenses");

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, businessId: ctx.businessId },
      select: { id: true },
    });

    if (!expense) {
      return { error: "Expense not found" };
    }

    await prisma.expense.delete({ where: { id: expenseId } });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/tax");
    await triggerTaxRecalculation(ctx.businessId);
    return { success: true };
  } catch (error) {
    console.error("deleteExpense failed:", error);
    return { error: "Could not delete expense" };
  }
}

export async function updateBusiness(formData: FormData) {
  try {
    const ctx = await requireSectionAccess("settings");

    const parsed = updateBusinessSchema.safeParse({
      name: formData.get("name"),
      industry: formData.get("industry"),
      currency: formData.get("currency") || "NGN",
      address: formValue(formData.get("address")),
      phone: formValue(formData.get("phone")),
    });

    if (!parsed.success) {
      return { error: formatFieldErrors(parsed.error.flatten().fieldErrors) };
    }

    await prisma.business.update({
      where: { id: ctx.businessId },
      data: {
        name: parsed.data.name,
        industry: parsed.data.industry,
        currency: parsed.data.currency,
        address: parsed.data.address ?? null,
        phone: parsed.data.phone ?? null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("updateBusiness failed:", error);
    return { error: "Could not update business profile" };
  }
}

export async function updateCustomer(
  customerId: string,
  data: { name: string; phone?: string; email?: string }
) {
  const ctx = await requireSectionAccess("customers");
  const parsed = customerSchema.safeParse(data);

  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid customer data",
    };
  }

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId: ctx.businessId },
    select: { id: true },
  });

  if (!existing) {
    return { error: "Customer not found" };
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/debts");
  return { success: true, customer };
}

export async function createSale(data: {
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  customerId?: string;
  discount?: number;
  tax?: number;
  isCredit?: boolean;
}) {
  const ctx = await requireSectionAccess("sales");
  const parsed = saleSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.customerId?.[0] ?? "Invalid sale data" };
  }

  if (parsed.data.paymentMethod === "CREDIT") {
    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId, businessId: ctx.businessId },
    });
    if (!customer) {
      return { error: "Customer not found" };
    }
  }

  const products = await getProductsForSale(
    ctx.businessId,
    parsed.data.items.map((i) => i.productId)
  );

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let totalCost = 0;
  const saleItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    const sellingPrice = Number(product.sellingPrice);
    const cost = Number(product.purchasePrice);
    const lineTotal = sellingPrice * item.quantity;
    subtotal += lineTotal;
    totalCost += cost * item.quantity;
    return {
      productId: item.productId,
      quantity: item.quantity,
      cost,
      sellingPrice,
      total: lineTotal,
    };
  });

  const discount = parsed.data.discount ?? 0;

  const [taxProfile, taxRules] = await Promise.all([
    prisma.businessTaxProfile.findUnique({
      where: { businessId: ctx.businessId },
    }),
    getActiveTaxRules("NG"),
  ]);

  let tax = parsed.data.tax ?? 0;
  let total: number;

  if (
    taxProfile?.vatEnabled &&
    taxProfile.vatRegistered &&
    !parsed.data.tax
  ) {
    const vat = calculateSaleVat({
      subtotal,
      discount,
      rate: taxRules.vat_rate,
      mode: taxProfile.vatPricingMode,
    });
    tax = vat.tax;
    total = vat.total;
  } else {
    total = subtotal - discount + tax;
  }

  const profit = subtotal - discount - totalCost;

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        businessId: ctx.businessId,
        customerId: parsed.data.customerId,
        paymentMethod: parsed.data.paymentMethod,
        subtotal,
        discount,
        tax,
        total,
        profit,
        isCredit: parsed.data.paymentMethod === "CREDIT",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdBy: ctx.userId,
        items: { create: saleItems },
      },
      include: { items: true },
    });

    for (const item of parsed.data.items) {
      await updateInventoryProduct(
        item.productId,
        { quantity: { decrement: item.quantity } },
        tx
      );
      await tx.stockAdjustment.create({
        data: {
          productId: item.productId,
          businessId: ctx.businessId,
          type: "SALE",
          quantity: -item.quantity,
          createdBy: ctx.userId,
        },
      });
    }

    if (parsed.data.paymentMethod === "CREDIT" && parsed.data.customerId) {
      await tx.customer.update({
        where: { id: parsed.data.customerId },
        data: {
          debt: { increment: total },
          lastPurchase: new Date(),
          lifetimeValue: { increment: total },
        },
      });
    } else if (parsed.data.customerId) {
      await tx.customer.update({
        where: { id: parsed.data.customerId },
        data: {
          lastPurchase: new Date(),
          lifetimeValue: { increment: total },
        },
      });
    }

    return newSale;
  });

  revalidatePath("/sales");
  revalidatePath("/sales/history");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/customers");
  revalidatePath("/debts");
  revalidatePath("/tax");
  await triggerTaxRecalculation(ctx.businessId);
  return { success: true, sale };
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  email?: string;
}) {
  const ctx = await requireSectionAccess("customers");
  const parsed = customerSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid customer data" };
  }

  const customer = await prisma.customer.create({
    data: {
      businessId: ctx.businessId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/debts");
  return { success: true, customer };
}

export async function recordDebtPayment(data: {
  customerId: string;
  amount: number;
}) {
  const ctx = await requireSectionAccess("debts");
  const parsed = debtPaymentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid payment amount" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, businessId: ctx.businessId },
  });

  if (!customer) {
    return { error: "Customer not found" };
  }

  const currentDebt = Number(customer.debt);
  if (parsed.data.amount > currentDebt) {
    return { error: "Payment exceeds outstanding debt" };
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { debt: { decrement: parsed.data.amount } },
  });

  revalidatePath("/debts");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addCustomerDebt(data: {
  customerId: string;
  amount: number;
}) {
  const ctx = await requireSectionAccess("debts");
  const parsed = debtPaymentSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Enter a valid customer and amount" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, businessId: ctx.businessId },
  });

  if (!customer) {
    return { error: "Customer not found" };
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { debt: { increment: parsed.data.amount } },
  });

  revalidatePath("/debts");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function sendAIMessage(message: string) {
  const ctx = await requireSectionAccess("ai");
  const subscription = await prisma.subscription.findUnique({
    where: { businessId: ctx.businessId },
  });
  const { canAccessFeature } = await import("@/lib/subscription");
  if (!canAccessFeature(subscription, "ai")) {
    return {
      error:
        "AI Assistant requires the AI Pro plan. Upgrade at Settings → Billing.",
    };
  }
  const { chatWithAI } = await import("@/ai/assistant");
  const response = await chatWithAI(ctx.businessId, message);
  return { response };
}
