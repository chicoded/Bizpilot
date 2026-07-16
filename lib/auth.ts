import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Role, Prisma, type Business, type Membership } from "@prisma/client";
import {
  canAccessSection,
  type AppSectionId,
} from "@/lib/permissions";
import {
  getActiveBusinessIdFromCookie,
  pickActiveMembership,
  setActiveBusinessId,
  type MembershipWithBusiness,
} from "@/lib/active-business";

const BUSINESS_INCLUDE = { business: true } as const;

/** Safe columns that exist on older DBs before industryLabel was added. */
const BUSINESS_SELECT_CORE = {
  id: true,
  name: true,
  industry: true,
  currency: true,
  logo: true,
  address: true,
  phone: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isMissingSchemaColumnError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") return true;
  }
  return (
    error instanceof Error &&
    /rolePermissions|sectionOverrides|industryLabel|column.*does not exist|P2022/i.test(
      error.message
    )
  );
}

function formatBusinessContext(
  membership: MembershipWithBusiness,
  userId: string
) {
  const business = membership.business as Business & {
    rolePermissions?: Prisma.JsonValue | null;
    industryLabel?: string | null;
  };

  return {
    userId,
    businessId: membership.businessId,
    role: membership.role,
    sectionOverrides:
      (membership as Membership & { sectionOverrides?: Prisma.JsonValue | null })
        .sectionOverrides ?? null,
    business: {
      ...business,
      industryLabel: business.industryLabel ?? null,
      rolePermissions: business.rolePermissions ?? null,
    },
  };
}

async function loadMembershipForUser(userId: string, businessId?: string) {
  if (businessId) {
    return prisma.membership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: BUSINESS_INCLUDE,
    });
  }

  const cookieBusinessId = await getActiveBusinessIdFromCookie();
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: BUSINESS_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  const picked = pickActiveMembership(memberships, cookieBusinessId);
  return picked;
}

async function loadMembershipForUserCoreColumns(
  userId: string,
  businessId?: string
) {
  if (businessId) {
    return prisma.membership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: { business: { select: BUSINESS_SELECT_CORE } },
    });
  }

  const cookieBusinessId = await getActiveBusinessIdFromCookie();
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { business: { select: BUSINESS_SELECT_CORE } },
    orderBy: { createdAt: "desc" },
  });

  return pickActiveMembership(
    memberships as MembershipWithBusiness[],
    cookieBusinessId
  );
}

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { business: true },
      },
    },
  });

  return user;
}

export async function getBusinessContext(businessId?: string) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    let membership = await loadMembershipForUser(userId, businessId);
    if (!membership) return null;

    // Heal anyone stuck on an empty shop when another membership has stock.
    if (!businessId) {
      const healed = await healEmptyShopIfNeeded(userId, membership);
      if (healed) membership = healed;
    }

    return formatBusinessContext(membership, userId);
  } catch (error) {
    if (!isMissingSchemaColumnError(error)) {
      throw error;
    }

    // Older DBs may be missing industryLabel / rolePermissions / etc.
    const membership = await loadMembershipForUserCoreColumns(
      userId,
      businessId
    );

    if (!membership) return null;

    return formatBusinessContext(
      {
        ...membership,
        sectionOverrides: null,
        business: {
          ...membership.business,
          industryLabel: null,
          rolePermissions: null,
        },
      } as MembershipWithBusiness,
      userId
    );
  }
}

/**
 * If the active shop has 0 products but another membership has stock,
 * switch onto the shop with the most products (fixes typo duplicate shops
 * like "ade pharmcy" vs "ade pharmacy", and invite + empty onboarding).
 */
