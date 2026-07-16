import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  try {
    await p.$queryRaw`SELECT 1 as ok`;
    console.log("DB_PING: ok");

    const [businesses, products, sales, users, memberships] = await Promise.all([
      p.business.count(),
      p.product.count({ where: { isActive: true } }),
      p.sale.count(),
      p.user.count(),
      p.membership.count(),
    ]);
    console.log(
      JSON.stringify({ businesses, products, sales, users, memberships }, null, 2)
    );

    const shops = await p.business.findMany({
      select: {
        id: true,
        name: true,
        industry: true,
        _count: {
          select: { products: true, sales: true, memberships: true },
        },
        memberships: {
          select: {
            role: true,
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    for (const s of shops) {
      console.log(
        `SHOP: ${s.name} | products ${s._count.products} | sales ${s._count.sales} | members ${s._count.memberships}`
      );
      for (const m of s.memberships) {
        console.log(
          `  - ${m.role} ${m.user.email} ${(m.user.firstName || "")} ${(m.user.lastName || "")}`.trim()
        );
      }
    }

    const ade = shops.find((s) => /ade/i.test(s.name));
    if (ade) {
      const activeProducts = await p.product.findMany({
        where: { businessId: ade.id, isActive: true },
        select: {
          id: true,
          name: true,
          quantity: true,
          sellingPrice: true,
        },
        take: 30,
      });
      console.log("ADE_PRODUCTS:", JSON.stringify(activeProducts, null, 2));

      const augustine = ade.memberships.find((m) =>
        /augustine|maugustine/i.test(m.user.email || "")
      );
      console.log(
        "AUGUSTINE_MEMBER:",
        augustine
          ? `${augustine.role} ${augustine.user.email}`
          : "NOT FOUND on Ade Pharmacy"
      );
    } else {
      console.log("ADE_SHOP: not found by name");
    }

    const tables = await p.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'businesses','products','sales','users','memberships',
          'internal_admins','restaurant_settings','kitchen_orders'
        )
      ORDER BY table_name
    `;
    console.log("TABLES:", tables);
  } catch (e) {
    console.error("DB_ERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
  }
}

main();
