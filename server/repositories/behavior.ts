import "server-only";

import { and, asc, desc, eq, gt, gte, inArray, lt, ne, notExists, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { focusSessions, goals, habitLogs, habits, lifeAreas, projects, tasks, timeBlocks } from "@/db/schema";
import { createFocusSessionSchema, createHabitSchema, habitLogSchema, type CreateHabitInput } from "@/lib/domain/validation";
import { addDays, periodFor } from "@/lib/domain/calendar";

const numeric = (value: number | undefined) => value === undefined ? undefined : String(value);

export async function getHabitOptions(userId: string) {
  return getDatabase().select({ id: lifeAreas.id, name: lifeAreas.name }).from(lifeAreas).where(and(eq(lifeAreas.userId, userId), eq(lifeAreas.status, "active"))).orderBy(asc(lifeAreas.position), asc(lifeAreas.name));
}

export async function listHabits(userId: string, includeArchived = false) { return getDatabase().select({ habit: habits, lifeAreaName: lifeAreas.name }).from(habits).leftJoin(lifeAreas, eq(habits.lifeAreaId, lifeAreas.id)).where(and(eq(habits.userId, userId), includeArchived ? undefined : eq(habits.status, "active"))).orderBy(asc(habits.position), asc(habits.name)); }

export async function saveHabit(userId: string, input: Omit<CreateHabitInput, "userId">, id?: string) {
  const value = createHabitSchema.parse({ ...input, userId });
  const values = { ...value, lifeAreaId: value.lifeAreaId ?? null, description: value.description ?? null, unit: value.unit ?? null, targetValue: numeric(value.targetValue) ?? null, targetFrequency: value.targetFrequency ?? null, archivedAt: value.status === "archived" ? new Date() : null };
  if (!id) return (await getDatabase().insert(habits).values(values).returning())[0];
  const [updated] = await getDatabase().update(habits).set({ ...values, updatedAt: new Date() }).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();
  if (!updated) throw new Error("Habit not found."); return updated;
}

export async function setHabitArchived(userId: string, id: string, archived: boolean) {
  const [updated] = await getDatabase().update(habits).set({ status: archived ? "archived" : "active", archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(habits.id, id), eq(habits.userId, userId))).returning();
  if (!updated) throw new Error("Habit not found."); return updated;
}

export async function reorderHabits(userId: string, ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error("Habit order contains duplicates."); const db = getDatabase();
  const owned = await db.select({ id: habits.id }).from(habits).where(and(eq(habits.userId, userId), inArray(habits.id, ids))); if (owned.length !== ids.length) throw new Error("Habit order is invalid."); if (!ids.length) return;
  const queries = ids.map((id, position) => db.update(habits).set({ position, updatedAt: new Date() }).where(and(eq(habits.id, id), eq(habits.userId, userId)))); await db.batch([queries[0]!, ...queries.slice(1)]);
}

export async function logHabit(userId: string, habitId: string, logDate: string, value: number, notes?: string) {
  const input = habitLogSchema.parse({ userId, habitId, logDate, value, notes }); const [habit] = await getDatabase().select().from(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId))).limit(1); if (!habit) throw new Error("Habit not found.");
  if (habit.trackingType === "boolean" && ![0, 1].includes(input.value)) throw new Error("Boolean habit values must be zero or one.");
  const target = habit.trackingType === "frequency" ? Number(habit.targetFrequency) : Number(habit.targetValue ?? 1); const completed = habit.trackingType === "frequency" && habit.frequencyType === "weekly" ? 0 : input.value >= target ? 1 : 0;
  return (await getDatabase().insert(habitLogs).values({ ...input, value: String(input.value), completed, notes: input.notes ?? null }).onConflictDoUpdate({ target: [habitLogs.userId, habitLogs.habitId, habitLogs.logDate], set: { value: String(input.value), completed, notes: input.notes ?? null, updatedAt: new Date() } }).returning())[0];
}

export async function listHabitProgress(userId: string, date: string) {
  const week = periodFor(date, "week"); const db = getDatabase();
  const [active, logs] = await Promise.all([
    db.select({ habit: habits, lifeAreaName: lifeAreas.name }).from(habits).leftJoin(lifeAreas, eq(habits.lifeAreaId, lifeAreas.id)).where(and(eq(habits.userId, userId), eq(habits.status, "active"))).orderBy(asc(habits.position), asc(habits.name)),
    db.select().from(habitLogs).where(and(eq(habitLogs.userId, userId), gte(habitLogs.logDate, week.startDate), lt(habitLogs.logDate, week.endDate))).orderBy(desc(habitLogs.logDate))
  ]);
  return active.map((item) => { const relevant = logs.filter((log) => log.habitId === item.habit.id); const today = relevant.find((log) => log.logDate === date); const value = item.habit.trackingType === "frequency" && item.habit.frequencyType === "weekly" ? relevant.reduce((sum, log) => sum + Number(log.value), 0) : Number(today?.value ?? 0); return { ...item, today: today ?? null, value }; });
}