async function healEmptyShopIfNeeded(
  userId: string,
  current: MembershipWithBusiness
): Promise<MembershipWithBusiness | null> {
  try {
    const currentCount = await prisma.product.count({
      where: { businessId: current.businessId, isActive: true },
    });

    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    });

    if (memberships.length <= 1) return null;

    let best: MembershipWithBusiness | null = null;
    let bestCount = currentCount;

    for (const row of memberships) {
      const count = await prisma.product.count({
        where: { businessId: row.businessId, isActive: true },
      });
      if (count > bestCount) {
        bestCount = count;
        best = row as MembershipWithBusiness;
      }
    }

    // Only switch away when current shop is empty (or clearly poorer) and another has stock.
    if (best && best.businessId !== current.businessId && bestCount > 0) {
      if (currentCount === 0 || bestCount >= currentCount * 2) {
        await setActiveBusinessId(best.businessId);
        return best;
      }
    }
  } catch (error) {
    console.warn("[auth] healEmptyShopIfNeeded:", error);
  }
  return null;
}

export async function requireBusinessContext(businessId?: string) {
  const ctx = await getBusinessContext(businessId);
  if (!ctx) {
    throw new Error("Unauthorized or no business found");
  }
  return ctx;
}

export function hasPermission(role: Role, required: Role[]): boolean {
  const hierarchy: Record<Role, number> = {
    OWNER: 4,
    MANAGER: 3,
    CASHIER: 2,
    STAFF: 1,
  };
  const userLevel = hierarchy[role];
  return required.some((r) => userLevel >= hierarchy[r]);
}

export function canManageTeam(role: Role): boolean {
  return hasPermission(role, [Role.OWNER, Role.MANAGER]);
}

export function canChangeRoles(role: Role): boolean {
  return role === Role.OWNER;
}

export async function requireTeamManager() {
  const ctx = await requireBusinessContext();
  if (!canManageTeam(ctx.role)) {
    throw new Error("Only owners and managers can manage the team");
  }
  return ctx;
}

export async function requireOwner() {
  const ctx = await requireBusinessContext();
  if (ctx.role !== Role.OWNER) {
    throw new Error("Only the business owner can perform this action");
  }
  return ctx;
}

export async function requireSectionAccess(section: AppSectionId) {
  const ctx = await requireBusinessContext();
  if (
    !canAccessSection(
      ctx.role,
      ctx.business.rolePermissions,
      section,
      ctx.sectionOverrides
    )
  ) {
    throw new Error("You do not have access to this section");
  }
  return ctx;
}

export async function requirePageAccess(section: AppSectionId) {
  const ctx = await requireBusinessContext();
  if (
    !canAccessSection(
      ctx.role,
      ctx.business.rolePermissions,
      section,
      ctx.sectionOverrides
    )
  ) {
    redirect("/menu?denied=1");
  }
  return ctx;
}

export async function syncClerkUser(clerkUser: {
  id: string;
  emailAddresses: { emailAddress: string }[];
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
}) {
  const rawEmail = clerkUser.emailAddresses[0]?.emailAddress;
  const email = rawEmail?.trim().toLowerCase();
  if (!email) return null;

  const profile = {
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
  };

  const byId = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (byId) {
    return prisma.user.update({
      where: { id: clerkUser.id },
      data: profile,
    });
  }

  // After Clerk domain moves, the same email may exist under an old user id.
  const byEmail =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    }));

  if (byEmail && byEmail.id !== clerkUser.id) {
    // Free the unique email before creating the new Clerk id row.
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: byEmail.id },
        data: { email: `legacy+${byEmail.id}@migrated.local` },
      });

      await tx.user.create({
        data: { id: clerkUser.id, ...profile },
      });

      await tx.membership.updateMany({
        where: { userId: byEmail.id },
        data: { userId: clerkUser.id },
      });
      await tx.teamInvite.updateMany({
        where: { invitedBy: byEmail.id },
        data: { invitedBy: clerkUser.id },
      });
      await tx.auditLog.updateMany({
        where: { userId: byEmail.id },
        data: { userId: clerkUser.id },
      });

      await tx.user.delete({ where: { id: byEmail.id } });
      return tx.user.findUniqueOrThrow({ where: { id: clerkUser.id } });
    });
  }

  try {
    return await prisma.user.create({
      data: { id: clerkUser.id, ...profile },
    });
  } catch (error) {
    // Race / case mismatch: email already taken — re-run remap once.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (existing && existing.id !== clerkUser.id) {
        return syncClerkUser(clerkUser);
      }
    }
    throw error;
  }
}
