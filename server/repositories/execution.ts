import "server-only";

import { and, asc, desc, eq, ilike, inArray, lt, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { dailyPriorities, goals, inboxItems, lifeAreas, projects, tasks } from "@/db/schema";
import { createTaskSchema, createInboxItemSchema, type CreateTaskInput } from "@/lib/domain/validation";
import { taskStatuses } from "@/lib/domain/constants";

export type TaskFilter = "active" | "completed" | "overdue";

const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  status: tasks.status,
  priority: tasks.priority,
  commitmentLevel: tasks.commitmentLevel,
  estimatedMinutes: tasks.estimatedMinutes,
  actualMinutes: tasks.actualMinutes,
  dueDate: tasks.dueDate,
  scheduledStart: tasks.scheduledStart,
  scheduledEnd: tasks.scheduledEnd,
  completedAt: tasks.completedAt,
  position: tasks.position,
  projectId: tasks.projectId,
  projectTitle: projects.title,
  goalId: tasks.goalId,
  goalTitle: goals.title,
  lifeAreaId: tasks.lifeAreaId,
  lifeAreaName: lifeAreas.name,
  createdAt: tasks.createdAt
};

const activeStatuses = taskStatuses.filter((status) => !["completed", "cancelled", "archived"].includes(status));

export async function getTaskOptions(userId: string) {
  const db = getDatabase();
  const [ownedProjects, ownedGoals, ownedLifeAreas] = await Promise.all([
    db.select({ id: projects.id, title: projects.title }).from(projects).where(and(eq(projects.userId, userId), ne(projects.status, "archived"))).orderBy(asc(projects.title)),
    db.select({ id: goals.id, title: goals.title }).from(goals).where(and(eq(goals.userId, userId), ne(goals.status, "archived"))).orderBy(asc(goals.title)),
    db.select({ id: lifeAreas.id, name: lifeAreas.name }).from(lifeAreas).where(and(eq(lifeAreas.userId, userId), eq(lifeAreas.status, "active"))).orderBy(asc(lifeAreas.position), asc(lifeAreas.name))
  ]);
  return { projects: ownedProjects, goals: ownedGoals, lifeAreas: ownedLifeAreas };
}

export async function createOwnedTask(userId: string, input: Omit<CreateTaskInput, "userId">) {
  const value = createTaskSchema.parse({ ...input, userId });
  const [created] = await getDatabase().insert(tasks).values(value).returning();
  return created;
}

export async function updateOwnedTask(userId: string, taskId: string, input: Omit<CreateTaskInput, "userId">) {
  const value = createTaskSchema.parse({ ...input, userId });
  const [updated] = await getDatabase().update(tasks).set({
    ...value,
    description: value.description ?? null,
    projectId: value.projectId ?? null,
    goalId: value.goalId ?? null,
    lifeAreaId: value.lifeAreaId ?? null,
    dueDate: value.dueDate ?? null,
    scheduledStart: value.scheduledStart ?? null,
    scheduledEnd: value.scheduledEnd ?? null,
    estimatedMinutes: value.estimatedMinutes ?? null,
    completedAt: value.completedAt ?? null,
    updatedAt: new Date()
  })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).returning();
  if (!updated) throw new Error("Task not found.");
  return updated;
}

