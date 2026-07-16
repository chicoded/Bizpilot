import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const EMPTY_TYPO_ID = "cmr0fx6s30002l5045gif6rsv"; // ade pharmcy

async function main() {
  const shop = await p.business.findUnique({
    where: { id: EMPTY_TYPO_ID },
    include: {
      _count: { select: { products: true, sales: true, memberships: true } },
      memberships: {
        include: { user: { select: { email: true } } },
      },
    },
  });

  if (!shop) {
    console.log("Shop already gone");
    return;
  }

  console.log("Before:", shop.name, shop._count);
  console.log(
    "Members:",
    shop.memberships.map((m) => `${m.role} ${m.user.email}`)
  );

  if (shop.name !== "ade pharmcy") {
    throw new Error("Safety: unexpected shop name");
  }
  if (shop._count.products > 0 || shop._count.sales > 0) {
    throw new Error("Safety: shop is not empty");
  }

  const deletedMemberships = await p.membership.deleteMany({
    where: { businessId: EMPTY_TYPO_ID },
  });
  console.log("Deleted memberships:", deletedMemberships.count);

  // Pending invites for this empty shop
  try {
    const deletedInvites = await p.invite.deleteMany({
      where: { businessId: EMPTY_TYPO_ID },
    });
    console.log("Deleted invites:", deletedInvites.count);
  } catch {
    // invite table may not exist in older DBs
  }

  await p.business.delete({ where: { id: EMPTY_TYPO_ID } });
  console.log("Deleted empty typo business ade pharmcy");

  const mchinaza = await p.membership.findMany({
    where: { user: { email: "mchinaza4u@gmail.com" } },
    include: { business: { select: { name: true } } },
  });
  console.log(
    "mchinaza memberships now:",
    mchinaza.map((m) => `${m.role} @ ${m.business.name}`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
