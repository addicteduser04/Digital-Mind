import { neon } from "@neondatabase/serverless";
import { getServerEnv } from "../lib/env";

const expectedTables = [
  "app_users",
  "calendar_events",
  "daily_priorities",
  "goal_progress_history",
  "goals",
  "inbox_items",
  "life_areas",
  "milestones",
  "projects",
  "tasks",
  "time_blocks"
] as const;

async function main() {
  const parsed = getServerEnv();
  if (!parsed.success || !parsed.data.DATABASE_URL) throw new Error("DATABASE_URL is not configured or invalid.");

  const sql = neon(parsed.data.DATABASE_URL);
  const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' and table_name = any(${expectedTables as unknown as string[]}) order by table_name`;
  const constraints = await sql`select count(*)::int as count from pg_constraint where connamespace = 'public'::regnamespace and conrelid::regclass::text = any(${expectedTables as unknown as string[]})`;
  const indexes = await sql`select count(*)::int as count from pg_indexes where schemaname = 'public' and tablename = any(${expectedTables as unknown as string[]})`;

  const found = tables.map((row) => String(row.table_name));
  const missing = expectedTables.filter((table) => !found.includes(table));
  if (missing.length) throw new Error(`Core schema verification failed; missing ${missing.length} expected table(s).`);

  console.log(`Verified ${found.length} core tables, ${constraints[0]?.count ?? 0} constraints, and ${indexes[0]?.count ?? 0} indexes.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Schema verification failed.");
  process.exitCode = 1;
});
