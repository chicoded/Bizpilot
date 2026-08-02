import { execSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

/**
 * Local binaries must be reachable however this script is started.
 *
 * `prisma` and `next` are only on PATH when npm runs a lifecycle script. Hosts
 * invoke this file directly as `node scripts/deploy-build.mjs`, so whether the
 * bare names resolve depends entirely on whether that host happens to prepend
 * node_modules/.bin — Vercel does, which is why this went unnoticed. Running it
 * from an ordinary shell fails outright.
 *
 * Prepending it here makes the script independent of that, and is safer than
 * rewriting the calls as npx, which can decide to fetch from the registry when
 * a binary is missing rather than failing loudly.
 */
const binDir = resolve(import.meta.dirname, "..", "node_modules", ".bin");
const env = { ...process.env, PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` };

function run(command) {
  execSync(command, { stdio: "inherit", env });
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
  try {
    run("node scripts/ensure-team-schema.mjs");
  } catch {
    console.warn("Team schema ensure step failed.");
  }
  try {
    run("node scripts/ensure-app-schema.mjs");
  } catch {
    console.warn(
      "App schema ensure step failed — AI limits and receipt numbers may need manual SQL."
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
