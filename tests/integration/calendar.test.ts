import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { createOwnedTask, getOwnedTask } from "@/server/repositories/execution";
import { getCalendarEvent, getTimeBlock, listCalendarItems, saveCalendarEvent, saveTimeBlock, scheduleTask, setCalendarEventStatus, setTimeBlockStatus } from "@/server/repositories/calendar";
import { periodFor } from "@/lib/domain/calendar";

const databaseUrl = process.env.DATABASE_URL; if (!databaseUrl) throw new Error("DATABASE_URL is required for integration tests.");
const sql = neon(databaseUrl); const ownerOne = randomUUID(); const ownerTwo = randomUUID(); const run = randomUUID(); let taskId = ""; let foreignTaskId = ""; let areaId = "";

describe.sequential("Phase 4 calendar integration", () => {
  beforeAll(async () => {
    await sql`insert into app_users (id, email, display_name) values (${ownerOne}, ${`phase4-${run}-one@example.invalid`}, 'Phase 4 owner'), (${ownerTwo}, ${`phase4-${run}-two@example.invalid`}, 'Phase 4 owner')`;
    const [area] = await sql`insert into life_areas (user_id, name) values (${ownerOne}, 'Calendar area') returning id`; areaId = String(area!.id);
    taskId = (await createOwnedTask(ownerOne, { title: "Calendar task", status: "todo", estimatedMinutes: 45, dueDate: "2026-08-20", lifeAreaId: areaId })).id;
    foreignTaskId = (await createOwnedTask(ownerTwo, { title: "Foreign task", status: "todo" })).id;
  });
  afterAll(async () => {
    await sql`delete from time_blocks where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from calendar_events where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from daily_priorities where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from tasks where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from life_areas where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from app_users where id in (${ownerOne}, ${ownerTwo})`;
  });

  it("creates, updates, cancels, and owner-scopes timed and all-day events", async () => {
    const event = await saveCalendarEvent(ownerOne, { title: "Appointment", startAt: "2026-08-14T09:00:00Z", endAt: "2026-08-14T10:00:00Z", allDay: false, status: "confirmed" });
    const updated = await saveCalendarEvent(ownerOne, { title: "Updated appointment", startAt: "2026-08-14T10:00:00Z", endAt: "2026-08-14T11:00:00Z", allDay: false, status: "confirmed" }, event.id);
    expect(updated.title).toBe("Updated appointment"); expect(await getCalendarEvent(ownerTwo, event.id)).toBeNull();
    expect((await setCalendarEventStatus(ownerOne, event.id, "cancelled")).status).toBe("cancelled");
    const allDay = await saveCalendarEvent(ownerOne, { title: "All day", startAt: "2026-08-13T23:00:00Z", endAt: "2026-08-14T23:00:00Z", allDay: true, status: "confirmed" });
    expect(allDay.allDay).toBe(1);
    await expect(saveCalendarEvent(ownerOne, { title: "Invalid", startAt: "2026-08-14T11:00:00Z", endAt: "2026-08-14T10:00:00Z", allDay: false })).rejects.toBeDefined();
    await expect(setCalendarEventStatus(ownerTwo, allDay.id, "cancelled")).rejects.toThrow("not found");
  });

  it("creates and updates context-optional time blocks with same-owner enforcement", async () => {
    const block = await saveTimeBlock(ownerOne, { title: "Deep work", startAt: "2026-08-14T11:00:00Z", endAt: "2026-08-14T12:30:00Z", taskId, lifeAreaId: areaId, status: "planned" });
    expect((await saveTimeBlock(ownerOne, { title: "Deep work moved", startAt: "2026-08-14T12:00:00Z", endAt: "2026-08-14T13:00:00Z", status: "planned" }, block.id)).taskId).toBeNull();
    expect((await setTimeBlockStatus(ownerOne, block.id, "completed")).status).toBe("completed");
    expect((await setTimeBlockStatus(ownerOne, block.id, "cancelled")).status).toBe("cancelled");
    expect(await getTimeBlock(ownerTwo, block.id)).toBeNull();
    await expect(saveTimeBlock(ownerOne, { title: "Foreign context", startAt: "2026-08-14T12:00:00Z", endAt: "2026-08-14T13:00:00Z", taskId: foreignTaskId })).rejects.toBeDefined();
    await expect(saveTimeBlock(ownerOne, { title: "Invalid", startAt: "2026-08-14T13:00:00Z", endAt: "2026-08-14T12:00:00Z" })).rejects.toBeDefined();
  });

  it("schedules, reschedules, and unschedules without changing estimates or due dates", async () => {
    await scheduleTask(ownerOne, taskId, new Date("2026-08-14T14:00:00Z"), new Date("2026-08-14T14:30:00Z"));
    await scheduleTask(ownerOne, taskId, new Date("2026-08-15T08:00:00Z"), new Date("2026-08-15T09:00:00Z"));
    let task = await getOwnedTask(ownerOne, taskId); expect(task).toMatchObject({ estimatedMinutes: 45, dueDate: "2026-08-20", actualMinutes: null, status: "scheduled" });
    await scheduleTask(ownerOne, taskId); task = await getOwnedTask(ownerOne, taskId); expect(task).toMatchObject({ scheduledStart: null, scheduledEnd: null, estimatedMinutes: 45, dueDate: "2026-08-20", status: "todo" });
    await expect(scheduleTask(ownerTwo, taskId, new Date("2026-08-14T14:00:00Z"), new Date("2026-08-14T15:00:00Z"))).rejects.toThrow("not found");
  });

  it("queries overlapping day/week ranges, midnight spans, and excludes other owners", async () => {
    await saveCalendarEvent(ownerOne, { title: "Cross midnight", startAt: "2026-08-14T22:30:00Z", endAt: "2026-08-15T01:00:00Z", allDay: false });
    await saveCalendarEvent(ownerTwo, { title: "Never leak", startAt: "2026-08-14T09:00:00Z", endAt: "2026-08-14T10:00:00Z", allDay: false });
    await scheduleTask(ownerOne, taskId, new Date("2026-08-14T08:00:00Z"), new Date("2026-08-14T09:00:00Z"));
    await saveTimeBlock(ownerOne, { title: "Boundary block", startAt: "2026-08-13T23:00:00Z", endAt: "2026-08-14T00:00:00Z" });
    const day = periodFor("2026-08-15", "day"); const result = await listCalendarItems(ownerOne, day.start, day.end);
    expect(result.events.map(({ title }) => title)).toContain("Cross midnight"); expect(result.events.map(({ title }) => title)).not.toContain("Never leak");
    const week = periodFor("2026-08-14", "week"); const weekly = await listCalendarItems(ownerOne, week.start, week.end); expect(weekly.tasks.map(({ id }) => id)).toContain(taskId); expect(weekly.blocks.map(({ block }) => block.title)).toContain("Boundary block");
  });
});
