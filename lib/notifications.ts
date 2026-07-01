import { prisma } from "@/lib/db";
import { addDays } from "date-fns";

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  variant: "warning" | "danger" | "info";
};

export async function getAppNotifications(
  businessId: string
): Promise<AppNotification[]> {
  const expiryThreshold = addDays(new Date(), 30);
  const [expiring, debtors, subscription] = await Promise.all([
    prisma.product.count({
      where: {
        businessId,
        isActive: true,
        expiryDate: { lte: expiryThreshold, gte: new Date() },
      },
    }),
    prisma.customer.count({
      where: { businessId, debt: { gt: 0 } },
    }),
    prisma.subscription.findUnique({ where: { businessId } }),
  ]);

  // Fallback low stock count — Prisma can't compare columns in count easily
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: { quantity: true, reorderLevel: true },
  });
  const lowStockCount = products.filter(
    (p) => p.quantity <= p.reorderLevel
  ).length;

  const items: AppNotification[] = [];

  if (lowStockCount > 0) {
    items.push({
      id: "low-stock",
      title: `${lowStockCount} products low on stock`,
      description: "Reorder before you run out.",
      href: "/inventory/low-stock",
      variant: "warning",
    });
  }

  if (expiring > 0) {
    items.push({
      id: "expiring",
      title: `${expiring} products expiring soon`,
      description: "Review inventory within 30 days.",
      href: "/inventory",
      variant: "danger",
    });
  }

  if (debtors > 0) {
    items.push({
      id: "debtors",
      title: `${debtors} customers owe you`,
      description: "Follow up on outstanding debts.",
      href: "/debts",
      variant: "warning",
    });
  }

  if (subscription?.status === "PAST_DUE") {
    items.push({
      id: "billing",
      title: "Subscription payment overdue",
      description: "Update billing to keep full access.",
      href: "/settings/billing",
      variant: "danger",
    });
  } else if (subscription?.status === "TRIAL" && subscription.currentPeriodEnd) {
    const days = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - Date.now()) / 86400000
    );
    if (days <= 7 && days >= 0) {
      items.push({
        id: "trial",
        title: `Trial ends in ${days} day${days === 1 ? "" : "s"}`,
        description: "Choose a plan to continue after trial.",
        href: "/settings/billing",
        variant: "info",
      });
    }
  }

  return items;
}