export async function getHabitDetail(userId: string, id: string, date: string) {
  const [habit] = await getDatabase().select({ habit: habits, lifeAreaName: lifeAreas.name }).from(habits).leftJoin(lifeAreas, eq(habits.lifeAreaId, lifeAreas.id)).where(and(eq(habits.id, id), eq(habits.userId, userId))).limit(1); if (!habit) return null;
  const logs = await getDatabase().select().from(habitLogs).where(and(eq(habitLogs.userId, userId), eq(habitLogs.habitId, id), gte(habitLogs.logDate, addDays(date, -60)))).orderBy(desc(habitLogs.logDate)).limit(60); return { ...habit, logs };
}

export async function getFocusOptions(userId: string) {
  const db = getDatabase(); const [ownedTasks, ownedProjects, ownedGoals, ownedLifeAreas] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and(eq(tasks.userId, userId), ne(tasks.status, "archived"))).orderBy(asc(tasks.title)),
    db.select({ id: projects.id, title: projects.title }).from(projects).where(and(eq(projects.userId, userId), ne(projects.status, "archived"))).orderBy(asc(projects.title)),
    db.select({ id: goals.id, title: goals.title }).from(goals).where(and(eq(goals.userId, userId), ne(goals.status, "archived"))).orderBy(asc(goals.title)),
    db.select({ id: lifeAreas.id, title: lifeAreas.name }).from(lifeAreas).where(and(eq(lifeAreas.userId, userId), eq(lifeAreas.status, "active"))).orderBy(asc(lifeAreas.position))
  ]); return { tasks: ownedTasks, projects: ownedProjects, goals: ownedGoals, lifeAreas: ownedLifeAreas };
}

type FocusContext = { taskId?: string; projectId?: string; goalId?: string; lifeAreaId?: string; plannedMinutes?: number; notes?: string };
export async function startFocusSession(userId: string, context: FocusContext) {
  const value = createFocusSessionSchema.parse({ ...context, userId, startedAt: new Date().toISOString(), status: "active", source: "timer" });
  try { return (await getDatabase().insert(focusSessions).values(value).returning())[0]; } catch (error) { if (error instanceof Error && /focus_sessions_one_active_user_unique|duplicate key/.test(error.message)) throw new Error("A focus session is already active."); throw error; }
}

export async function getActiveFocusSession(userId: string) {
  return (await getDatabase().select().from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "active"))).limit(1))[0] ?? null;
}

export async function getFocusSession(userId: string, id: string) { return (await getDatabase().select().from(focusSessions).where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId))).limit(1))[0] ?? null; }

export async function endFocusSession(userId: string, id: string) {
  const db = getDatabase(); const result = await db.execute(sql`update ${focusSessions} set status = 'completed', ended_at = now(), duration_minutes = greatest(0, floor(extract(epoch from (now() - started_at)) / 60)::int), updated_at = now() where id = ${id} and user_id = ${userId} and status = 'active' returning *`); if (result.rows[0]) return result.rows[0];
  const [existing] = await db.select().from(focusSessions).where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId))).limit(1); if (existing?.status === "completed") return existing; throw new Error(existing ? "Focus session is not active." : "Focus session not found.");
}

export async function cancelFocusSession(userId: string, id: string) {
  const result = await getDatabase().execute(sql`update ${focusSessions} set status = 'cancelled', ended_at = now(), duration_minutes = greatest(0, floor(extract(epoch from (now() - started_at)) / 60)::int), updated_at = now() where id = ${id} and user_id = ${userId} and status = 'active' returning *`); if (!result.rows[0]) throw new Error("Focus session is not active."); return result.rows[0];
}

export async function createManualFocusSession(userId: string, context: FocusContext & { startedAt: string; durationMinutes: number }) {
  if (!Number.isInteger(context.durationMinutes) || context.durationMinutes <= 0) throw new Error("Manual duration must be positive."); const start = new Date(context.startedAt); const end = new Date(start.getTime() + context.durationMinutes * 60_000);
  const value = createFocusSessionSchema.parse({ ...context, userId, startedAt: start.toISOString(), endedAt: end.toISOString(), durationMinutes: context.durationMinutes, status: "completed", source: "manual" }); return (await getDatabase().insert(focusSessions).values(value).returning())[0];
}

