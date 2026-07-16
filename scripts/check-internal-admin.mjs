import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const configured = Boolean(
    (process.env.INTERNAL_ADMIN_EMAILS ?? "").trim()
  );
  console.log("INTERNAL_ADMIN_EMAILS configured:", configured);

  try {
    const count = await p.internalAdmin.count();
    console.log("internal_admins rows:", count);
  } catch (e) {
    console.log(
      "internal_admins table:",
      e instanceof Error ? e.message.slice(0, 160) : e
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