export async function getOwnedTask(userId: string, taskId: string) {
  const [task] = await getDatabase().select(taskSelection).from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(goals, eq(tasks.goalId, goals.id))
    .leftJoin(lifeAreas, eq(tasks.lifeAreaId, lifeAreas.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
  return task ?? null;
}

export async function setTaskCompletion(userId: string, taskId: string, completed: boolean) {
  const [updated] = await getDatabase().update(tasks).set({
    status: completed ? "completed" : "todo",
    completedAt: completed ? new Date() : null,
    updatedAt: new Date()
  }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).returning();
  if (!updated) throw new Error("Task not found.");
  return updated;
}

export async function archiveOwnedTask(userId: string, taskId: string) {
  const [updated] = await getDatabase().update(tasks).set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).returning();
  if (!updated) throw new Error("Task not found.");
  return updated;
}

export async function listTasks(userId: string, filter: TaskFilter, today: string, search?: string) {
  const mode = filter === "completed"
    ? eq(tasks.status, "completed")
    : filter === "overdue"
      ? and(inArray(tasks.status, activeStatuses), lt(tasks.dueDate, today))
      : inArray(tasks.status, activeStatuses);
  const where = and(eq(tasks.userId, userId), mode, search ? ilike(tasks.title, `%${search}%`) : undefined);
  return getDatabase().select(taskSelection).from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(goals, eq(tasks.goalId, goals.id))
    .leftJoin(lifeAreas, eq(tasks.lifeAreaId, lifeAreas.id))
    .where(where).orderBy(sql`${tasks.dueDate} asc nulls last`, desc(tasks.createdAt)).limit(200);
}

export async function getTodayExecution(userId: string, today: string) {
  const db = getDatabase();
  const [activeTasks, priorities] = await Promise.all([
    db.select(taskSelection).from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(goals, eq(tasks.goalId, goals.id))
      .leftJoin(lifeAreas, eq(tasks.lifeAreaId, lifeAreas.id))
      .where(and(eq(tasks.userId, userId), inArray(tasks.status, activeStatuses)))
      .orderBy(sql`${tasks.dueDate} asc nulls last`, asc(tasks.position), asc(tasks.createdAt)).limit(200),
    db.select({ id: dailyPriorities.id, taskId: dailyPriorities.taskId, position: dailyPriorities.position })
      .from(dailyPriorities).where(and(eq(dailyPriorities.userId, userId), eq(dailyPriorities.priorityDate, today)))
      .orderBy(asc(dailyPriorities.position))
  ]);
  return { tasks: activeTasks, priorities };
}

export async function replaceDailyPriorities(userId: string, date: string, taskIds: string[]) {
  if (taskIds.length > 3 || new Set(taskIds).size !== taskIds.length) throw new Error("Choose up to three unique priorities.");
  if (taskIds.length) {
    const owned = await getDatabase().select({ id: tasks.id }).from(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds), inArray(tasks.status, activeStatuses)));
    if (owned.length !== taskIds.length) throw new Error("One or more priority tasks are unavailable.");
  }
  const db = getDatabase();
  const remove = db.delete(dailyPriorities).where(and(eq(dailyPriorities.userId, userId), eq(dailyPriorities.priorityDate, date)));
  if (!taskIds.length) return db.batch([remove]);
  const insert = db.insert(dailyPriorities).values(taskIds.map((taskId, index) => ({ userId, priorityDate: date, taskId, position: index + 1 })));
  return db.batch([remove, insert]);
}

export async function captureInboxItem(userId: string, content: string) {
  const value = createInboxItemSchema.parse({ userId, content });
  const [created] = await getDatabase().insert(inboxItems).values(value).returning();
  return created;
}

export async function listInbox(userId: string) {
  return getDatabase().select().from(inboxItems).where(eq(inboxItems.userId, userId))
    .orderBy(sql`case when ${inboxItems.status} = 'unprocessed' then 0 else 1 end`, desc(inboxItems.createdAt)).limit(200);
}

export async function setInboxStatus(userId: string, inboxId: string, status: "processed" | "archived") {
  const [updated] = await getDatabase().update(inboxItems).set({ status, processedAt: status === "processed" ? new Date() : null })
    .where(and(eq(inboxItems.id, inboxId), eq(inboxItems.userId, userId))).returning();
  if (!updated) throw new Error("Inbox item not found.");
  return updated;
}

export async function convertInboxToTask(userId: string, inboxId: string) {
  const db = getDatabase();
  const result = await db.execute(sql`
    with processed as (
      update ${inboxItems}
      set status = 'processed', processed_at = now()
      where id = ${inboxId} and user_id = ${userId} and status = 'unprocessed'
      returning content
    )
    insert into ${tasks} (user_id, title, status)
    select ${userId}, content, 'todo' from processed
    returning id, title
  `);
  const created = result.rows[0];
  if (!created) throw new Error("Inbox item is unavailable.");
  return created;
}
