import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();
  if (!env.success || !env.data.DATABASE_URL) {
    return NextResponse.json(
      { status: "degraded", database: "not_configured" },
      { status: 503 }
    );
  }

  try {
    await getDatabase().execute(sql`select 1`);
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json(
      { status: "degraded", database: "unavailable" },
      { status: 503 }
    );
  }
}
