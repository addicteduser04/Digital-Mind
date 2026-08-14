import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { getServerEnv } from "../lib/env";

async function main() {
  const parsed = getServerEnv();
  if (!parsed.success || !parsed.data.DATABASE_URL) {
    throw new Error("Set a valid DATABASE_URL before running migrations.");
  }

  await migrate(drizzle(neon(parsed.data.DATABASE_URL)), { migrationsFolder: "./drizzle" });
  console.log("Migrations completed.");
}

main().catch((error: unknown) => {
  console.error("Migration failed.");
  if (error instanceof Error) {
    const secret = process.env.DATABASE_URL;
    console.error(secret ? error.message.replaceAll(secret, "[REDACTED]") : error.message);
  }
  process.exitCode = 1;
});
