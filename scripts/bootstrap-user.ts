import { readFile, writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { getServerEnv } from "../lib/env";

async function main() {
  const parsed = getServerEnv();
  if (!parsed.success || !parsed.data.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = neon(parsed.data.DATABASE_URL);
  const existing = await sql`select id from app_users order by created_at asc limit 1`;
  const owner = existing[0] ?? (await sql`insert into app_users (email, display_name) values ('owner@digital-mind.local', 'Digital Mind Owner') returning id`)[0];
  if (!owner?.id) throw new Error("Could not bootstrap the Digital Mind owner.");

  if (process.argv.includes("--write-env")) {
    const path = ".env.local";
    const source = await readFile(path, "utf8");
    const line = `DIGITAL_MIND_USER_ID=${owner.id}`;
    const next = /^DIGITAL_MIND_USER_ID=.*$/m.test(source)
      ? source.replace(/^DIGITAL_MIND_USER_ID=.*$/m, line)
      : `${source.trimEnd()}\n${line}\n`;
    await writeFile(path, next, { mode: 0o600 });
    console.log("Digital Mind owner is configured in .env.local.");
    return;
  }

  console.log("Owner exists. Run with --write-env to configure DIGITAL_MIND_USER_ID without printing it.");
}

main().catch(() => {
  console.error("Owner bootstrap failed.");
  process.exitCode = 1;
});
