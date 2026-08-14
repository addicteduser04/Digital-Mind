import { describe, expect, it } from "vitest";
import { CurrentUserConfigurationError, parseCurrentUserId } from "../../lib/domain/current-user";

describe("current owner configuration", () => {
  it("rejects a missing owner", () => expect(() => parseCurrentUserId(undefined)).toThrow(CurrentUserConfigurationError));
  it("rejects an invalid UUID", () => expect(() => parseCurrentUserId("owner")).toThrow(CurrentUserConfigurationError));
  it("accepts a valid UUID", () => expect(parseCurrentUserId("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111"));
});
