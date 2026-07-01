import { prisma } from "@/lib/db";

export type GetStartedProgress = {
  hasProduct: boolean;
  hasSale: boolean;
  hasTeamMember: boolean;
  productCount: number;
  saleCount: number;
  memberCount: number;
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
};

export async function getGetStartedProgress(
  businessId: string
): Promise<GetStartedProgress> {
  const [productCount, saleCount, memberCount] = await Promise.all([
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.sale.count({ where: { businessId } }),
    prisma.membership.count({ where: { businessId } }),
  ]);

  const hasProduct = productCount > 0;
  const hasSale = saleCount > 0;
  const hasTeamMember = memberCount > 1;

  const steps = [hasProduct, hasSale, hasTeamMember];
  const completedCount = steps.filter(Boolean).length;

  return {
    hasProduct,
    hasSale,
    hasTeamMember,
    productCount,
    saleCount,
    memberCount,
    completedCount,
    totalSteps: 3,
    isComplete: completedCount === 3,
  };
}
