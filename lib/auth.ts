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
  type MembershipWithBusiness,
} from "@/lib/active-business";

const BUSINESS_INCLUDE = { business: true } as const;

const BUSINESS_SELECT_FALLBACK = {
  id: true,
  name: true,
  industry: true,
  currency: true,
  logo: true,
  address: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
} as const;

function formatBusinessContext(
  membership: MembershipWithBusiness,
  userId: string
) {
  const business = membership.business as Business & {
    rolePermissions?: Prisma.JsonValue | null;
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

async function loadMembershipForUserWithoutRolePermissions(
  userId: string,
  businessId?: string
) {
  if (businessId) {
    return prisma.membership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: { business: { select: BUSINESS_SELECT_FALLBACK } },
    });
  }

  const cookieBusinessId = await getActiveBusinessIdFromCookie();
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { business: { select: BUSINESS_SELECT_FALLBACK } },
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
    const membership = await loadMembershipForUser(userId, businessId);
    if (!membership) return null;

    return formatBusinessContext(membership, userId);
  } catch (error) {
    const missingRolePermissions =
      error instanceof Error &&
      /rolePermissions|sectionOverrides|column.*does not exist|P2022/i.test(
        error.message
      );

    if (!missingRolePermissions) {
      throw error;
    }

    const membership = await loadMembershipForUserWithoutRolePermissions(
      userId,
      businessId
    );

    if (!membership) return null;

    return formatBusinessContext(
      {
        ...membership,
        sectionOverrides: null,
        business: { ...membership.business, rolePermissions: null },
      } as MembershipWithBusiness,
      userId
    );
  }
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
