import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for integration tests.");

const sql = neon(databaseUrl);
const ownerOne = randomUUID();
const ownerTwo = randomUUID();
const lifeAreaId = randomUUID();
const goalId = randomUUID();
const projectId = randomUUID();
const milestoneId = randomUUID();
const taskId = randomUUID();
const inboxId = randomUUID();
const historyId = randomUUID();
const testRun = randomUUID();

describe.sequential("core schema integration", () => {
  beforeAll(async () => {
    await sql`insert into app_users (id, email, display_name) values
      (${ownerOne}, ${`phase1-${testRun}-one@example.invalid`}, 'Phase 1 test owner'),
      (${ownerTwo}, ${`phase1-${testRun}-two@example.invalid`}, 'Phase 1 test owner')`;
  });

  afterAll(async () => {
    await sql`delete from goal_progress_history where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from inbox_items where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from tasks where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from milestones where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from projects where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from goals where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from life_areas where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from app_users where id in (${ownerOne}, ${ownerTwo})`;
  });

  it("stores the complete ownership-safe core relationship chain", async () => {
    await sql`insert into life_areas (id, user_id, name, importance, satisfaction) values (${lifeAreaId}, ${ownerOne}, 'Test area', 8, 7)`;
    await sql`insert into goals (id, user_id, life_area_id, title, status, progress) values (${goalId}, ${ownerOne}, ${lifeAreaId}, 'Test goal', 'active', 25)`;
    await sql`insert into projects (id, user_id, goal_id, life_area_id, title, status) values (${projectId}, ${ownerOne}, ${goalId}, ${lifeAreaId}, 'Test project', 'active')`;
    await sql`insert into milestones (id, user_id, project_id, title) values (${milestoneId}, ${ownerOne}, ${projectId}, 'Test milestone')`;
    await sql`insert into tasks (id, user_id, project_id, goal_id, life_area_id, title, status) values (${taskId}, ${ownerOne}, ${projectId}, ${goalId}, ${lifeAreaId}, 'Test task', 'todo')`;
    await sql`insert into inbox_items (id, user_id, content) values (${inboxId}, ${ownerOne}, 'Test capture')`;
    await sql`insert into goal_progress_history (id, user_id, goal_id, progress) values (${historyId}, ${ownerOne}, ${goalId}, 25)`;

    const rows = await sql`select count(*)::int as count from tasks where id = ${taskId} and user_id = ${ownerOne}`;
    expect(rows[0]?.count).toBe(1);
  });

  it("rejects cross-owner associations", async () => {
    await expect(sql`insert into goals (user_id, life_area_id, title) values (${ownerTwo}, ${lifeAreaId}, 'Invalid cross-owner goal')`).rejects.toBeDefined();
  });

  it("enforces numeric and schedule constraints in PostgreSQL", async () => {
    await expect(sql`insert into tasks (user_id, title, estimated_minutes) values (${ownerOne}, 'Invalid duration', -1)`).rejects.toBeDefined();
    await expect(sql`insert into tasks (user_id, title, scheduled_start, scheduled_end) values (${ownerOne}, 'Invalid schedule', '2026-08-15T12:00:00Z', '2026-08-15T11:00:00Z')`).rejects.toBeDefined();
  });

  it("restricts destructive deletion when historical references exist", async () => {
    await expect(sql`delete from goals where id = ${goalId}`).rejects.toBeDefined();
  });
});
