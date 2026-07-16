import { prisma } from "@/lib/db";
import { startOfDay, startOfMonth, subDays } from "date-fns";

export async function getInternalDashboardMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const weekStart = subDays(now, 7);

  const [
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    todaySignups,
    monthSignups,
    totalUsers,
    activeSubscriptions,
    trialSubscriptions,
    successPayments,
    todayPayments,
    monthPayments,
    aiToday,
    aiMonth,
    productCount,
    customerCount,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { suspendedAt: null } }),
    prisma.business.count({ where: { suspendedAt: { not: null } } }),
    prisma.business.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.business.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count(),
    prisma.subscription.count({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
    }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.paymentTransaction.findMany({
      where: { status: "success" },
      select: { amount: true, createdAt: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: "success", createdAt: { gte: todayStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: "success", createdAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.aiPromptLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.aiPromptLog.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.customer.count(),
  ]);

  const mrrPlans = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { plan: true },
  });

  const planPrice: Record<string, number> = {
    STARTER: 5000,
    BUSINESS: 15000,
    AI_PRO: 30000,
  };
  const mrr = mrrPlans.reduce((sum, s) => sum + (planPrice[s.plan] ?? 0), 0);

  const recentBusinesses = await prisma.business.findMany({
    where: { createdAt: { gte: weekStart } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const signupsByDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = subDays(todayStart, i);
    signupsByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const b of recentBusinesses) {
    const key = b.createdAt.toISOString().slice(0, 10);
    if (signupsByDay.has(key)) {
      signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
    }
  }

  return {
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    todaySignups,
    monthSignups,
    totalUsers,
    activeSubscriptions,
    trialSubscriptions,
    mrr,
    arr: mrr * 12,
    revenueAllTime: successPayments.reduce(
      (s, p) => s + Number(p.amount),
      0
    ),
    todayRevenue: Number(todayPayments._sum.amount ?? 0),
    todayTransactions: todayPayments._count,
    monthRevenue: Number(monthPayments._sum.amount ?? 0),
    monthTransactions: monthPayments._count,
    aiToday,
    aiMonth,
    productCount,
    customerCount,
    signupSpark: Array.from(signupsByDay.entries()).map(([date, count]) => ({
      date,
      count,
    })),
  };
}
