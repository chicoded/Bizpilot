import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shouldUseRushPos } from "@/lib/rush-pos/constants";
import { RushSetupClient } from "@/features/rush-pos/rush-setup-client";

export const dynamic = "force-dynamic";

export default async function RushSetupPage() {
  const ctx = await requirePageAccess("sales");
  const settings = await prisma.restaurantSettings
    .findUnique({ where: { businessId: ctx.businessId } })
    .catch(() => null);

  if (!shouldUseRushPos(ctx.business.industry, settings)) {
    redirect("/sales");
  }

  const [products, favorites, combos] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: ctx.businessId, isActive: true },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        category: true,
        quantity: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.favoriteProduct.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { sortOrder: "asc" },
      take: 20,
      select: { productId: true },
    }),
    prisma.mealCombo.findMany({
      where: { businessId: ctx.businessId, isActive: true },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <RushSetupClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        sellingPrice: Number(p.sellingPrice),
        category: p.category,
        quantity: p.quantity,
      }))}
      initialFavoriteIds={favorites.map((f) => f.productId)}
      combos={combos.map((c) => ({
        id: c.id,
        name: c.name,
        price: Number(c.price),
        items: c.items,
      }))}
    />
  );
}
