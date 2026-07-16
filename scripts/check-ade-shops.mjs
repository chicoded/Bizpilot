import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const shops = await p.business.findMany({
    where: { name: { contains: "ade", mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { products: true, sales: true, memberships: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("SHOPS:", JSON.stringify(shops, null, 2));

  for (const s of shops) {
    const prods = await p.product.findMany({
      where: { businessId: s.id, isActive: true },
      select: { id: true, name: true, quantity: true, sellingPrice: true },
    });
    const mem = await p.membership.findMany({
      where: { businessId: s.id },
      include: { user: { select: { email: true } } },
    });
    console.log(`\n=== ${s.name} (${s.id}) ===`);
    console.log("products:", prods);
    console.log(
      "members:",
      mem.map((m) => `${m.role} ${m.user.email}`)
    );
  }

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
