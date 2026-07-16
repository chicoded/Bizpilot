import { cookies } from "next/headers";
import type { Business, Membership } from "@prisma/client";
import { Role } from "@prisma/client";

export const ACTIVE_BUSINESS_COOKIE = "bizpilot_active_business";

export type MembershipWithBusiness = Membership & {
  business: Business;
};

export async function getActiveBusinessIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value ?? null;
}

export async function setActiveBusinessId(businessId: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch (error) {
    console.warn("setActiveBusinessId:", error);
  }
}

/**
 * Prefer invited team shops over accidental personal OWNER shops.
 * Common bug: cashier completes onboarding (empty shop) then accepts invite.
 */
export function pickActiveMembership(
  memberships: MembershipWithBusiness[],
  preferredBusinessId?: string | null
): MembershipWithBusiness | null {
  if (memberships.length === 0) return null;

  const ownerMemberships = memberships.filter((m) => m.role === Role.OWNER);
  const teamMemberships = memberships
    .filter((m) => m.role !== Role.OWNER)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const newestTeamMembership = teamMemberships[0] ?? null;

  if (preferredBusinessId) {
    const preferred = memberships.find(
      (m) => m.businessId === preferredBusinessId
    );
    if (preferred) {
      // Stale cookie on a personal OWNER shop while a team invite exists.
      if (preferred.role === Role.OWNER && newestTeamMembership) {
        return newestTeamMembership;
      }
      return preferred;
    }
  }

  if (memberships.length === 1) {
    return memberships[0];
  }

  // Multiple shops: always prefer the invited team role (CASHIER/MANAGER/STAFF).
  if (newestTeamMembership) {
    return newestTeamMembership;
  }

  return [...memberships].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
}
