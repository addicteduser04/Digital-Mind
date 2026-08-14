import { describe, expect, it } from "vitest";
import { dateKeyInTimeZone, groupTodayTasks } from "./today";

const task = (id: string, dueDate: string | null, scheduledStart: Date | null) => ({ id, dueDate, scheduledStart });

describe("Today grouping", () => {
  it("uses Casablanca local dates around UTC boundaries", () => {
    expect(dateKeyInTimeZone(new Date("2026-08-14T23:30:00Z"), "Africa/Casablanca")).toBe("2026-08-15");
  });

  it("groups each task exactly once using overdue → scheduled → due → other precedence", () => {
    const groups = groupTodayTasks([
      task("overdue", "2026-08-13", new Date("2026-08-14T09:00:00Z")),
      task("scheduled", "2026-08-14", new Date("2026-08-14T09:00:00Z")),
      task("due", "2026-08-14", null),
      task("other", null, null)
    ], "2026-08-14", "UTC");
    expect(groups.overdue.map(({ id }) => id)).toEqual(["overdue"]);
    expect(groups.scheduled.map(({ id }) => id)).toEqual(["scheduled"]);
    expect(groups.due.map(({ id }) => id)).toEqual(["due"]);
    expect(groups.other.map(({ id }) => id)).toEqual(["other"]);
    expect(Object.values(groups).flat()).toHaveLength(4);
  });
});
