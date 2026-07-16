import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const user = await p.user.findFirst({
    where: { email: "mchinaza4u@gmail.com" },
    include: {
      memberships: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              _count: {
                select: { products: true, sales: true, memberships: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log("USER_NOT_FOUND");
    return;
  }

  console.log(
    JSON.stringify(
      {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        memberships: user.memberships.map((m) => ({
          role: m.role,
          businessId: m.businessId,
          businessName: m.business.name,
          products: m.business._count.products,
          sales: m.business._count.sales,
          members: m.business._count.memberships,
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
