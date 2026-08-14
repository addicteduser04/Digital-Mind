import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

export function getDatabase() {
  const parsed = getServerEnv();
  if (!parsed.success || !parsed.data.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured or is invalid.");
  }

  return drizzle(neon(parsed.data.DATABASE_URL), { schema });
}
