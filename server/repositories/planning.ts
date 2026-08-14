import "server-only";

import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { goalProgressHistory, goals, lifeAreas, milestones, projects, tasks } from "@/db/schema";
import {
  createGoalSchema,
  createLifeAreaSchema,
  createMilestoneSchema,
  createProjectSchema,
  type CreateGoalInput,
  type CreateLifeAreaInput,
  type CreateMilestoneInput,
  type CreateProjectInput
} from "@/lib/domain/validation";
import { assertAcyclicParent } from "@/server/domain/hierarchy";

const openTaskStatuses = ["inbox", "todo", "scheduled", "in_progress"];
const numeric = (value: number | undefined) => value === undefined ? undefined : String(value);

export async function listLifeAreas(userId: string, includeArchived = false) {
  const db = getDatabase();
  return db.select({
    id: lifeAreas.id, name: lifeAreas.name, description: lifeAreas.description, icon: lifeAreas.icon,
    position: lifeAreas.position, importance: lifeAreas.importance, satisfaction: lifeAreas.satisfaction, status: lifeAreas.status,
    activeGoals: sql<number>`count(distinct ${goals.id}) filter (where ${goals.status} = 'active')::int`,
    activeProjects: sql<number>`count(distinct ${projects.id}) filter (where ${projects.status} = 'active')::int`
  }).from(lifeAreas)
    .leftJoin(goals, and(eq(goals.lifeAreaId, lifeAreas.id), eq(goals.userId, userId)))
    .leftJoin(projects, and(eq(projects.lifeAreaId, lifeAreas.id), eq(projects.userId, userId)))
    .where(and(eq(lifeAreas.userId, userId), includeArchived ? undefined : eq(lifeAreas.status, "active")))
    .groupBy(lifeAreas.id).orderBy(asc(lifeAreas.position), asc(lifeAreas.name));
}

export async function getLifeAreaDetail(userId: string, id: string) {
  const db = getDatabase();
  const [area] = await db.select().from(lifeAreas).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId))).limit(1);
  if (!area) return null;
  const [areaGoals, areaProjects, areaTasks] = await Promise.all([
    db.select({ id: goals.id, title: goals.title, progress: goals.progress, status: goals.status, deadline: goals.deadline }).from(goals).where(and(eq(goals.userId, userId), eq(goals.lifeAreaId, id), ne(goals.status, "archived"))).orderBy(sql`${goals.deadline} asc nulls last`),
    db.select({ id: projects.id, title: projects.title, progress: projects.progress, status: projects.status, deadline: projects.deadline }).from(projects).where(and(eq(projects.userId, userId), eq(projects.lifeAreaId, id), ne(projects.status, "archived"))).orderBy(sql`${projects.deadline} asc nulls last`),
    db.select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, priority: tasks.priority, commitmentLevel: tasks.commitmentLevel, scheduledStart: tasks.scheduledStart, estimatedMinutes: tasks.estimatedMinutes, projectTitle: projects.title, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(tasks).leftJoin(projects, eq(tasks.projectId, projects.id)).leftJoin(goals, eq(tasks.goalId, goals.id)).leftJoin(lifeAreas, eq(tasks.lifeAreaId, lifeAreas.id)).where(and(eq(tasks.userId, userId), eq(tasks.lifeAreaId, id), inArray(tasks.status, openTaskStatuses))).orderBy(sql`${tasks.dueDate} asc nulls last`).limit(50)
  ]);
  return { area, goals: areaGoals, projects: areaProjects, tasks: areaTasks };
}

export async function saveLifeArea(userId: string, input: Omit<CreateLifeAreaInput, "userId">, id?: string) {
  const value = createLifeAreaSchema.parse({ ...input, userId });
  if (!id) return (await getDatabase().insert(lifeAreas).values(value).returning())[0];
  const [updated] = await getDatabase().update(lifeAreas).set({ ...value, description: value.description ?? null, icon: value.icon ?? null, importance: value.importance ?? null, satisfaction: value.satisfaction ?? null, updatedAt: new Date() }).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId))).returning();
  if (!updated) throw new Error("Life area not found.");
  return updated;
}

export async function archiveLifeArea(userId: string, id: string) {
  const [updated] = await getDatabase().update(lifeAreas).set({ status: "archived", updatedAt: new Date() }).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId))).returning();
  if (!updated) throw new Error("Life area not found.");
  return updated;
}

