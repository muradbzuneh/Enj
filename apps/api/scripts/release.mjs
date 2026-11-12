/**
 * Heroku release phase: apply pending Prisma migrations.
 *
 * Neon (and most managed Postgres) route through a connection pooler. The
 * Prisma migration engine takes a Postgres advisory lock before it starts,
 * and that lock request can time out (P1002) while a pooled connection is
 * being established - even though the database itself is healthy.
 *
 * Migrations are idempotent, so a failed attempt can safely be retried.
 * This script retries a few times with a short backoff before giving up.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

const MAX_ATTEMPTS = Number(process.env.MIGRATE_MAX_ATTEMPTS || 5);
const RETRY_DELAY_MS = Number(process.env.MIGRATE_RETRY_DELAY_MS || 8000);

function resolvePrismaCli() {
  try {
    return require.resolve("prisma/build/index.js");
  } catch {
    return null;
  }
}

const prismaCli = resolvePrismaCli();
if (!prismaCli) {
  console.error("Could not resolve the prisma CLI. Is `prisma` installed?");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    console.log(`[release] applying migrations (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: path.resolve(here, ".."),
      stdio: "inherit",
      env: {
        ...process.env,
        // Give the pooled connection enough time to hand out a session.
        PRISMA_SCHEMA_ENGINE_STARTUP_TIMEOUT: process.env.PRISMA_SCHEMA_ENGINE_STARTUP_TIMEOUT || "60000",
      },
    });
    console.log("[release] migrations applied successfully.");
    process.exit(0);
  } catch (error) {
    console.error(`[release] migration attempt ${attempt} failed.`);
    const details = `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`.trim();
    if (details) console.error(details);

    if (attempt === MAX_ATTEMPTS) {
      console.error("[release] giving up - migrations could not be applied.");
      process.exit(1);
    }

    console.error(`[release] retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await sleep(RETRY_DELAY_MS);
  }
}
