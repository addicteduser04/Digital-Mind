import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { getDailyMetricSeries, getWeeklyReviewContext, saveDailyReview, saveWeeklyReview } from "@/server/repositories/reviews";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for integration tests.");

const sql = neon(databaseUrl);
const ownerOne = randomUUID();
const ownerTwo = randomUUID();
const run = randomUUID();
let goalId = "";

describe.sequential("Phase 6 reviews integration", () => {
  beforeAll(async () => {
    await sql`insert into app_users (id, email, display_name) values
      (${ownerOne}, ${`phase6-${run}-one@example.invalid`}, 'Phase 6 owner'),
      (${ownerTwo}, ${`phase6-${run}-two@example.invalid`}, 'Phase 6 owner')`;
    const [goal] = await sql`insert into goals (user_id, title, status, progress) values (${ownerOne}, 'Review goal', 'active', 40) returning id`;
    goalId = String(goal!.id);
  });

  afterAll(async () => {
    await sql`delete from weekly_reviews where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from daily_reviews where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from focus_sessions where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from habit_logs where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from habits where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from daily_priorities where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from tasks where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from goal_progress_history where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from goals where user_id in (${ownerOne}, ${ownerTwo})`;
    await sql`delete from app_users where id in (${ownerOne}, ${ownerTwo})`;
  });

  it("creates and edits one canonical daily review and rejects future dates", async () => {
    const first = await saveDailyReview(ownerOne, {
      reviewDate: "2026-08-14",
      rating: 4,
      mainObjectiveStatus: "partial",
      wentWell: "Protected the morning.",
      blocker: "Context switching.",
      tomorrowPriority: "Finish the core task."
    }, "2026-08-14");
    const edited = await saveDailyReview(ownerOne, {
      reviewDate: "2026-08-14",
      rating: 5,
      mainObjectiveStatus: "achieved",
      wentWell: "Finished the core task.",
      blocker: "None significant.",
      tomorrowPriority: "Plan the next milestone."
    }, "2026-08-14");
    expect(edited.id).toBe(first.id);
    expect(edited.rating).toBe(5);
    const rows = await sql`select count(*)::int as count from daily_reviews where user_id=${ownerOne} and review_date='2026-08-14'`;
    expect(rows[0]?.count).toBe(1);
    await expect(saveDailyReview(ownerOne, {
      reviewDate: "2026-08-15",
      rating: 3,
      mainObjectiveStatus: "not_set",
      wentWell: "N/A",
      blocker: "N/A",
      tomorrowPriority: "N/A"
    }, "2026-08-14")).rejects.toThrow("Future daily reviews");
    await expect(sql`insert into daily_reviews (user_id, review_date, rating, main_objective_status, went_well, blocker, tomorrow_priority)
      values (${ownerOne}, '2026-08-13', 6, 'achieved', 'x', 'x', 'x')`).rejects.toBeDefined();
  });

  it("keeps weekly reviews canonical, Monday-based, owner-scoped, and non-future", async () => {
    const first = await saveWeeklyReview(ownerOne, {
      weekStart: "2026-08-10",
      rating: 4,
      summary: "Solid week.",
      whatWorked: "Morning focus.",
      whatDidnt: "Late starts.",
      shouldChange: "Plan evenings.",
      nextWeekFocus: "Finish Phase 6."
    }, "2026-08-10");
    const edited = await saveWeeklyReview(ownerOne, {
      weekStart: "2026-08-10",
      rating: 5,
      summary: "Strong finish.",
      whatWorked: "Morning focus.",
      whatDidnt: "One slow day.",
      shouldChange: "Keep the routine.",
      nextWeekFocus: "Start analytics."
    }, "2026-08-10");
    expect(edited.id).toBe(first.id);
    expect(edited.rating).toBe(5);
    await expect(saveWeeklyReview(ownerOne, {
      weekStart: "2026-08-11",
      rating: 3,
      summary: "Invalid.",
      whatWorked: "x",
      whatDidnt: "x",
      shouldChange: "x",
      nextWeekFocus: "x"
    }, "2026-08-10")).rejects.toThrow("Monday");
    await expect(saveWeeklyReview(ownerOne, {
      weekStart: "2026-08-17",
      rating: 3,
      summary: "Future.",
      whatWorked: "x",
      whatDidnt: "x",
      shouldChange: "x",
      nextWeekFocus: "x"
    }, "2026-08-10")).rejects.toThrow("Future weekly reviews");
    const otherOwner = await sql`select count(*)::int as count from weekly_reviews where user_id=${ownerTwo}`;
    expect(otherOwner[0]?.count).toBe(0);
  });

  it("calculates the agreed execution score from persisted behavior without cross-owner leakage", async () => {
    const taskIds = [randomUUID(), randomUUID(), randomUUID()];
    await sql`insert into tasks (id, user_id, title, status, scheduled_start, scheduled_end, completed_at) values
      (${taskIds[0]}, ${ownerOne}, 'Priority one', 'completed', '2026-08-14T08:00:00Z', '2026-08-14T10:00:00Z', '2026-08-14T10:00:00Z'),
      (${taskIds[1]}, ${ownerOne}, 'Priority two', 'completed', null, null, '2026-08-14T11:00:00Z'),
      (${taskIds[2]}, ${ownerOne}, 'Priority three', 'todo', null, null, null)`;
    await sql`insert into daily_priorities (user_id, priority_date, task_id, position) values
      (${ownerOne}, '2026-08-14', ${taskIds[0]}, 1),
      (${ownerOne}, '2026-08-14', ${taskIds[1]}, 2),
      (${ownerOne}, '2026-08-14', ${taskIds[2]}, 3)`;
    const [habit] = await sql`insert into habits (user_id, name, tracking_type, target_value, frequency_type, status)
      values (${ownerOne}, 'Reading', 'duration', 100, 'daily', 'active') returning id`;
    await sql`insert into habit_logs (user_id, habit_id, log_date, value, completed)
      values (${ownerOne}, ${habit!.id}, '2026-08-14', 80, 0)`;
    await sql`insert into focus_sessions (user_id, started_at, ended_at, duration_minutes, status, source)
      values (${ownerOne}, '2026-08-14T08:00:00Z', '2026-08-14T09:30:00Z', 90, 'completed', 'manual')`;

    const [metric] = await getDailyMetricSeries(ownerOne, "2026-08-14", "2026-08-15");
    expect(metric?.prioritiesCompleted).toBe(2);
    expect(metric?.plannedMinutes).toBe(120);
    expect(metric?.actualMinutes).toBe(90);
    expect(metric?.habitRatio).toBeCloseTo(0.8);
    expect(metric?.score.score).toBe(77);

    const [foreign] = await getDailyMetricSeries(ownerTwo, "2026-08-14", "2026-08-15");
    expect(foreign?.score.score).toBeNull();
    expect(foreign?.actualMinutes).toBe(0);
  });


  it("allocates cross-midnight planned work to the Casablanca-local days it overlaps", async () => {
    const taskId = randomUUID();
    await sql`insert into tasks (id, user_id, title, status, scheduled_start, scheduled_end)
      values (${taskId}, ${ownerOne}, 'Cross-midnight plan', 'scheduled', '2026-08-15T22:30:00Z', '2026-08-15T23:30:00Z')`;
    const series = await getDailyMetricSeries(ownerOne, "2026-08-15", "2026-08-17");
    expect(series[0]?.plannedMinutes).toBe(30);
    expect(series[1]?.plannedMinutes).toBe(30);
  });

  it("keeps an archived habit applicable to historical dates before its archive", async () => {
    const [habit] = await sql`insert into habits (user_id, name, tracking_type, target_value, frequency_type, status, archived_at, created_at)
      values (${ownerOne}, 'Archived study', 'duration', 60, 'daily', 'archived', '2026-08-15T12:00:00Z', '2026-08-01T12:00:00Z') returning id`;
    await sql`insert into habit_logs (user_id, habit_id, log_date, value, completed)
      values (${ownerOne}, ${habit!.id}, '2026-08-14', 60, 1)`;
    const [metric] = await getDailyMetricSeries(ownerOne, "2026-08-14", "2026-08-15");
    expect(metric?.habitApplicable).toBeGreaterThanOrEqual(1);
  });

  it("summarizes weekly goal movement from the latest prior sample to the last in-week sample", async () => {
    await sql`insert into goal_progress_history (user_id, goal_id, progress, recorded_at) values
      (${ownerOne}, ${goalId}, 20, '2026-08-09T12:00:00Z'),
      (${ownerOne}, ${goalId}, 30, '2026-08-11T12:00:00Z'),
      (${ownerOne}, ${goalId}, 40, '2026-08-14T12:00:00Z')`;
    const context = await getWeeklyReviewContext(ownerOne, "2026-08-10");
    expect(context.goalMovement).toHaveLength(1);
    expect(context.goalMovement[0]).toMatchObject({ goalId, fromProgress: 20, toProgress: 40 });
  });
});
