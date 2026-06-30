import pg from "pg";

const sql = `
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "rolePermissions" JSONB;
`;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log("rolePermissions column ensured on businesses");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
