import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { calendarEvents, dailyPriorities, dailyReviews, focusSessions, goalProgressHistory, goals, habitLogs, habits, milestones, projects, tasks, timeBlocks, weeklyReviews } from "@/db/schema";
import { dailyReviewSchema, weeklyReviewSchema } from "@/lib/domain/validation";
import { addDays, dateKeys, durationMinutes, itemDateKey, periodFor } from "@/lib/domain/calendar";
import { averageEvaluable, calculateExecutionScore } from "@/lib/domain/execution-score";
import { taskStatuses } from "@/lib/domain/constants";

type DailyReviewInput = Omit<Parameters<typeof dailyReviewSchema.parse>[0], "userId">;
type WeeklyReviewInput = Omit<Parameters<typeof weeklyReviewSchema.parse>[0], "userId">;
const activeTaskStatuses = taskStatuses.filter((status) => !["completed", "cancelled", "archived"].includes(status));

export async function saveDailyReview(userId: string, input: DailyReviewInput, today: string) {
  const value = dailyReviewSchema.parse({ ...input, userId }); if (value.reviewDate > today) throw new Error("Future daily reviews are not allowed.");
  return (await getDatabase().insert(dailyReviews).values(value).onConflictDoUpdate({ target: [dailyReviews.userId, dailyReviews.reviewDate], set: { rating: value.rating, mainObjectiveStatus: value.mainObjectiveStatus, wentWell: value.wentWell, blocker: value.blocker, tomorrowPriority: value.tomorrowPriority, notes: value.notes ?? null, updatedAt: new Date() } }).returning())[0];
}

export async function saveWeeklyReview(userId: string, input: WeeklyReviewInput, currentWeekStart: string) {
  const value = weeklyReviewSchema.parse({ ...input, userId });
  if (periodFor(value.weekStart, "week").startDate !== value.weekStart) throw new Error("Weekly reviews must start on Monday.");
  if (value.weekStart > currentWeekStart) throw new Error("Future weekly reviews are not allowed.");
  return (await getDatabase().insert(weeklyReviews).values(value).onConflictDoUpdate({ target: [weeklyReviews.userId, weeklyReviews.weekStart], set: { rating: value.rating, summary: value.summary, whatWorked: value.whatWorked, whatDidnt: value.whatDidnt, shouldChange: value.shouldChange, nextWeekFocus: value.nextWeekFocus, notes: value.notes ?? null, updatedAt: new Date() } }).returning())[0];
}

export async function getDailyReview(userId: string, date: string) { return (await getDatabase().select().from(dailyReviews).where(and(eq(dailyReviews.userId, userId), eq(dailyReviews.reviewDate, date))).limit(1))[0] ?? null; }
export async function getWeeklyReview(userId: string, weekStart: string) { return (await getDatabase().select().from(weeklyReviews).where(and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStart, weekStart))).limit(1))[0] ?? null; }
export async function listReviewHistory(userId: string) { const [daily, weekly] = await Promise.all([getDatabase().select().from(dailyReviews).where(eq(dailyReviews.userId, userId)).orderBy(desc(dailyReviews.reviewDate)).limit(30), getDatabase().select().from(weeklyReviews).where(eq(weeklyReviews.userId, userId)).orderBy(desc(weeklyReviews.weekStart)).limit(20)]); return { daily, weekly }; }

