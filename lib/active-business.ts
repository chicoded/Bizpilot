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
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function pickActiveMembership(
  memberships: MembershipWithBusiness[],
  preferredBusinessId?: string | null
): MembershipWithBusiness | null {
  if (memberships.length === 0) return null;

  const ownerMemberships = memberships.filter((m) => m.role === Role.OWNER);
  const teamMemberships = memberships.filter((m) => m.role !== Role.OWNER);
  const newestTeamMembership =
    teamMemberships.length > 0
      ? [...teamMemberships].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0]
      : null;

  if (preferredBusinessId) {
    const preferred = memberships.find((m) => m.businessId === preferredBusinessId);
    if (preferred) {
      // Stale cookie from accidental onboarding: prefer the invited company.
      if (
        preferred.role === Role.OWNER &&
        newestTeamMembership &&
        memberships.length > 1
      ) {
        return newestTeamMembership;
      }
      return preferred;
    }
  }

  if (memberships.length === 1) {
    return memberships[0];
  }

  if (ownerMemberships.length >= 1 && newestTeamMembership) {
    return newestTeamMembership;
  }

  return [...memberships].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
}
