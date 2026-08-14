import { z } from "zod";
import {
  commitmentLevels,
  calendarEventStatuses,
  focusSessionSources,
  focusSessionStatuses,
  goalLevels,
  goalMeasurementTypes,
  goalStatuses,
  habitFrequencyTypes,
  habitStatuses,
  habitTrackingTypes,
  inboxStatuses,
  lifeAreaStatuses,
  mainObjectiveStatuses,
  milestoneStatuses,
  priorities,
  projectStatuses,
  taskStatuses,
  timeBlockStatuses
} from "./constants";

const id = z.uuid();
const optionalId = id.optional();
const title = z.string().trim().min(1).max(300);
const description = z.string().trim().max(10_000).optional();
const dateOnly = z.iso.date();
const timestamp = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const progress = z.number().min(0).max(100);
const nonnegativeNumber = z.number().nonnegative();

export const createAppUserSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(200),
  timezone: z.string().trim().min(1).max(100).default("Africa/Casablanca")
});

export const createLifeAreaSchema = z.object({
  userId: id,
  name: title,
  description,
  icon: z.string().trim().max(100).optional(),
  position: z.number().int().nonnegative().default(0),
  importance: z.number().int().min(1).max(10).optional(),
  satisfaction: z.number().int().min(1).max(10).optional(),
  status: z.enum(lifeAreaStatuses).default("active")
});

export const createGoalSchema = z.object({
  userId: id,
  lifeAreaId: optionalId,
  parentGoalId: optionalId,
  title,
  description,
  level: z.enum(goalLevels).default("general"),
  measurementType: z.enum(goalMeasurementTypes).default("manual"),
  targetValue: nonnegativeNumber.optional(),
  currentValue: nonnegativeNumber.optional(),
  unit: z.string().trim().max(50).optional(),
  startDate: dateOnly.optional(),
  deadline: dateOnly.optional(),
  status: z.enum(goalStatuses).default("draft"),
  priority: z.enum(priorities).default("medium"),
  progress: progress.default(0),
  completedAt: timestamp.optional()
}).superRefine((value, context) => {
  if (value.startDate && value.deadline && value.startDate > value.deadline) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "Deadline cannot precede start date." });
  }
  if (value.status === "completed" && !value.completedAt) {
    context.addIssue({ code: "custom", path: ["completedAt"], message: "Completed goals require a completion timestamp." });
  }
});

export const createProjectSchema = z.object({
  userId: id,
  goalId: optionalId,
  lifeAreaId: optionalId,
  title,
  description,
  status: z.enum(projectStatuses).default("planned"),
  priority: z.enum(priorities).default("medium"),
  startDate: dateOnly.optional(),
  deadline: dateOnly.optional(),
  progress: progress.default(0),
  completedAt: timestamp.optional()
}).superRefine((value, context) => {
  if (value.startDate && value.deadline && value.startDate > value.deadline) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "Deadline cannot precede start date." });
  }
  if (value.status === "completed" && !value.completedAt) {
    context.addIssue({ code: "custom", path: ["completedAt"], message: "Completed projects require a completion timestamp." });
  }
});

export const createMilestoneSchema = z.object({
  userId: id,
  projectId: id,
  title,
  description,
  position: z.number().int().nonnegative().default(0),
  deadline: dateOnly.optional(),
  status: z.enum(milestoneStatuses).default("pending"),
  completedAt: timestamp.optional()
}).superRefine((value, context) => {
  if (value.status === "completed" && !value.completedAt) {
    context.addIssue({ code: "custom", path: ["completedAt"], message: "Completed milestones require a completion timestamp." });
  }
});

export const createTaskSchema = z.object({
  userId: id,
  projectId: optionalId,
  goalId: optionalId,
  lifeAreaId: optionalId,
  parentTaskId: optionalId,
  title,
  description,
  status: z.enum(taskStatuses).default("inbox"),
  priority: z.enum(priorities).default("medium"),
  commitmentLevel: z.enum(commitmentLevels).default("could"),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  actualMinutes: z.number().int().nonnegative().optional(),
  dueDate: dateOnly.optional(),
  scheduledStart: timestamp.optional(),
  scheduledEnd: timestamp.optional(),
  completedAt: timestamp.optional(),
  position: z.number().int().nonnegative().default(0)
}).superRefine((value, context) => {
  if (value.scheduledStart && value.scheduledEnd && value.scheduledStart > value.scheduledEnd) {
    context.addIssue({ code: "custom", path: ["scheduledEnd"], message: "Scheduled end cannot precede scheduled start." });
  }
  if (value.status === "completed" && !value.completedAt) {
    context.addIssue({ code: "custom", path: ["completedAt"], message: "Completed tasks require a completion timestamp." });
  }
});

