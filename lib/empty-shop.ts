import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Empty "shell" shops from accidental onboarding (e.g. typo "ade pharmcy")
 * with no products/sales. Users removed from a real team often get stuck here
 * and cannot create a new shop.
 */
export async function isAbandonedEmptyShop(businessId: string): Promise<boolean> {
  const [products, sales] = await Promise.all([
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.sale.count({ where: { businessId } }),
  ]);
  return products === 0 && sales === 0;
}

/**
 * True when this user only owns/is on abandoned empty shops (no real activity).
 * Used so onboarding can run again after team removal.
 */
export async function userOnlyHasAbandonedShops(userId: string): Promise<boolean> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { businessId: true, role: true },
  });

  if (memberships.length === 0) return true;

  for (const m of memberships) {
    const abandoned = await isAbandonedEmptyShop(m.businessId);
    if (!abandoned) return false;
  }

  return true;
}

/**
 * Detach the user from empty shell shops and delete shells that have no
 * remaining members / activity. Returns true if any cleanup happened.
 */
export async function abandonEmptyShellShopsForUser(
  userId: string
): Promise<{ abandoned: number; deletedBusinesses: number }> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { id: true, businessId: true, role: true },
  });

  let abandoned = 0;
  let deletedBusinesses = 0;

  for (const m of memberships) {
    const empty = await isAbandonedEmptyShop(m.businessId);
    if (!empty) continue;

    await prisma.membership.delete({ where: { id: m.id } });
    abandoned += 1;

    const remaining = await prisma.membership.count({
      where: { businessId: m.businessId },
    });

    if (remaining === 0) {
      try {
        await prisma.teamInvite.deleteMany({ where: { businessId: m.businessId } });
      } catch {
        // optional table
      }
      try {
        await prisma.subscription.deleteMany({
          where: { businessId: m.businessId },
        });
      } catch {
        // optional
      }
      await prisma.business.delete({ where: { id: m.businessId } });
      deletedBusinesses += 1;
    } else if (m.role === Role.OWNER) {
      // Owner left an empty shell that still has cashiers — remove leftover
      // team memberships on that empty shell so they are not stuck either.
      const leftover = await prisma.membership.findMany({
        where: { businessId: m.businessId },
        select: { id: true },
      });
      if (leftover.length > 0) {
        await prisma.membership.deleteMany({
          where: { businessId: m.businessId },
        });
      }
      const stillEmpty = await isAbandonedEmptyShop(m.businessId);
      const membersLeft = await prisma.membership.count({
        where: { businessId: m.businessId },
      });
      if (stillEmpty && membersLeft === 0) {
        try {
          await prisma.teamInvite.deleteMany({
            where: { businessId: m.businessId },
          });
        } catch {
          // ignore
        }
        try {
          await prisma.subscription.deleteMany({
            where: { businessId: m.businessId },
          });
        } catch {
          // ignore
        }
        await prisma.business.delete({ where: { id: m.businessId } });
        deletedBusinesses += 1;
      }
    }
  }

  return { abandoned, deletedBusinesses };
}
