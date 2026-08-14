import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { appUsers } from "@/db/schema";
import { CurrentUserConfigurationError, parseCurrentUserId } from "@/lib/domain/current-user";

export async function requireAppUser(userId: string) {
  const [user] = await getDatabase().select({ id: appUsers.id, displayName: appUsers.displayName, timezone: appUsers.timezone })
    .from(appUsers).where(eq(appUsers.id, userId)).limit(1);
  if (!user) throw new CurrentUserConfigurationError("The configured Digital Mind owner does not exist.");
  return user;
}

export const getCurrentUser = cache(async () => requireAppUser(parseCurrentUserId(process.env.DIGITAL_MIND_USER_ID)));

export async function getCurrentUserId() {
  return (await getCurrentUser()).id;
}

export { CurrentUserConfigurationError } from "@/lib/domain/current-user";
