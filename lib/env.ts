import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres").optional()
});

export function getServerEnv(env: Record<string, string | undefined> = process.env) {
  return serverEnvSchema.safeParse({
    DATABASE_URL: env.DATABASE_URL || undefined
  });
}
