import { prisma } from "@/lib/db";

/**
 * Tenant-scoped Prisma client.
 *
 * Every model carrying a `businessId` is filtered automatically, so a query
 * cannot read or write across shops even when the caller forgets a `where`
 * clause. Use `ctx.db` from `requireBusinessContext()` instead of the bare
 * `prisma` import for anything shop-owned.
 *
 * Not covered — these still need manual care:
 * - `$queryRaw` / `$executeRaw` bypass extensions entirely.
 * - Child rows (SaleItem, KitchenOrderItem, MealComboItem) have no businessId
 *   of their own; they are only as safe as the parent query that reached them.
 */

/** Models with a businessId column, minus the two that bootstrap tenancy. */
const TENANT_MODELS = new Set([
  "AiPromptLog",
  "AuditLog",
  "BusinessHealthScore",
  "Customer",
  "Employee",
  "Expense",
  "FavoriteProduct",
  "KitchenOrder",
  "MealCombo",
  "PaymentTransaction",
  "Product",
  "PurchaseOrder",
  "ReceiptCounter",
  "RestaurantSettings",
  "Sale",
  "StockAdjustment",
  "Subscription",
  "Supplier",
  "SupportTicket",
  "WhatsAppConfig",
  "WhatsAppMessage",
]);

/**
 * Membership and TeamInvite are deliberately excluded. Membership is how we
 * discover which businesses a user belongs to, and TeamInvite is looked up by
 * token before any business context exists — scoping them by businessId would
 * make both unreadable.
 */

const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

type AnyRecord = Record<string, unknown>;

export function isTenantModel(model: string | undefined): boolean {
  return Boolean(model && TENANT_MODELS.has(model));
}

/**
 * Rewrites Prisma operation arguments so they can only touch one business.
 * Pure and exported so the scoping rules can be tested without a database —
 * `forBusiness` is only the wiring around this.
 */
export function scopeArgs(
  model: string | undefined,
  operation: string,
  args: unknown,
  businessId: string
): unknown {
  if (!isTenantModel(model)) return args;

  const next = { ...((args ?? {}) as AnyRecord) };

  if (operation === "create") {
    next.data = { ...((next.data ?? {}) as AnyRecord), businessId };
  } else if (operation === "createMany") {
    const rows = next.data;
    next.data = Array.isArray(rows)
      ? rows.map((row) => ({ ...(row as AnyRecord), businessId }))
      : { ...((rows ?? {}) as AnyRecord), businessId };
  } else if (operation === "upsert") {
    next.where = { ...((next.where ?? {}) as AnyRecord), businessId };
    next.create = { ...((next.create ?? {}) as AnyRecord), businessId };
  } else if (WHERE_OPS.has(operation)) {
    // Prisma 5+ allows non-unique filters alongside a unique key, so this is
    // safe for findUnique/update/delete as well.
    next.where = { ...((next.where ?? {}) as AnyRecord), businessId };
  }

  return next;
}

/**
 * Returns a Prisma client pinned to one business. Reads are filtered and
 * writes are stamped, both without the call site having to ask.
 */
export function forBusiness(businessId: string) {
  if (!businessId) {
    throw new Error("forBusiness() requires a businessId");
  }

  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          return query(scopeArgs(model, operation, args, businessId) as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof forBusiness>;
