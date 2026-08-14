import { describe, expect, it } from "vitest";
import { getServerEnv } from "./env";

describe("server environment", () => {
  it("allows an unconfigured database during foundation setup", () => {
    expect(getServerEnv({}).success).toBe(true);
  });

  it("rejects malformed database URLs", () => {
    expect(getServerEnv({ DATABASE_URL: "not-a-url" }).success).toBe(false);
  });

  it("accepts PostgreSQL URLs", () => {
    expect(getServerEnv({ DATABASE_URL: "postgresql://user:pass@example.com/db" }).success).toBe(true);
  });
});