export type DailyMetric = { date: string; prioritiesSet: number; prioritiesCompleted: number; tasksCompleted: number; overdueTasks: number; plannedMinutes: number; actualMinutes: number; habitApplicable: number; habitRatio?: number; reviewCompleted: boolean; rating: number | null; eventCount: number; timeBlockCount: number; score: ReturnType<typeof calculateExecutionScore> };
export async function getDailyMetricSeries(userId: string, startDate: string, endDate: string, timeZone = "Africa/Casablanca") {
  const range = { start: periodFor(startDate, "day", timeZone).start, end: periodFor(endDate, "day", timeZone).start }; const db = getDatabase();
  const [priorityRows, completedRows, taskRows, blockRows, focusRows, activeHabits, logs, reviews, eventRows] = await Promise.all([
    db.select({ date: dailyPriorities.priorityDate, status: tasks.status }).from(dailyPriorities).innerJoin(tasks, and(eq(dailyPriorities.taskId, tasks.id), eq(dailyPriorities.userId, tasks.userId))).where(and(eq(dailyPriorities.userId, userId), gte(dailyPriorities.priorityDate, startDate), lt(dailyPriorities.priorityDate, endDate))),
    db.select({ date: sql<string>`to_char(${tasks.completedAt} at time zone ${timeZone}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "completed"), gte(tasks.completedAt, range.start), lt(tasks.completedAt, range.end))).groupBy(sql`1`),
    db.select({ id: tasks.id, projectId: tasks.projectId, start: tasks.scheduledStart, end: tasks.scheduledEnd }).from(tasks).where(and(eq(tasks.userId, userId), lt(tasks.scheduledStart, range.end), gte(tasks.scheduledEnd, range.start))),
    db.select({ id: timeBlocks.id, taskId: timeBlocks.taskId, start: timeBlocks.startAt, end: timeBlocks.endAt }).from(timeBlocks).where(and(eq(timeBlocks.userId, userId), ne(timeBlocks.status, "cancelled"), lt(timeBlocks.startAt, range.end), gte(timeBlocks.endAt, range.start))),
    db.select({ start: focusSessions.startedAt, end: focusSessions.endedAt, minutes: focusSessions.durationMinutes }).from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, "completed"), lt(focusSessions.startedAt, range.end), gte(focusSessions.endedAt, range.start))),
    db.select().from(habits).where(and(eq(habits.userId, userId), ne(habits.frequencyType, "weekly"), lt(habits.createdAt, range.end), or(eq(habits.status, "active"), gte(habits.archivedAt, range.start)))),
    db.select().from(habitLogs).where(and(eq(habitLogs.userId, userId), gte(habitLogs.logDate, startDate), lt(habitLogs.logDate, endDate))),
    db.select().from(dailyReviews).where(and(eq(dailyReviews.userId, userId), gte(dailyReviews.reviewDate, startDate), lt(dailyReviews.reviewDate, endDate))),
    db.select({ start: calendarEvents.startAt, end: calendarEvents.endAt }).from(calendarEvents).where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.status, "confirmed"), lt(calendarEvents.startAt, range.end), gte(calendarEvents.endAt, range.start)))
  ]);
  return dateKeys(startDate, endDate).map((date): DailyMetric => {
    const day = periodFor(date, "day", timeZone);
    const overlaps = (start: Date, end: Date) => start < day.end && end > day.start;
    const overlapMinutes = (start: Date, end: Date) => durationMinutes(start > day.start ? start : day.start, end < day.end ? end : day.end);
    const priorities = priorityRows.filter((row) => row.date === date);
    const review = reviews.find((row) => row.reviewDate === date);
    const applicableHabits = activeHabits.filter((habit) => {
      const createdDate = itemDateKey(habit.createdAt, timeZone);
      const archivedDate = habit.archivedAt ? itemDateKey(habit.archivedAt, timeZone) : null;
      return createdDate <= date && (!archivedDate || archivedDate >= date);
    });
    const habitRatios = applicableHabits.map((habit) => {
      const log = logs.find((row) => row.habitId === habit.id && row.logDate === date);
      const target = habit.trackingType === "frequency" ? habit.targetFrequency ?? 1 : Number(habit.targetValue ?? 1);
      return Math.min(1, Number(log?.value ?? 0) / target);
    });
    const scheduledForDay = taskRows.filter((row) => row.start && row.end && overlaps(row.start, row.end));
    const scheduledIds = new Set(scheduledForDay.map((row) => row.id));
    const scheduled = scheduledForDay.reduce((sum, row) => sum + overlapMinutes(row.start!, row.end!), 0);
    const blocksForDay = blockRows.filter((row) => overlaps(row.start, row.end));
    const blocks = blocksForDay.filter((row) => !(row.taskId && scheduledIds.has(row.taskId))).reduce((sum, row) => sum + overlapMinutes(row.start, row.end), 0);
    const planned = scheduled + blocks;
    const actual = focusRows.filter((row) => row.end && overlaps(row.start, row.end)).reduce((sum, row) => {
      if (!row.end) return sum;
      const startsAndEndsSameDay = itemDateKey(row.start, timeZone) === itemDateKey(row.end, timeZone);
      return sum + (startsAndEndsSameDay ? row.minutes ?? 0 : overlapMinutes(row.start, row.end));
    }, 0);
    const habitRatio = habitRatios.length ? habitRatios.reduce((sum, ratio) => sum + ratio, 0) / habitRatios.length : undefined;
    const hasBehavior = priorities.length > 0 || planned > 0 || habitRatio !== undefined || Boolean(review);
    const score = calculateExecutionScore({
      priorityRatio: priorities.length ? priorities.filter((row) => row.status === "completed").length / priorities.length : undefined,
      plannedExecutionRatio: planned ? actual / planned : undefined,
      habitRatio,
      reviewCompleted: hasBehavior ? Boolean(review) : undefined
    });
    return {
      date,
      prioritiesSet: priorities.length,
      prioritiesCompleted: priorities.filter((row) => row.status === "completed").length,
      tasksCompleted: completedRows.find((row) => row.date === date)?.count ?? 0,
      overdueTasks: 0,
      plannedMinutes: planned,
      actualMinutes: actual,
      habitApplicable: habitRatios.length,
      habitRatio,
      reviewCompleted: Boolean(review),
      rating: review?.rating ?? null,
      eventCount: eventRows.filter((row) => overlaps(row.start, row.end)).length,
      timeBlockCount: blocksForDay.length,
      score
    };
  });
}

export async function getDailyReviewContext(userId: string, date: string, timeZone = "Africa/Casablanca") { const [metric] = await getDailyMetricSeries(userId, date, addDays(date, 1), timeZone); const overdue = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), inArray(tasks.status, activeTaskStatuses), lt(tasks.dueDate, date))); return { ...metric!, overdueTasks: overdue[0]?.count ?? 0 }; }

export async function getExecutionTrends(userId: string, today: string, timeZone = "Africa/Casablanca") { const series = await getDailyMetricSeries(userId, addDays(today, -29), addDays(today, 1), timeZone); const scores = series.map((item) => item.score.score); return { today: scores.at(-1) ?? null, todayReviewCompleted: series.at(-1)?.reviewCompleted ?? false, sevenDay: averageEvaluable(scores.slice(-7)), thirtyDay: averageEvaluable(scores), evaluable7: scores.slice(-7).filter((x) => x !== null).length, evaluable30: scores.filter((x) => x !== null).length }; }

export async function getWeeklyReviewContext(userId: string, weekStart: string, timeZone = "Africa/Casablanca") { const weekEnd = addDays(weekStart, 7); const weekPeriod = periodFor(weekStart, "week", timeZone); const [days, goalMovement, milestoneCount, overdue, upcoming, weeklyHabits, weeklyLogs] = await Promise.all([
  getDailyMetricSeries(userId, weekStart, weekEnd, timeZone),
  getDatabase().select({ goalId: goalProgressHistory.goalId, title: goals.title, progress: goalProgressHistory.progress, recordedAt: goalProgressHistory.recordedAt }).from(goalProgressHistory).innerJoin(goals, eq(goalProgressHistory.goalId, goals.id)).where(and(eq(goalProgressHistory.userId, userId), gte(goalProgressHistory.recordedAt, periodFor(weekStart, "week", timeZone).start), lt(goalProgressHistory.recordedAt, periodFor(weekStart, "week", timeZone).end))).orderBy(asc(goalProgressHistory.recordedAt)),
  getDatabase().select({ count: sql<number>`count(*)::int` }).from(milestones).where(and(eq(milestones.userId, userId), eq(milestones.status, "completed"), gte(milestones.completedAt, periodFor(weekStart, "week", timeZone).start), lt(milestones.completedAt, periodFor(weekStart, "week", timeZone).end))),
  getDatabase().select({ count: sql<number>`count(*)::int` }).from(tasks).where(and(eq(tasks.userId, userId), inArray(tasks.status, activeTaskStatuses), lt(tasks.dueDate, weekEnd))),
  getDatabase().select({ id: projects.id, title: projects.title, deadline: projects.deadline }).from(projects).where(and(eq(projects.userId, userId), ne(projects.status, "archived"), gte(projects.deadline, weekEnd), lt(projects.deadline, addDays(weekEnd, 14)))).orderBy(asc(projects.deadline)).limit(10),
  getDatabase().select().from(habits).where(and(eq(habits.userId, userId), eq(habits.frequencyType, "weekly"), lt(habits.createdAt, weekPeriod.end), or(eq(habits.status, "active"), gte(habits.archivedAt, weekPeriod.start)))),
  getDatabase().select().from(habitLogs).where(and(eq(habitLogs.userId, userId), gte(habitLogs.logDate, weekStart), lt(habitLogs.logDate, weekEnd)))
 ]);
  const movementGoalIds = [...new Set(goalMovement.map((row) => row.goalId))];
  const priorRows = movementGoalIds.length
    ? await getDatabase().select({ goalId: goalProgressHistory.goalId, progress: goalProgressHistory.progress, recordedAt: goalProgressHistory.recordedAt })
        .from(goalProgressHistory)
        .where(and(eq(goalProgressHistory.userId, userId), inArray(goalProgressHistory.goalId, movementGoalIds), lt(goalProgressHistory.recordedAt, weekPeriod.start)))
        .orderBy(asc(goalProgressHistory.goalId), desc(goalProgressHistory.recordedAt))
    : [];
  const latestPrior = new Map<string, string>();
  for (const row of priorRows) if (!latestPrior.has(row.goalId)) latestPrior.set(row.goalId, row.progress);
  const groupedMovement = new Map<string, { goalId: string; title: string; fromProgress: number | null; toProgress: number; recordedAt: Date }>();
  for (const row of goalMovement) {
    const existing = groupedMovement.get(row.goalId);
    if (!existing) {
      groupedMovement.set(row.goalId, {
        goalId: row.goalId,
        title: row.title,
        fromProgress: latestPrior.has(row.goalId) ? Number(latestPrior.get(row.goalId)) : null,
        toProgress: Number(row.progress),
        recordedAt: row.recordedAt
      });
    } else {
      existing.toProgress = Number(row.progress);
      existing.recordedAt = row.recordedAt;
    }
  }
  const selected = days.reduce((sum, day) => sum + day.prioritiesSet, 0);
  const completed = days.reduce((sum, day) => sum + day.prioritiesCompleted, 0);
  const habitRatios = [...days.filter((day) => day.habitRatio !== undefined).map((day) => day.habitRatio!), ...weeklyHabits.map((habit) => Math.min(1, weeklyLogs.filter((log) => log.habitId === habit.id).reduce((sum, log) => sum + Number(log.value), 0) / (habit.targetFrequency ?? 1)))];
  return {
    days,
    prioritiesSet: selected,
    prioritiesCompleted: completed,
    tasksCompleted: days.reduce((sum, day) => sum + day.tasksCompleted, 0),
    plannedMinutes: days.reduce((sum, day) => sum + day.plannedMinutes, 0),
    actualMinutes: days.reduce((sum, day) => sum + day.actualMinutes, 0),
    habitConsistency: habitRatios.length ? habitRatios.reduce((sum, ratio) => sum + ratio, 0) / habitRatios.length : undefined,
    dailyReviewsCompleted: days.filter((day) => day.reviewCompleted).length,
    averageRating: averageEvaluable(days.map((day) => day.rating)),
    executionAverage: averageEvaluable(days.map((day) => day.score.score)),
    goalMovement: [...groupedMovement.values()],
    milestonesCompleted: milestoneCount[0]?.count ?? 0,
    overdueTasks: overdue[0]?.count ?? 0,
    upcoming
  };
}
