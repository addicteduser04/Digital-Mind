import { z } from "zod";

export class CurrentUserConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrentUserConfigurationError";
  }
}

const configuredUserId = z.uuid();

export function parseCurrentUserId(value: string | undefined) {
  const result = configuredUserId.safeParse(value);
  if (!result.success) throw new CurrentUserConfigurationError("Digital Mind owner is not configured.");
  return result.data;
}
