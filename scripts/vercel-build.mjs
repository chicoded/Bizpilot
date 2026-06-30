import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

run("prisma generate");

if (process.env.DATABASE_URL) {
  console.log("Ensuring optional product schema columns...");
  try {
    run("node scripts/ensure-product-schema.mjs");
  } catch {
    console.warn(
      "Schema ensure step failed — inventory will still load using safe fallbacks."
    );
  }
}

if (process.env.RUN_PRISMA_MIGRATE === "true") {
  console.log("RUN_PRISMA_MIGRATE=true — applying database migrations...");
  run("prisma migrate deploy");
} else {
  console.log(
    "Skipping prisma migrate deploy. Supabase schema is expected to exist already " +
      "(from npm run db:setup). Set RUN_PRISMA_MIGRATE=true after baselining to enable."
  );
}

run("next build");
