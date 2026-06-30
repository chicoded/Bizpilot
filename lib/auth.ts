import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import {
  canAccessSection,
  type AppSectionId,
} from "@/lib/permissions";

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
    const membership = businessId
      ? await prisma.membership.findUnique({
          where: { userId_businessId: { userId, businessId } },
          include: { business: true },
        })
      : await prisma.membership.findFirst({
          where: { userId },
          include: { business: true },
          orderBy: { createdAt: "asc" },
        });

    if (!membership) return null;

    return {
      userId,
      businessId: membership.businessId,
      role: membership.role,
      business: membership.business,
    };
  } catch (error) {
    const missingRolePermissions =
      error instanceof Error &&
      /rolePermissions|column.*does not exist|P2022/i.test(error.message);

    if (!missingRolePermissions) {
      throw error;
    }

    const membership = businessId
      ? await prisma.membership.findUnique({
          where: { userId_businessId: { userId, businessId } },
          include: {
            business: {
              select: {
                id: true,
                name: true,
                industry: true,
                currency: true,
                logo: true,
                address: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        })
      : await prisma.membership.findFirst({
          where: { userId },
          include: {
            business: {
              select: {
                id: true,
                name: true,
                industry: true,
                currency: true,
                logo: true,
                address: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

    if (!membership) return null;

    return {
      userId,
      businessId: membership.businessId,
      role: membership.role,
      business: { ...membership.business, rolePermissions: null },
    };
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

export async function requireSectionAccess(section: AppSectionId) {
  const ctx = await requireBusinessContext();
  if (!canAccessSection(ctx.role, ctx.business.rolePermissions, section)) {
    throw new Error("You do not have access to this section");
  }
  return ctx;
}

export async function requirePageAccess(section: AppSectionId) {
  const ctx = await requireBusinessContext();
  if (!canAccessSection(ctx.role, ctx.business.rolePermissions, section)) {
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
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.user.upsert({
    where: { id: clerkUser.id },
    update: {
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
    create: {
      id: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
  });
}
