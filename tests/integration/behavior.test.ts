import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { periodFor } from "@/lib/domain/calendar";
import { createOwnedTask } from "@/server/repositories/execution";
import { cancelFocusSession, createManualFocusSession, endFocusSession, getActiveFocusSession, getFocusDashboard, getFocusTotals, getHabitDetail, getPlannedActualComparison, listHabitProgress, logHabit, saveHabit, setHabitArchived, startFocusSession, updateCompletedFocusSession } from "@/server/repositories/behavior";

const databaseUrl = process.env.DATABASE_URL; if (!databaseUrl) throw new Error("DATABASE_URL is required for integration tests."); const sql = neon(databaseUrl); const ownerOne = randomUUID(); const ownerTwo = randomUUID(); const run = randomUUID(); let areaId = ""; let taskId = ""; let projectId = "";
describe.sequential("Phase 5 behavior integration", () => {
  beforeAll(async () => { await sql`insert into app_users (id,email,display_name) values (${ownerOne},${`phase5-${run}-one@example.invalid`},'Phase 5 owner'),(${ownerTwo},${`phase5-${run}-two@example.invalid`},'Phase 5 owner')`; const [area] = await sql`insert into life_areas (user_id,name) values (${ownerOne},'Behavior') returning id`; areaId = String(area!.id); const [project] = await sql`insert into projects (user_id,life_area_id,title,status) values (${ownerOne},${areaId},'Behavior project','active') returning id`; projectId = String(project!.id); taskId = (await createOwnedTask(ownerOne, { title: "Focused task", status: "todo", projectId, lifeAreaId: areaId, actualMinutes: 99 })).id; });
  afterAll(async () => { await sql`delete from focus_sessions where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from habit_logs where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from habits where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from daily_priorities where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from tasks where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from projects where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from life_areas where user_id in (${ownerOne},${ownerTwo})`; await sql`delete from app_users where id in (${ownerOne},${ownerTwo})`; });

  it("creates every habit type, validates targets, updates, archives, and preserves ownership", async () => {
    const boolean = await saveHabit(ownerOne, { name: "Read", trackingType: "boolean", frequencyType: "daily", status: "active", position: 0, lifeAreaId: areaId });
    const quantity = await saveHabit(ownerOne, { name: "Water", trackingType: "quantity", targetValue: 3, unit: "L", frequencyType: "daily", status: "active", position: 1 });
    const duration = await saveHabit(ownerOne, { name: "Study", trackingType: "duration", targetValue: 60, unit: "minutes", frequencyType: "daily", status: "active", position: 2 });
    const frequency = await saveHabit(ownerOne, { name: "Gym", trackingType: "frequency", frequencyType: "weekly", targetFrequency: 4, status: "active", position: 3 });
    expect([boolean.trackingType, quantity.trackingType, duration.trackingType, frequency.trackingType]).toEqual(["boolean", "quantity", "duration", "frequency"]);
    expect((await saveHabit(ownerOne, { name: "Read books", trackingType: "boolean", frequencyType: "daily", status: "active", position: 0 }, boolean.id)).name).toBe("Read books");
    await expect(saveHabit(ownerTwo, { name: "Foreign", trackingType: "boolean", frequencyType: "daily", status: "active", position: 0, lifeAreaId: areaId })).rejects.toBeDefined();
    await expect(saveHabit(ownerOne, { name: "Bad quantity", trackingType: "quantity", frequencyType: "daily", status: "active", position: 4 })).rejects.toBeDefined();
    await setHabitArchived(ownerOne, boolean.id, true); expect((await getHabitDetail(ownerOne, boolean.id, "2026-08-14"))?.habit.status).toBe("archived"); expect(await getHabitDetail(ownerTwo, boolean.id, "2026-08-14")).toBeNull();
  });

  it("logs and corrects boolean, quantity, duration, and weekly occurrence values", async () => {
    const habits = await sql`select id,tracking_type from habits where user_id=${ownerOne}`; const byType = new Map(habits.map((row) => [row.tracking_type, String(row.id)]));
    await logHabit(ownerOne, byType.get("boolean")!, "2026-08-14", 1); await expect(logHabit(ownerOne, byType.get("boolean")!, "2026-08-14", 2)).rejects.toThrow("zero or one");
    await logHabit(ownerOne, byType.get("quantity")!, "2026-08-14", 2.4); await logHabit(ownerOne, byType.get("quantity")!, "2026-08-14", 3);
    await logHabit(ownerOne, byType.get("duration")!, "2026-08-14", 45); await logHabit(ownerOne, byType.get("frequency")!, "2026-08-12", 1); await logHabit(ownerOne, byType.get("frequency")!, "2026-08-14", 2);
    const progress = await listHabitProgress(ownerOne, "2026-08-14"); expect(progress.find((x) => x.habit.trackingType === "quantity")?.value).toBe(3); expect(progress.find((x) => x.habit.trackingType === "frequency")?.value).toBe(3);
    const history = await getHabitDetail(ownerOne, byType.get("quantity")!, "2026-08-14"); expect(history?.logs).toHaveLength(1); expect(Number(history?.logs[0]?.value)).toBe(3);
    await Promise.all([logHabit(ownerOne, byType.get("duration")!, "2026-08-15", 30), logHabit(ownerOne, byType.get("duration")!, "2026-08-15", 35)]); const rapid = await sql`select count(*)::int count from habit_logs where user_id=${ownerOne} and habit_id=${byType.get("duration")!} and log_date='2026-08-15'`; expect(rapid[0]?.count).toBe(1);
  });

  it("enforces one active focus session under concurrent starts and recovers it", async () => {
    const attempts = await Promise.allSettled([startFocusSession(ownerOne, { taskId, projectId, lifeAreaId: areaId, plannedMinutes: 25 }), startFocusSession(ownerOne, { taskId })]); expect(attempts.filter((x) => x.status === "fulfilled")).toHaveLength(1); expect(attempts.filter((x) => x.status === "rejected")).toHaveLength(1); const active = await getActiveFocusSession(ownerOne); expect(active).toMatchObject({ status: "active", taskId }); expect(await getActiveFocusSession(ownerTwo)).toBeNull();
    const ended = await endFocusSession(ownerOne, active!.id); expect(ended.status).toBe("completed"); const repeated = await endFocusSession(ownerOne, active!.id); expect(repeated.status).toBe("completed"); expect((await sql`select status from tasks where id=${taskId}`)[0]?.status).toBe("todo");
  });

  it("cancels safely and rejects cross-owner context", async () => {
    const active = await startFocusSession(ownerOne, {}); expect((await cancelFocusSession(ownerOne, active.id)).status).toBe("cancelled"); await expect(cancelFocusSession(ownerOne, active.id)).rejects.toThrow("not active"); await expect(startFocusSession(ownerTwo, { taskId })).rejects.toBeDefined();
  });

  it("records manual focus, permits context/note correction, and aggregates without task actual minutes", async () => {
    const manual = await createManualFocusSession(ownerOne, { startedAt: "2026-08-14T09:00:00Z", durationMinutes: 40, taskId, projectId, notes: "Forgot timer" }); expect(manual).toMatchObject({ source: "manual", durationMinutes: 40, status: "completed" }); const corrected = await updateCompletedFocusSession(ownerOne, manual.id, { taskId, projectId, notes: "Corrected" }); expect(corrected.notes).toBe("Corrected"); await expect(updateCompletedFocusSession(ownerTwo, manual.id, { notes: "Leak" })).rejects.toThrow("not found");
    const day = periodFor("2026-08-14", "day"); const week = periodFor("2026-08-14", "week"); expect(await getFocusTotals(ownerOne, day.start, day.end, taskId)).toBe(40); expect(await getFocusTotals(ownerOne, week.start, week.end, undefined, projectId)).toBe(40); const dashboard = await getFocusDashboard(ownerOne, day.start, day.end, week.start, week.end); expect(dashboard.summary.todayMinutes).toBe(40); expect(dashboard.summary.weekMinutes).toBeGreaterThanOrEqual(40); expect((await sql`select actual_minutes from tasks where id=${taskId}`)[0]?.actual_minutes).toBe(99);
  });

  it("provides SQL planned-versus-actual foundations for task and project scopes", async () => {
    const week = periodFor("2026-08-14", "week"); const task = await getPlannedActualComparison(ownerOne, week.start, week.end, taskId); const project = await getPlannedActualComparison(ownerOne, week.start, week.end, undefined, projectId); expect(task.actualMinutes).toBeGreaterThanOrEqual(40); expect(project.actualMinutes).toBeGreaterThanOrEqual(40); expect(task.plannedMinutes).toBeGreaterThanOrEqual(0);
  });
});
