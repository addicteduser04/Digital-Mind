import { describe, expect, it } from "vitest";
import { createGoalSchema, createLifeAreaSchema, createTaskSchema } from "./validation";

const userId = "11111111-1111-4111-8111-111111111111";

describe("core domain validation", () => {
  it("accepts a valid life area and applies stable defaults", () => {
    const result = createLifeAreaSchema.parse({ userId, name: " Health " });
    expect(result).toMatchObject({ name: "Health", position: 0, status: "active" });
  });

  it.each([0, 11])("rejects importance outside 1–10: %s", (importance) => {
    expect(createLifeAreaSchema.safeParse({ userId, name: "Health", importance }).success).toBe(false);
  });

  it("rejects unknown status values", () => {
    expect(createTaskSchema.safeParse({ userId, title: "Work", status: "done" }).success).toBe(false);
  });

  it("rejects negative task durations", () => {
    expect(createTaskSchema.safeParse({ userId, title: "Work", actualMinutes: -1 }).success).toBe(false);
  });

  it("rejects an inverted task schedule", () => {
    expect(createTaskSchema.safeParse({
      userId,
      title: "Work",
      scheduledStart: "2026-08-15T11:00:00+01:00",
      scheduledEnd: "2026-08-15T10:00:00+01:00"
    }).success).toBe(false);
  });

  it("requires completed timestamps for completed records", () => {
    expect(createTaskSchema.safeParse({ userId, title: "Work", status: "completed" }).success).toBe(false);
  });

  it("rejects goal deadlines before their start date", () => {
    expect(createGoalSchema.safeParse({
      userId,
      title: "Goal",
      startDate: "2026-12-01",
      deadline: "2026-01-01"
    }).success).toBe(false);
  });

  it("rejects progress outside 0–100", () => {
    expect(createGoalSchema.safeParse({ userId, title: "Goal", progress: 101 }).success).toBe(false);
  });
});
