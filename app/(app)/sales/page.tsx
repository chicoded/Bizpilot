import { getBusinessContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shouldUseRushPos } from "@/lib/rush-pos/constants";
import { ClassicPos } from "@/features/sales/classic-pos";
import { RushPosEngine } from "@/features/rush-pos/rush-pos-engine";

export default async function SalesPage() {
  const ctx = await getBusinessContext();
  if (!ctx) {
    return <ClassicPos />;
  }

  const settings = await prisma.restaurantSettings
    .findUnique({ where: { businessId: ctx.businessId } })
    .catch(() => null);

  const useRush = shouldUseRushPos(ctx.business.industry, settings);
  if (!useRush) {
    return <ClassicPos />;
  }

  // Auto-create settings for restaurant industries on first Rush visit.
  if (!settings && shouldUseRushPos(ctx.business.industry, null)) {
    await prisma.restaurantSettings
      .create({
        data: {
          businessId: ctx.businessId,
          rushModeEnabled: true,
        },
      })
      .catch(() => null);
  }

  const [favorites, combos] = await Promise.all([
    prisma.favoriteProduct
      .findMany({
        where: { businessId: ctx.businessId },
        orderBy: { sortOrder: "asc" },
        take: 20,
        select: { productId: true },
      })
      .catch(() => [] as { productId: string }[]),
    prisma.mealCombo
      .findMany({
        where: { businessId: ctx.businessId, isActive: true },
        include: { items: { select: { productId: true } } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
      .catch(() => []),
  ]);

  return (
    <RushPosEngine
      favoriteIds={favorites.map((f) => f.productId)}
      combos={combos.map((c) => ({
        id: c.id,
        name: c.name,
        price: Number(c.price),
        imageUrl: c.imageUrl,
        productIds: c.items.map((i) => i.productId),
      }))}
      aiSuggestionsEnabled={settings?.aiSuggestionsEnabled ?? true}
      kitchenEnabled={settings?.kitchenDisplayEnabled ?? true}
      comboMealsEnabled={settings?.comboMealsEnabled ?? true}
    />
  );
}
