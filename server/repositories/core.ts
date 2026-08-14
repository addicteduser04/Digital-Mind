import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { appUsers, goals, inboxItems, lifeAreas, milestones, projects, tasks } from "@/db/schema";
import {
  createAppUserSchema,
  createGoalSchema,
  createInboxItemSchema,
  createLifeAreaSchema,
  createMilestoneSchema,
  createProjectSchema,
  createTaskSchema,
  type CreateAppUserInput,
  type CreateGoalInput,
  type CreateInboxItemInput,
  type CreateLifeAreaInput,
  type CreateMilestoneInput,
  type CreateProjectInput,
  type CreateTaskInput
} from "@/lib/domain/validation";
import { assertAcyclicParent } from "@/server/domain/hierarchy";

const numeric = (value: number | undefined) => value === undefined ? undefined : String(value);

export async function createAppUser(input: CreateAppUserInput) {
  const value = createAppUserSchema.parse(input);
  const [created] = await getDatabase().insert(appUsers).values(value).returning();
  return created;
}

export async function createLifeArea(input: CreateLifeAreaInput) {
  const value = createLifeAreaSchema.parse(input);
  const [created] = await getDatabase().insert(lifeAreas).values(value).returning();
  return created;
}

export async function createGoal(input: CreateGoalInput) {
  const value = createGoalSchema.parse(input);
  const [created] = await getDatabase().insert(goals).values({
    ...value,
    targetValue: numeric(value.targetValue),
    currentValue: numeric(value.currentValue),
    progress: numeric(value.progress)
  }).returning();
  return created;
}

export async function createProject(input: CreateProjectInput) {
  const value = createProjectSchema.parse(input);
  const [created] = await getDatabase().insert(projects).values({ ...value, progress: numeric(value.progress) }).returning();
  return created;
}

export async function createMilestone(input: CreateMilestoneInput) {
  const value = createMilestoneSchema.parse(input);
  const [created] = await getDatabase().insert(milestones).values(value).returning();
  return created;
}

export async function createTask(input: CreateTaskInput) {
  const value = createTaskSchema.parse(input);
  const [created] = await getDatabase().insert(tasks).values(value).returning();
  return created;
}

export async function createInboxItem(input: CreateInboxItemInput) {
  const value = createInboxItemSchema.parse(input);
  const [created] = await getDatabase().insert(inboxItems).values(value).returning();
  return created;
}

export async function listActiveTasks(userId: string) {
  return getDatabase().select().from(tasks).where(and(
    eq(tasks.userId, userId),
    inArray(tasks.status, ["inbox", "todo", "scheduled", "in_progress"])
  )).orderBy(sql`${tasks.dueDate} asc nulls last`, asc(tasks.position), asc(tasks.createdAt));
}

export async function setGoalParent(userId: string, goalId: string, parentGoalId: string | null) {
  const db = getDatabase();
  await assertAcyclicParent("goal", goalId, parentGoalId, async (id) => {
    const [parent] = await db.select({ parentId: goals.parentGoalId }).from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId))).limit(1);
    if (!parent) throw new Error("Goal parent does not exist for this owner.");
    return parent.parentId;
  });

  const [updated] = await db.update(goals).set({ parentGoalId, updatedAt: new Date() })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId))).returning();
  if (!updated) throw new Error("Goal does not exist for this owner.");
  return updated;
}

export async function setTaskParent(userId: string, taskId: string, parentTaskId: string | null) {
  const db = getDatabase();
  await assertAcyclicParent("task", taskId, parentTaskId, async (id) => {
    const [parent] = await db.select({ parentId: tasks.parentTaskId }).from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId))).limit(1);
    if (!parent) throw new Error("Task parent does not exist for this owner.");
    return parent.parentId;
  });

  const [updated] = await db.update(tasks).set({ parentTaskId, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).returning();
  if (!updated) throw new Error("Task does not exist for this owner.");
  return updated;
}
