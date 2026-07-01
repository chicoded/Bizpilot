import { requireBusinessContext } from "@/lib/auth";
import { canAccessSection, type AppSectionId } from "@/lib/permissions";

export async function requireBusinessDataAccess(sections: AppSectionId[]) {
  const ctx = await requireBusinessContext();
  const allowed = sections.some((section) =>
    canAccessSection(
      ctx.role,
      ctx.business.rolePermissions,
      section,
      ctx.sectionOverrides
    )
  );

  if (!allowed) {
    throw new Error("You do not have access to this data");
  }

  return ctx;
}