export async function reorderLifeAreas(userId: string, ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error("Life area order contains duplicates.");
  const db = getDatabase();
  const owned = await db.select({ id: lifeAreas.id }).from(lifeAreas).where(and(eq(lifeAreas.userId, userId), inArray(lifeAreas.id, ids)));
  if (owned.length !== ids.length) throw new Error("Life area order is invalid.");
  if (!ids.length) return;
  const queries = ids.map((id, position) => db.update(lifeAreas).set({ position, updatedAt: new Date() }).where(and(eq(lifeAreas.id, id), eq(lifeAreas.userId, userId))));
  await db.batch([queries[0]!, ...queries.slice(1)]);
}

export type GoalFilter = "active" | "completed" | "paused" | "archived" | "all";
export async function listGoals(userId: string, filter: GoalFilter, lifeAreaId?: string, level?: string) {
  return getDatabase().select({ id: goals.id, title: goals.title, level: goals.level, status: goals.status, progress: goals.progress, deadline: goals.deadline, priority: goals.priority, lifeAreaName: lifeAreas.name, parentGoalId: goals.parentGoalId }).from(goals)
    .leftJoin(lifeAreas, eq(goals.lifeAreaId, lifeAreas.id))
    .where(and(eq(goals.userId, userId), filter === "all" ? undefined : eq(goals.status, filter), lifeAreaId ? eq(goals.lifeAreaId, lifeAreaId) : undefined, level ? eq(goals.level, level) : undefined))
    .orderBy(sql`${goals.deadline} asc nulls last`, desc(goals.updatedAt)).limit(200);
}

export async function getGoalOptions(userId: string, excludeId?: string) {
  const [areas, ownedGoals] = await Promise.all([
    getDatabase().select({ id: lifeAreas.id, name: lifeAreas.name }).from(lifeAreas).where(and(eq(lifeAreas.userId, userId), eq(lifeAreas.status, "active"))).orderBy(asc(lifeAreas.position)),
    getDatabase().select({ id: goals.id, title: goals.title, parentGoalId: goals.parentGoalId, lifeAreaId: goals.lifeAreaId }).from(goals).where(and(eq(goals.userId, userId), ne(goals.status, "archived"), excludeId ? ne(goals.id, excludeId) : undefined)).orderBy(asc(goals.title))
  ]);
  if (!excludeId) return { lifeAreas: areas, goals: ownedGoals };
  const descendants = new Set<string>();
  let frontier = [excludeId];
  while (frontier.length) {
    const next = ownedGoals.filter((goal) => goal.parentGoalId && frontier.includes(goal.parentGoalId)).map((goal) => goal.id);
    next.forEach((id) => descendants.add(id));
    frontier = next;
  }
  return { lifeAreas: areas, goals: ownedGoals.filter((goal) => !descendants.has(goal.id)) };
}

export async function saveGoal(userId: string, input: Omit<CreateGoalInput, "userId">, id?: string) {
  const value = createGoalSchema.parse({ ...input, userId });
  const db = getDatabase();
  if (!id) return (await db.insert(goals).values({ ...value, targetValue: numeric(value.targetValue), currentValue: numeric(value.currentValue), progress: numeric(value.progress) }).returning())[0];
  await assertAcyclicParent("goal", id, value.parentGoalId, async (cursor) => {
    const [row] = await db.select({ parent: goals.parentGoalId }).from(goals).where(and(eq(goals.id, cursor), eq(goals.userId, userId))).limit(1);
    if (!row) throw new Error("Goal parent is unavailable.");
    return row.parent;
  });
  const [updated] = await db.update(goals).set({ ...value, lifeAreaId: value.lifeAreaId ?? null, parentGoalId: value.parentGoalId ?? null, description: value.description ?? null, targetValue: numeric(value.targetValue) ?? null, currentValue: numeric(value.currentValue) ?? null, unit: value.unit ?? null, startDate: value.startDate ?? null, deadline: value.deadline ?? null, progress: numeric(value.progress), completedAt: value.completedAt ?? null, updatedAt: new Date() }).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();
  if (!updated) throw new Error("Goal not found.");
  return updated;
}

