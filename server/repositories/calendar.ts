import "server-only";

import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { getDatabase } from "@/db";
import { calendarEvents, goals, lifeAreas, projects, tasks, timeBlocks } from "@/db/schema";
import { createCalendarEventSchema, createTimeBlockSchema, type CreateCalendarEventInput, type CreateTimeBlockInput } from "@/lib/domain/validation";
import { taskStatuses } from "@/lib/domain/constants";

const activeTaskStatuses = taskStatuses.filter((status) => !["completed", "cancelled", "archived"].includes(status));

export async function getCalendarOptions(userId: string) {
  const db = getDatabase();
  const [ownedTasks, ownedProjects, ownedGoals, ownedLifeAreas] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, estimatedMinutes: tasks.estimatedMinutes, scheduledStart: tasks.scheduledStart, scheduledEnd: tasks.scheduledEnd }).from(tasks).where(and(eq(tasks.userId, userId), inArray(tasks.status, activeTaskStatuses))).orderBy(asc(tasks.title)),
    db.select({ id: projects.id, title: projects.title }).from(projects).where(and(eq(projects.userId, userId), ne(projects.status, "archived"))).orderBy(asc(projects.title)),
    db.select({ id: goals.id, title: goals.title }).from(goals).where(and(eq(goals.userId, userId), ne(goals.status, "archived"))).orderBy(asc(goals.title)),
    db.select({ id: lifeAreas.id, name: lifeAreas.name }).from(lifeAreas).where(and(eq(lifeAreas.userId, userId), eq(lifeAreas.status, "active"))).orderBy(asc(lifeAreas.position), asc(lifeAreas.name))
  ]);
  return { tasks: ownedTasks, projects: ownedProjects, goals: ownedGoals, lifeAreas: ownedLifeAreas };
}

export async function listCalendarItems(userId: string, start: Date, end: Date) {
  const db = getDatabase();
  const [events, scheduledTasks, blocks] = await Promise.all([
    db.select().from(calendarEvents).where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.status, "confirmed"), lt(calendarEvents.startAt, end), gt(calendarEvents.endAt, start))).orderBy(asc(calendarEvents.startAt)),
    db.select({ id: tasks.id, title: tasks.title, scheduledStart: tasks.scheduledStart, scheduledEnd: tasks.scheduledEnd, estimatedMinutes: tasks.estimatedMinutes, status: tasks.status, dueDate: tasks.dueDate }).from(tasks).where(and(eq(tasks.userId, userId), inArray(tasks.status, activeTaskStatuses), lt(tasks.scheduledStart, end), gt(tasks.scheduledEnd, start))).orderBy(asc(tasks.scheduledStart)),
    db.select({ block: timeBlocks, taskTitle: tasks.title, projectTitle: projects.title, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(timeBlocks)
      .leftJoin(tasks, eq(timeBlocks.taskId, tasks.id)).leftJoin(projects, eq(timeBlocks.projectId, projects.id)).leftJoin(goals, eq(timeBlocks.goalId, goals.id)).leftJoin(lifeAreas, eq(timeBlocks.lifeAreaId, lifeAreas.id))
      .where(and(eq(timeBlocks.userId, userId), ne(timeBlocks.status, "cancelled"), lt(timeBlocks.startAt, end), gt(timeBlocks.endAt, start))).orderBy(asc(timeBlocks.startAt))
  ]);
  return { events, tasks: scheduledTasks, blocks };
}

export async function getCalendarEvent(userId: string, id: string) {
  return (await getDatabase().select().from(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).limit(1))[0] ?? null;
}

export async function saveCalendarEvent(userId: string, input: Omit<CreateCalendarEventInput, "userId">, id?: string) {
  const value = createCalendarEventSchema.parse({ ...input, userId });
  const values = { ...value, allDay: value.allDay ? 1 : 0, description: value.description ?? null, location: value.location ?? null };
  if (!id) return (await getDatabase().insert(calendarEvents).values(values).returning())[0];
  const [updated] = await getDatabase().update(calendarEvents).set({ ...values, updatedAt: new Date() }).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
  if (!updated) throw new Error("Event not found.");
  return updated;
}

export async function setCalendarEventStatus(userId: string, id: string, status: "confirmed" | "cancelled" | "archived") {
  const [updated] = await getDatabase().update(calendarEvents).set({ status, updatedAt: new Date() }).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
  if (!updated) throw new Error("Event not found.");
  return updated;
}

export async function getTimeBlock(userId: string, id: string) {
  return (await getDatabase().select().from(timeBlocks).where(and(eq(timeBlocks.id, id), eq(timeBlocks.userId, userId))).limit(1))[0] ?? null;
}

export async function saveTimeBlock(userId: string, input: Omit<CreateTimeBlockInput, "userId">, id?: string) {
  const value = createTimeBlockSchema.parse({ ...input, userId });
  const values = { ...value, taskId: value.taskId ?? null, projectId: value.projectId ?? null, goalId: value.goalId ?? null, lifeAreaId: value.lifeAreaId ?? null, description: value.description ?? null };
  if (!id) return (await getDatabase().insert(timeBlocks).values(values).returning())[0];
  const [updated] = await getDatabase().update(timeBlocks).set({ ...values, updatedAt: new Date() }).where(and(eq(timeBlocks.id, id), eq(timeBlocks.userId, userId))).returning();
  if (!updated) throw new Error("Time block not found.");
  return updated;
}

export async function setTimeBlockStatus(userId: string, id: string, status: "planned" | "completed" | "cancelled") {
  const [updated] = await getDatabase().update(timeBlocks).set({ status, updatedAt: new Date() }).where(and(eq(timeBlocks.id, id), eq(timeBlocks.userId, userId))).returning();
  if (!updated) throw new Error("Time block not found.");
  return updated;
}

export async function scheduleTask(userId: string, id: string, startAt?: Date, endAt?: Date) {
  if ((startAt && !endAt) || (!startAt && endAt) || (startAt && endAt && endAt < startAt)) throw new Error("Task schedule is invalid.");
  const [current] = await getDatabase().select({ status: tasks.status }).from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).limit(1);
  if (!current) throw new Error("Task not found.");
  const status = startAt ? (current.status === "todo" || current.status === "inbox" ? "scheduled" : current.status) : current.status === "scheduled" ? "todo" : current.status;
  const [updated] = await getDatabase().update(tasks).set({ scheduledStart: startAt ?? null, scheduledEnd: endAt ?? null, status, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
  return updated;
}
