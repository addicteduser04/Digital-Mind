import { describe, expect, it } from "vitest";
import { dateTimeLocalValue, localDateTimeToIso } from "./date-time";

describe("Casablanca form date-times", () => {
  it("converts local wall time to a safe UTC instant", () => {
    expect(localDateTimeToIso("2026-08-15T10:30")).toBe("2026-08-15T09:30:00.000Z");
  });
  it("round-trips a timestamp for form editing", () => {
    expect(dateTimeLocalValue(new Date("2026-08-15T09:30:00.000Z"))).toBe("2026-08-15T10:30");
  });
});
