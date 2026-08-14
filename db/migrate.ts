import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { getServerEnv } from "../lib/env";

const parsed = getServerEnv();
if (!parsed.success || !parsed.data.DATABASE_URL) {
  throw new Error("Set a valid DATABASE_URL before running migrations.");
}

await migrate(drizzle(neon(parsed.data.DATABASE_URL)), { migrationsFolder: "./drizzle" });
console.log("Migrations completed.");