export async function updateCompletedFocusSession(userId: string, id: string, context: FocusContext) {
  const [updated] = await getDatabase().update(focusSessions).set({ taskId: context.taskId ?? null, projectId: context.projectId ?? null, goalId: context.goalId ?? null, lifeAreaId: context.lifeAreaId ?? null, notes: context.notes ?? null, updatedAt: new Date() }).where(and(eq(focusSessions.id, id), eq(focusSessions.userId, userId), eq(focusSessions.status, "completed"))).returning(); if (!updated) throw new Error("Completed session not found."); return updated;
}

export async function getFocusDashboard(userId: string, dayStart: Date, dayEnd: Date, weekStart: Date, weekEnd: Date) {
  const db = getDatabase(); const [active, recent, summary] = await Promise.all([
    getActiveFocusSession(userId),
    db.select({ session: focusSessions, taskTitle: tasks.title, projectTitle: projects.title, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(focusSessions).leftJoin(tasks, eq(focusSessions.taskId, tasks.id)).leftJoin(projects, eq(focusSessions.projectId, projects.id)).leftJoin(goals, eq(focusSessions.goalId, goals.id)).leftJoin(lifeAreas, eq(focusSessions.lifeAreaId, lifeAreas.id)).where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed"), gte(focusSessions.startedAt, weekStart), lt(focusSessions.startedAt, weekEnd))).orderBy(desc(focusSessions.startedAt)).limit(30),
    db.select({ todayMinutes: sql<number>`coalesce(sum(${focusSessions.durationMinutes}) filter (where ${focusSessions.startedAt} >= ${dayStart} and ${focusSessions.startedAt} < ${dayEnd}), 0)::int`, weekMinutes: sql<number>`coalesce(sum(${focusSessions.durationMinutes}) filter (where ${focusSessions.startedAt} >= ${weekStart} and ${focusSessions.startedAt} < ${weekEnd}), 0)::int` }).from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed"), gte(focusSessions.startedAt, weekStart), lt(focusSessions.startedAt, weekEnd)))
  ]); return { active, recent, summary: summary[0] ?? { todayMinutes: 0, weekMinutes: 0 } };
}

export async function getFocusTotals(userId: string, start: Date, end: Date, taskId?: string, projectId?: string) {
  const [row] = await getDatabase().select({ minutes: sql<number>`coalesce(sum(${focusSessions.durationMinutes}), 0)::int` }).from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed"), gte(focusSessions.startedAt, start), lt(focusSessions.startedAt, end), taskId ? eq(focusSessions.taskId, taskId) : undefined, projectId ? eq(focusSessions.projectId, projectId) : undefined)); return row?.minutes ?? 0;
}

export async function getPlannedActualComparison(userId: string, start: Date, end: Date, taskId?: string, projectId?: string) {
  const db = getDatabase(); const [scheduled, blocks, actualMinutes] = await Promise.all([
    db.select({ minutes: sql<number>`coalesce(sum(extract(epoch from (${tasks.scheduledEnd} - ${tasks.scheduledStart})) / 60), 0)::int` }).from(tasks).where(and(eq(tasks.userId, userId), lt(tasks.scheduledStart, end), gt(tasks.scheduledEnd, start), taskId ? eq(tasks.id, taskId) : undefined, projectId ? eq(tasks.projectId, projectId) : undefined)),
    db.select({ minutes: sql<number>`coalesce(sum(extract(epoch from (${timeBlocks.endAt} - ${timeBlocks.startAt})) / 60), 0)::int` }).from(timeBlocks).where(and(eq(timeBlocks.userId, userId), ne(timeBlocks.status, "cancelled"), lt(timeBlocks.startAt, end), gt(timeBlocks.endAt, start), taskId ? eq(timeBlocks.taskId, taskId) : undefined, projectId ? eq(timeBlocks.projectId, projectId) : undefined, notExists(db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.id, timeBlocks.taskId), lt(tasks.scheduledStart, end), gt(tasks.scheduledEnd, start)))))),
    getFocusTotals(userId, start, end, taskId, projectId)
  ]); return { plannedMinutes: (scheduled[0]?.minutes ?? 0) + (blocks[0]?.minutes ?? 0), actualMinutes };
}
