import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { CurrentUserConfigurationError } from "@/lib/domain/current-user";
import { requireAppUser } from "@/server/auth/current-user";
import {
  captureInboxItem,
  convertInboxToTask,
  createOwnedTask,
  replaceDailyPriorities,
  setTaskCompletion,
  updateOwnedTask
} from "@/server/repositories/execution";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for integration tests.");
const sql = neon(databaseUrl);
const ownerOne = randomUUID();
const ownerTwo = randomUUID();
const lifeAreaId = randomUUID();
const run = randomUUID();
const createdTaskIds: string[] = [];

describe.sequential("Phase 2 execution integration", () => {
  beforeAll(async () => {
    await sql`insert into app_users (id, email, display_name) values
      (${ownerOne}, ${`phase2-${run}-one@example.invalid`}, 'Phase 2 owner'),
      (${ownerTwo}, ${`phase2-${run}-two@example.invalid`}, 'Phase 2 owner')`;
    await sql`insert into life_areas (id, user_id, name) values (${lifeAreaId}, ${ownerOne}, 'Phase 2 area')`;
  });

  afterAll(async () => {
    await sql`delete from daily_priorities where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from inbox_items where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from tasks where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from life_areas where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from app_users where id in (${ownerOne}, ${ownerTwo})`;
  });

  it("resolves valid users and rejects nonexistent users", async () => {
    await expect(requireAppUser(ownerOne)).resolves.toMatchObject({ id: ownerOne });
    await expect(requireAppUser(randomUUID())).rejects.toBeInstanceOf(CurrentUserConfigurationError);
  });

  it("creates and updates an owned task", async () => {
    const task = await createOwnedTask(ownerOne, { title: "Execution task", status: "todo", priority: "high", commitmentLevel: "must", lifeAreaId });
    createdTaskIds.push(task.id);
    const updated = await updateOwnedTask(ownerOne, task.id, { title: "Updated execution task", status: "in_progress", priority: "high", commitmentLevel: "must", lifeAreaId, dueDate: "2026-08-15" });
    expect(updated).toMatchObject({ title: "Updated execution task", status: "in_progress", dueDate: "2026-08-15" });
    const cleared = await updateOwnedTask(ownerOne, task.id, { title: "Updated execution task", status: "todo", priority: "medium", commitmentLevel: "should" });
    expect(cleared).toMatchObject({ dueDate: null, lifeAreaId: null });
  });

  it("completes and reopens a task with consistent metadata", async () => {
    const completed = await setTaskCompletion(ownerOne, createdTaskIds[0]!, true);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeInstanceOf(Date);
    const reopened = await setTaskCompletion(ownerOne, createdTaskIds[0]!, false);
    expect(reopened.status).toBe("todo");
    expect(reopened.completedAt).toBeNull();
  });

  it("rejects invalid schedules and cross-owner context", async () => {
    await expect(createOwnedTask(ownerOne, { title: "Bad schedule", scheduledStart: "2026-08-15T12:00:00Z", scheduledEnd: "2026-08-15T11:00:00Z" })).rejects.toBeDefined();
    await expect(createOwnedTask(ownerTwo, { title: "Cross owner", lifeAreaId })).rejects.toBeDefined();
  });

  it("enforces daily priority limits, uniqueness, ownership, and history", async () => {
    const extra = await Promise.all([1, 2, 3].map((number) => createOwnedTask(ownerOne, { title: `Priority ${number}`, status: "todo" })));
    createdTaskIds.push(...extra.map(({ id }) => id));
    await replaceDailyPriorities(ownerOne, "2026-08-15", extra.map(({ id }) => id));
    await expect(replaceDailyPriorities(ownerOne, "2026-08-15", [...extra.map(({ id }) => id), createdTaskIds[0]!])).rejects.toBeDefined();
    await expect(replaceDailyPriorities(ownerOne, "2026-08-15", [extra[0]!.id, extra[0]!.id])).rejects.toBeDefined();
    await expect(replaceDailyPriorities(ownerTwo, "2026-08-15", [extra[0]!.id])).rejects.toBeDefined();
    await expect(sql`insert into daily_priorities (user_id, priority_date, task_id, position) values (${ownerOne}, '2026-08-17', ${extra[0]!.id}, 4)`).rejects.toBeDefined();
    await sql`insert into daily_priorities (user_id, priority_date, task_id, position) values (${ownerOne}, '2026-08-18', ${extra[0]!.id}, 1)`;
    await expect(sql`insert into daily_priorities (user_id, priority_date, task_id, position) values (${ownerOne}, '2026-08-18', ${extra[0]!.id}, 2)`).rejects.toBeDefined();
    await replaceDailyPriorities(ownerOne, "2026-08-16", [extra[2]!.id, extra[0]!.id]);
    const history = await sql`select priority_date, position from daily_priorities where user_id = ${ownerOne} order by priority_date, position`;
    expect(history.filter((row) => row.priority_date === "2026-08-15")).toHaveLength(3);
    expect(history.filter((row) => row.priority_date === "2026-08-16").map((row) => row.position)).toEqual([1, 2]);
  });

  it("removes a daily priority without deleting its task", async () => {
    await replaceDailyPriorities(ownerOne, "2026-08-16", []);
    const rows = await sql`select id from tasks where id = ${createdTaskIds[1]}`;
    expect(rows).toHaveLength(1);
  });

  it("captures and transactionally converts an inbox item", async () => {
    const inbox = await captureInboxItem(ownerOne, "Convert this thought");
    const task = await convertInboxToTask(ownerOne, inbox.id);
    createdTaskIds.push(String(task.id));
    const state = await sql`select status, processed_at from inbox_items where id = ${inbox.id}`;
    expect(state[0]?.status).toBe("processed");
    expect(state[0]?.processed_at).toBeTruthy();
  });

  it("rolls back conversion semantics when the inbox item is unavailable", async () => {
    const before = await sql`select count(*)::int as count from tasks where user_id = ${ownerOne}`;
    await expect(convertInboxToTask(ownerOne, randomUUID())).rejects.toBeDefined();
    const after = await sql`select count(*)::int as count from tasks where user_id = ${ownerOne}`;
    expect(after[0]?.count).toBe(before[0]?.count);
  });
});