export const createInboxItemSchema = z.object({
  userId: id,
  content: z.string().trim().min(1).max(10_000),
  status: z.enum(inboxStatuses).default("unprocessed"),
  processedAt: timestamp.optional()
}).superRefine((value, context) => {
  if (value.status === "processed" && !value.processedAt) {
    context.addIssue({ code: "custom", path: ["processedAt"], message: "Processed inbox items require a processed timestamp." });
  }
});

export const createCalendarEventSchema = z.object({
  userId: id,
  title,
  description,
  startAt: timestamp,
  endAt: timestamp,
  allDay: z.boolean().default(false),
  location: z.string().trim().max(500).optional(),
  status: z.enum(calendarEventStatuses).default("confirmed")
}).superRefine((value, context) => {
  if (value.endAt < value.startAt) context.addIssue({ code: "custom", path: ["endAt"], message: "End cannot precede start." });
});

export const createTimeBlockSchema = z.object({
  userId: id,
  taskId: optionalId,
  projectId: optionalId,
  goalId: optionalId,
  lifeAreaId: optionalId,
  title,
  description,
  startAt: timestamp,
  endAt: timestamp,
  status: z.enum(timeBlockStatuses).default("planned")
}).superRefine((value, context) => {
  if (value.endAt < value.startAt) context.addIssue({ code: "custom", path: ["endAt"], message: "End cannot precede start." });
});

export const createHabitSchema = z.object({
  userId: id,
  lifeAreaId: optionalId,
  name: title,
  description,
  trackingType: z.enum(habitTrackingTypes),
  unit: z.string().trim().max(50).optional(),
  targetValue: z.number().positive().optional(),
  frequencyType: z.enum(habitFrequencyTypes).default("daily"),
  targetFrequency: z.number().int().positive().optional(),
  status: z.enum(habitStatuses).default("active"),
  position: z.number().int().nonnegative().default(0)
}).superRefine((value, context) => {
  if (["quantity", "duration"].includes(value.trackingType) && value.targetValue === undefined) context.addIssue({ code: "custom", path: ["targetValue"], message: "This habit needs a target." });
  if (value.trackingType === "frequency" && value.targetFrequency === undefined) context.addIssue({ code: "custom", path: ["targetFrequency"], message: "Frequency habits need an occurrence target." });
  if (value.trackingType === "boolean" && (value.targetValue !== undefined || value.unit)) context.addIssue({ code: "custom", path: ["trackingType"], message: "Boolean habits do not use a numeric target or unit." });
});

export const habitLogSchema = z.object({ userId: id, habitId: id, logDate: dateOnly, value: z.number().nonnegative(), notes: z.string().trim().max(2_000).optional() });
export const focusContextSchema = z.object({ taskId: optionalId, projectId: optionalId, goalId: optionalId, lifeAreaId: optionalId, plannedMinutes: z.number().int().positive().optional(), notes: z.string().trim().max(10_000).optional() });
export const createFocusSessionSchema = focusContextSchema.extend({ userId: id, startedAt: timestamp, endedAt: timestamp.optional(), durationMinutes: z.number().int().nonnegative().optional(), status: z.enum(focusSessionStatuses), source: z.enum(focusSessionSources) });

const reviewText = z.string().trim().min(1).max(10_000);
export const dailyReviewSchema = z.object({ userId: id, reviewDate: dateOnly, rating: z.number().int().min(1).max(5), mainObjectiveStatus: z.enum(mainObjectiveStatuses), wentWell: reviewText, blocker: reviewText, tomorrowPriority: reviewText, notes: z.string().trim().max(10_000).optional() });
export const weeklyReviewSchema = z.object({ userId: id, weekStart: dateOnly, rating: z.number().int().min(1).max(5), summary: reviewText, whatWorked: reviewText, whatDidnt: reviewText, shouldChange: reviewText, nextWeekFocus: reviewText, notes: z.string().trim().max(10_000).optional() });

export const goalProgressSchema = z.object({
  userId: id,
  goalId: id,
  progress,
  currentValue: nonnegativeNumber.optional()
});

export type CreateAppUserInput = z.input<typeof createAppUserSchema>;
export type CreateLifeAreaInput = z.input<typeof createLifeAreaSchema>;
export type CreateGoalInput = z.input<typeof createGoalSchema>;
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateMilestoneInput = z.input<typeof createMilestoneSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateInboxItemInput = z.input<typeof createInboxItemSchema>;
export type CreateCalendarEventInput = z.input<typeof createCalendarEventSchema>;
export type CreateTimeBlockInput = z.input<typeof createTimeBlockSchema>;
export type CreateHabitInput = z.input<typeof createHabitSchema>;
