import { describe, expect, it } from "vitest";
import { addDays, dateKeys, periodFor, plannedMinutes, type CalendarItem } from "./calendar";

describe("calendar domain", () => {
  it("builds Casablanca day, week, and month ranges", () => {
    expect(periodFor("2026-08-14", "day").start.toISOString()).toBe("2026-08-13T23:00:00.000Z");
    expect(periodFor("2026-08-14", "week")).toMatchObject({ startDate: "2026-08-10", endDate: "2026-08-17" });
    expect(periodFor("2026-08-14", "month")).toMatchObject({ startDate: "2026-08-01", endDate: "2026-09-01" });
  });
  it("moves through dates without local timezone drift", () => { expect(addDays("2026-12-31", 1)).toBe("2027-01-01"); expect(dateKeys("2026-08-30", "2026-09-02")).toEqual(["2026-08-30", "2026-08-31", "2026-09-01"]); });
  it("counts task and independent block time but excludes events and task-linked duplicate blocks", () => {
    const at = (minute: number) => new Date(Date.UTC(2026, 7, 14, 9, minute));
    const items: CalendarItem[] = [
      { id: "task-1", kind: "task", title: "Task", startAt: at(0), endAt: at(60) },
      { id: "block-1", kind: "block", taskId: "task-1", title: "Duplicate", startAt: at(0), endAt: at(60) },
      { id: "block-2", kind: "block", title: "Independent", startAt: at(0), endAt: at(30) },
      { id: "event-1", kind: "event", title: "Commitment", startAt: at(0), endAt: at(60) }
    ];
    expect(plannedMinutes(items)).toBe(90);
  });
});
