import { requireInternalAdmin } from "@/lib/internal/auth";
import { prisma } from "@/lib/db";
import { StaffAdminPanel } from "@/components/internal/staff-admin-panel";

export default async function InternalAdminsPage() {
  const admin = await requireInternalAdmin("admins:manage");

  const rows = await prisma.internalAdmin.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Staff admins</h1>
        <p className="text-sm text-slate-400">
          Invite ops staff by email and manage roles. Phase 2.
        </p>
      </div>
      <StaffAdminPanel
        currentUserId={admin.userId}
        staff={rows.map((r) => ({
          id: r.id,
          role: r.role,
          disabled: r.disabled,
          userId: r.userId,
          email: r.user.email,
          name: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
