import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { createOwnedTask } from "@/server/repositories/execution";
import {
  archiveLifeArea,
  getGoalDetail,
  getLifeAreaDetail,
  getProjectDetail,
  listGoals,
  reorderLifeAreas,
  reorderMilestones,
  saveGoal,
  saveLifeArea,
  saveMilestone,
  saveProject,
  setGoalCompletion,
  setMilestoneCompletion,
  setProjectCompletion,
  updateGoalProgress
} from "@/server/repositories/planning";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for integration tests.");
const sql = neon(databaseUrl);
const ownerOne = randomUUID();
const ownerTwo = randomUUID();
const run = randomUUID();

describe.sequential("Phase 3 planning integration", () => {
  beforeAll(async () => {
    await sql`insert into app_users (id, email, display_name) values
      (${ownerOne}, ${`phase3-${run}-one@example.invalid`}, 'Phase 3 owner'),
      (${ownerTwo}, ${`phase3-${run}-two@example.invalid`}, 'Phase 3 owner')`;
  });

  afterAll(async () => {
    await sql`delete from daily_priorities where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from inbox_items where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from goal_progress_history where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from tasks where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from milestones where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from projects where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`update goals set parent_goal_id = null where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from goals where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from life_areas where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from app_users where id in (${ownerOne}, ${ownerTwo})`;
  });

  it("creates, updates, reorders, archives, and owner-scopes life areas", async () => {
    const health = await saveLifeArea(ownerOne, { name: "Health", position: 0, importance: 8, satisfaction: 6, status: "active" });
    const work = await saveLifeArea(ownerOne, { name: "Work", position: 1, importance: 9, satisfaction: 7, status: "active" });
    const updated = await saveLifeArea(ownerOne, { name: "Wellbeing", position: 0, importance: 10, satisfaction: 5, status: "active" }, health.id);
    expect(updated).toMatchObject({ name: "Wellbeing", importance: 10, satisfaction: 5 });
    await reorderLifeAreas(ownerOne, [work.id, health.id]);
    const positions = await sql`select id, position from life_areas where user_id = ${ownerOne} order by position`;
    expect(positions.map((row) => row.id)).toEqual([work.id, health.id]);
    await archiveLifeArea(ownerOne, work.id);
    await expect(archiveLifeArea(ownerTwo, health.id)).rejects.toThrow("not found");
    await expect(saveLifeArea(ownerOne, { name: "Invalid", importance: 11, status: "active" })).rejects.toBeDefined();
  });

  it("supports goal hierarchy while rejecting cycles and cross-owner parents", async () => {
    const [area] = await sql`select id from life_areas where user_id = ${ownerOne} and status = 'active' limit 1`;
    const parent = await saveGoal(ownerOne, { title: "Annual outcome", lifeAreaId: String(area!.id), level: "yearly", status: "active", progress: 0 });
    const child = await saveGoal(ownerOne, { title: "Quarterly outcome", lifeAreaId: String(area!.id), parentGoalId: parent.id, level: "quarterly", status: "active", progress: 0 });
    await expect(saveGoal(ownerOne, { title: parent.title, lifeAreaId: String(area!.id), parentGoalId: child.id, level: "yearly", status: "active", progress: 0 }, parent.id)).rejects.toThrow("cycle");
    await expect(saveGoal(ownerTwo, { title: "Foreign child", parentGoalId: parent.id, status: "active", progress: 0 })).rejects.toBeDefined();
    const active = await listGoals(ownerOne, "active");
    expect(active.map(({ id }) => id)).toEqual(expect.arrayContaining([parent.id, child.id]));
  });

  it("records changed goal progress and preserves history across completion and archive", async () => {
    const [goal] = await sql`select id from goals where user_id = ${ownerOne} order by created_at limit 1`;
    expect(await updateGoalProgress(ownerOne, String(goal!.id), 35, 7)).toBe(true);
    expect(await updateGoalProgress(ownerOne, String(goal!.id), 35, 7)).toBe(false);
    await setGoalCompletion(ownerOne, String(goal!.id), true);
    await setGoalCompletion(ownerOne, String(goal!.id), false);
    const current = await getGoalDetail(ownerOne, String(goal!.id));
    expect(current?.goal).toMatchObject({ status: "active", completedAt: null });
    expect(current?.history).toHaveLength(1);
    await sql`update goals set status = 'archived' where id = ${goal!.id}`;
    const archived = await getGoalDetail(ownerOne, String(goal!.id));
    expect(archived?.history).toHaveLength(1);
    expect(await getGoalDetail(ownerTwo, String(goal!.id))).toBeNull();
  });

  it("manages project context, completion, milestones, ordering, and ownership", async () => {
    const [area] = await sql`select id from life_areas where user_id = ${ownerOne} and status = 'active' limit 1`;
    const [goal] = await sql`select id from goals where user_id = ${ownerOne} and life_area_id = ${area!.id} limit 1`;
    const project = await saveProject(ownerOne, { title: "Launch", goalId: String(goal!.id), lifeAreaId: String(area!.id), status: "active", progress: 20 });
    const foreignArea = await saveLifeArea(ownerTwo, { name: "Foreign", status: "active" });
    await expect(saveProject(ownerOne, { title: "Conflict", goalId: String(goal!.id), lifeAreaId: foreignArea.id, status: "active", progress: 0 })).rejects.toBeDefined();
    const first = await saveMilestone(ownerOne, { projectId: project.id, title: "First", position: 0, status: "pending" });
    const second = await saveMilestone(ownerOne, { projectId: project.id, title: "Second", position: 1, status: "pending" });
    await reorderMilestones(ownerOne, project.id, [second.id, first.id]);
    expect((await getProjectDetail(ownerOne, project.id))?.milestones.map(({ id }) => id)).toEqual([second.id, first.id]);
    const completeMilestone = await setMilestoneCompletion(ownerOne, first.id, true);
    expect(completeMilestone.completedAt).toBeInstanceOf(Date);
    expect((await setMilestoneCompletion(ownerOne, first.id, false)).completedAt).toBeNull();
    expect((await setProjectCompletion(ownerOne, project.id, true)).completedAt).toBeInstanceOf(Date);
    expect((await setProjectCompletion(ownerOne, project.id, false)).completedAt).toBeNull();
    await expect(reorderMilestones(ownerTwo, project.id, [first.id])).rejects.toBeDefined();
  });

  it("rolls up linked tasks without leaking another owner's data", async () => {
    const [project] = await sql`select id, goal_id, life_area_id from projects where user_id = ${ownerOne} limit 1`;
    const task = await createOwnedTask(ownerOne, { title: "Linked work", projectId: String(project!.id), goalId: String(project!.goal_id), lifeAreaId: String(project!.life_area_id), status: "todo" });
    expect((await getProjectDetail(ownerOne, String(project!.id)))?.tasks.map(({ id }) => id)).toContain(task.id);
    expect(await getProjectDetail(ownerTwo, String(project!.id))).toBeNull();
    expect((await getLifeAreaDetail(ownerOne, String(project!.life_area_id)))?.tasks.map(({ id }) => id)).toContain(task.id);
    expect(await getLifeAreaDetail(ownerTwo, String(project!.life_area_id))).toBeNull();
  });
});