export async function getGoalDetail(userId: string, id: string) {
  const db = getDatabase();
  const [goal] = await db.select({ goal: goals, lifeAreaName: lifeAreas.name }).from(goals).leftJoin(lifeAreas, eq(goals.lifeAreaId, lifeAreas.id)).where(and(eq(goals.id, id), eq(goals.userId, userId))).limit(1);
  if (!goal) return null;
  const [parent, children, linkedProjects, linkedTasks, history] = await Promise.all([
    goal.goal.parentGoalId ? db.select({ id: goals.id, title: goals.title }).from(goals).where(and(eq(goals.id, goal.goal.parentGoalId), eq(goals.userId, userId))).limit(1) : Promise.resolve([]),
    db.select({ id: goals.id, title: goals.title, progress: goals.progress, status: goals.status }).from(goals).where(and(eq(goals.parentGoalId, id), eq(goals.userId, userId))).orderBy(asc(goals.deadline)),
    db.select({ id: projects.id, title: projects.title, progress: projects.progress, status: projects.status, deadline: projects.deadline }).from(projects).where(and(eq(projects.goalId, id), eq(projects.userId, userId), ne(projects.status, "archived"))).orderBy(sql`${projects.deadline} asc nulls last`),
    db.select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, priority: tasks.priority, commitmentLevel: tasks.commitmentLevel, scheduledStart: tasks.scheduledStart, estimatedMinutes: tasks.estimatedMinutes, projectTitle: projects.title, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(tasks).leftJoin(projects, eq(tasks.projectId, projects.id)).leftJoin(goals, eq(tasks.goalId, goals.id)).leftJoin(lifeAreas, eq(tasks.lifeAreaId, lifeAreas.id)).where(and(eq(tasks.goalId, id), eq(tasks.userId, userId))).orderBy(sql`${tasks.completedAt} desc nulls first`, sql`${tasks.dueDate} asc nulls last`).limit(100),
    db.select().from(goalProgressHistory).where(and(eq(goalProgressHistory.goalId, id), eq(goalProgressHistory.userId, userId))).orderBy(desc(goalProgressHistory.recordedAt)).limit(50)
  ]);
  return { ...goal, parent: parent[0] ?? null, children, projects: linkedProjects, tasks: linkedTasks, history };
}

export async function updateGoalProgress(userId: string, id: string, progress: number, currentValue?: number) {
  if (progress < 0 || progress > 100 || (currentValue !== undefined && currentValue < 0)) throw new Error("Progress is invalid.");
  const db = getDatabase();
  const [goal] = await db.select({ progress: goals.progress, currentValue: goals.currentValue }).from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))).limit(1);
  if (!goal) throw new Error("Goal not found.");
  if (Number(goal.progress) === progress && (currentValue === undefined || Number(goal.currentValue) === currentValue)) return false;
  await db.batch([
    db.update(goals).set({ progress: String(progress), currentValue: currentValue === undefined ? goal.currentValue : String(currentValue), updatedAt: new Date() }).where(and(eq(goals.id, id), eq(goals.userId, userId))),
    db.insert(goalProgressHistory).values({ userId, goalId: id, progress: String(progress), currentValue: currentValue === undefined ? goal.currentValue : String(currentValue) })
  ]);
  return true;
}

export async function setGoalCompletion(userId: string, id: string, completed: boolean) {
  const [updated] = await getDatabase().update(goals).set({ status: completed ? "completed" : "active", completedAt: completed ? new Date() : null, updatedAt: new Date() }).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();
  if (!updated) throw new Error("Goal not found.");
  return updated;
}

