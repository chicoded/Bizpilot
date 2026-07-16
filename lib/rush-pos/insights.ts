import type { LocalSale } from "@/lib/local-db/types";
import { currentDaypart } from "@/lib/rush-pos/adaptive";

export type RushInsights = {
  daypart: ReturnType<typeof currentDaypart>;
  todayOrders: number;
  todayRevenue: number;
  avgOrderValue: number;
  peakHourLabel: string;
  peakHourOrders: number;
  topItems: { name: string; quantity: number; revenue: number }[];
  topCombosHint: { name: string; count: number }[];
  hourly: { hour: number; label: string; orders: number; revenue: number }[];
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Rush-hour insights from local sales (offline-capable). */
export function computeRushInsights(sales: LocalSale[]): RushInsights {
  const todayStart = startOfToday().getTime();
  const today = sales.filter((s) => new Date(s.createdAt).getTime() >= todayStart);

  const hourlyMap = new Map<number, { orders: number; revenue: number }>();
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const pairMap = new Map<string, number>();

  for (const sale of today) {
    const hour = new Date(sale.createdAt).getHours();
    const bucket = hourlyMap.get(hour) ?? { orders: 0, revenue: 0 };
    bucket.orders += 1;
    bucket.revenue += sale.total;
    hourlyMap.set(hour, bucket);

    const names = sale.items.map((i) => i.productName);
    for (const item of sale.items) {
      const row = itemMap.get(item.productId) ?? {
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      row.quantity += item.quantity;
      row.revenue += item.total;
      itemMap.set(item.productId, row);
    }

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join(" + ");
        pairMap.set(key, (pairMap.get(key) ?? 0) + 1);
      }
    }
  }

  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const row = hourlyMap.get(hour) ?? { orders: 0, revenue: 0 };
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      orders: row.orders,
      revenue: row.revenue,
    };
  });

  const peak = [...hourly].sort((a, b) => b.orders - a.orders)[0];
  const todayRevenue = today.reduce((sum, s) => sum + s.total, 0);

  return {
    daypart: currentDaypart(),
    todayOrders: today.length,
    todayRevenue,
    avgOrderValue: today.length ? todayRevenue / today.length : 0,
    peakHourLabel: peak && peak.orders > 0 ? peak.label : "—",
    peakHourOrders: peak?.orders ?? 0,
    topItems: [...itemMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    topCombosHint: [...pairMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    hourly: hourly.filter((h) => h.hour >= 6 && h.hour <= 22),
  };
}