export type ProjectFilter = "active" | "planned" | "paused" | "completed" | "archived" | "all";
export async function listProjects(userId: string, filter: ProjectFilter, goalId?: string, lifeAreaId?: string) {
  return getDatabase().select({ id: projects.id, title: projects.title, status: projects.status, progress: projects.progress, deadline: projects.deadline, priority: projects.priority, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(projects).leftJoin(goals, eq(projects.goalId, goals.id)).leftJoin(lifeAreas, eq(projects.lifeAreaId, lifeAreas.id)).where(and(eq(projects.userId, userId), filter === "all" ? undefined : eq(projects.status, filter), goalId ? eq(projects.goalId, goalId) : undefined, lifeAreaId ? eq(projects.lifeAreaId, lifeAreaId) : undefined)).orderBy(sql`${projects.deadline} asc nulls last`, desc(projects.updatedAt)).limit(200);
}

export async function saveProject(userId: string, input: Omit<CreateProjectInput, "userId">, id?: string) {
  const value = createProjectSchema.parse({ ...input, userId });
  const db = getDatabase();
  if (value.goalId && value.lifeAreaId) {
    const [goal] = await db.select({ lifeAreaId: goals.lifeAreaId }).from(goals).where(and(eq(goals.id, value.goalId), eq(goals.userId, userId))).limit(1);
    if (!goal) throw new Error("Goal is unavailable.");
    if (goal.lifeAreaId && goal.lifeAreaId !== value.lifeAreaId) throw new Error("Project and goal life areas must match.");
  }
  const values = { ...value, goalId: value.goalId ?? null, lifeAreaId: value.lifeAreaId ?? null, description: value.description ?? null, startDate: value.startDate ?? null, deadline: value.deadline ?? null, progress: numeric(value.progress), completedAt: value.completedAt ?? null };
  if (!id) return (await db.insert(projects).values(values).returning())[0];
  const [updated] = await db.update(projects).set({ ...values, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
  if (!updated) throw new Error("Project not found.");
  return updated;
}

export async function getProjectDetail(userId: string, id: string) {
  const db = getDatabase();
  const [project] = await db.select({ project: projects, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(projects).leftJoin(goals, eq(projects.goalId, goals.id)).leftJoin(lifeAreas, eq(projects.lifeAreaId, lifeAreas.id)).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1);
  if (!project) return null;
  const [projectMilestones, projectTasks] = await Promise.all([
    db.select().from(milestones).where(and(eq(milestones.projectId, id), eq(milestones.userId, userId))).orderBy(asc(milestones.position), asc(milestones.createdAt)),
    db.select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, priority: tasks.priority, commitmentLevel: tasks.commitmentLevel, scheduledStart: tasks.scheduledStart, estimatedMinutes: tasks.estimatedMinutes, projectTitle: projects.title, goalTitle: goals.title, lifeAreaName: lifeAreas.name }).from(tasks).leftJoin(projects, eq(tasks.projectId, projects.id)).leftJoin(goals, eq(tasks.goalId, goals.id)).leftJoin(lifeAreas, eq(tasks.lifeAreaId, lifeAreas.id)).where(and(eq(tasks.projectId, id), eq(tasks.userId, userId))).orderBy(sql`${tasks.completedAt} desc nulls first`, sql`${tasks.dueDate} asc nulls last`).limit(100)
  ]);
  return { ...project, milestones: projectMilestones, tasks: projectTasks };
}

export async function setProjectCompletion(userId: string, id: string, completed: boolean) {
  const [updated] = await getDatabase().update(projects).set({ status: completed ? "completed" : "active", completedAt: completed ? new Date() : null, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
  if (!updated) throw new Error("Project not found.");
  return updated;
}

export async function saveMilestone(userId: string, input: Omit<CreateMilestoneInput, "userId">, id?: string) {
  const value = createMilestoneSchema.parse({ ...input, userId });
  const db = getDatabase();
  if (!id) return (await db.insert(milestones).values(value).returning())[0];
  const [updated] = await db.update(milestones).set({ ...value, description: value.description ?? null, deadline: value.deadline ?? null, completedAt: value.completedAt ?? null, updatedAt: new Date() }).where(and(eq(milestones.id, id), eq(milestones.userId, userId))).returning();
  if (!updated) throw new Error("Milestone not found.");
  return updated;
}

export async function setMilestoneCompletion(userId: string, id: string, completed: boolean) {
  const [updated] = await getDatabase().update(milestones).set({ status: completed ? "completed" : "pending", completedAt: completed ? new Date() : null, updatedAt: new Date() }).where(and(eq(milestones.id, id), eq(milestones.userId, userId))).returning();
  if (!updated) throw new Error("Milestone not found.");
  return updated;
}

export async function reorderMilestones(userId: string, projectId: string, ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error("Milestone order contains duplicates.");
  const db = getDatabase();
  const owned = await db.select({ id: milestones.id }).from(milestones).where(and(eq(milestones.userId, userId), eq(milestones.projectId, projectId), inArray(milestones.id, ids)));
  if (owned.length !== ids.length) throw new Error("Milestone order is invalid.");
  if (!ids.length) return;
  const queries = ids.map((id, position) => db.update(milestones).set({ position, updatedAt: new Date() }).where(and(eq(milestones.id, id), eq(milestones.userId, userId), eq(milestones.projectId, projectId))));
  await db.batch([queries[0]!, ...queries.slice(1)]);
}
