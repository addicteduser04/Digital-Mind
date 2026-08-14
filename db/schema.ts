import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import {
  commitmentLevels,
  goalLevels,
  goalMeasurementTypes,
  goalStatuses,
  inboxStatuses,
  lifeAreaStatuses,
  milestoneStatuses,
  priorities,
  projectStatuses,
  taskStatuses
} from "@/lib/domain/constants";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

const inList = (column: unknown, values: readonly string[]) =>
  sql`${column} in (${sql.join(values.map((value) => sql.raw(`'${value}'`)), sql`, `)})`;

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    timezone: text("timezone").notNull().default("Africa/Casablanca"),
    createdAt,
    updatedAt
  },
  (table) => [
    uniqueIndex("app_users_email_unique").on(sql`lower(${table.email})`),
    check("app_users_email_not_blank", sql`length(btrim(${table.email})) > 0`),
    check("app_users_display_name_not_blank", sql`length(btrim(${table.displayName})) > 0`),
    check("app_users_timezone_not_blank", sql`length(btrim(${table.timezone})) > 0`)
  ]
);

export const lifeAreas = pgTable(
  "life_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    importance: integer("importance"),
    satisfaction: integer("satisfaction"),
    status: text("status").notNull().default("active"),
    createdAt,
    updatedAt
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "life_areas_user_fk" }).onDelete("restrict"),
    uniqueIndex("life_areas_id_user_unique").on(table.id, table.userId),
    index("life_areas_user_status_position_idx").on(table.userId, table.status, table.position),
    check("life_areas_name_not_blank", sql`length(btrim(${table.name})) > 0`),
    check("life_areas_position_nonnegative", sql`${table.position} >= 0`),
    check("life_areas_importance_range", sql`${table.importance} is null or ${table.importance} between 1 and 10`),
    check("life_areas_satisfaction_range", sql`${table.satisfaction} is null or ${table.satisfaction} between 1 and 10`),
    check("life_areas_status_valid", inList(table.status, lifeAreaStatuses))
  ]
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    lifeAreaId: uuid("life_area_id"),
    parentGoalId: uuid("parent_goal_id"),
    title: text("title").notNull(),
    description: text("description"),
    level: text("level").notNull().default("general"),
    measurementType: text("measurement_type").notNull().default("manual"),
    targetValue: numeric("target_value", { precision: 18, scale: 4 }),
    currentValue: numeric("current_value", { precision: 18, scale: 4 }),
    unit: text("unit"),
    startDate: date("start_date"),
    deadline: date("deadline"),
    status: text("status").notNull().default("draft"),
    priority: text("priority").notNull().default("medium"),
    progress: numeric("progress", { precision: 5, scale: 2 }).notNull().default("0"),
    createdAt,
    updatedAt,
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "goals_user_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.lifeAreaId, table.userId], foreignColumns: [lifeAreas.id, lifeAreas.userId], name: "goals_life_area_owner_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.parentGoalId, table.userId], foreignColumns: [table.id, table.userId], name: "goals_parent_owner_fk" }).onDelete("restrict"),
    uniqueIndex("goals_id_user_unique").on(table.id, table.userId),
    index("goals_user_status_idx").on(table.userId, table.status),
    index("goals_life_area_idx").on(table.lifeAreaId),
    index("goals_parent_goal_idx").on(table.parentGoalId),
    check("goals_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("goals_not_own_parent", sql`${table.parentGoalId} is null or ${table.parentGoalId} <> ${table.id}`),
    check("goals_level_valid", inList(table.level, goalLevels)),
    check("goals_measurement_type_valid", inList(table.measurementType, goalMeasurementTypes)),
    check("goals_status_valid", inList(table.status, goalStatuses)),
    check("goals_priority_valid", inList(table.priority, priorities)),
    check("goals_values_nonnegative", sql`(${table.targetValue} is null or ${table.targetValue} >= 0) and (${table.currentValue} is null or ${table.currentValue} >= 0)`),
    check("goals_progress_range", sql`${table.progress} between 0 and 100`),
    check("goals_date_order", sql`${table.startDate} is null or ${table.deadline} is null or ${table.startDate} <= ${table.deadline}`),
    check("goals_completed_timestamp", sql`${table.status} <> 'completed' or ${table.completedAt} is not null`)
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    goalId: uuid("goal_id"),
    lifeAreaId: uuid("life_area_id"),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("planned"),
    priority: text("priority").notNull().default("medium"),
    startDate: date("start_date"),
    deadline: date("deadline"),
    progress: numeric("progress", { precision: 5, scale: 2 }).notNull().default("0"),
    createdAt,
    updatedAt,
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "projects_user_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.goalId, table.userId], foreignColumns: [goals.id, goals.userId], name: "projects_goal_owner_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.lifeAreaId, table.userId], foreignColumns: [lifeAreas.id, lifeAreas.userId], name: "projects_life_area_owner_fk" }).onDelete("restrict"),
    uniqueIndex("projects_id_user_unique").on(table.id, table.userId),
    index("projects_user_status_idx").on(table.userId, table.status),
    index("projects_goal_idx").on(table.goalId),
    index("projects_life_area_idx").on(table.lifeAreaId),
    check("projects_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("projects_status_valid", inList(table.status, projectStatuses)),
    check("projects_priority_valid", inList(table.priority, priorities)),
    check("projects_progress_range", sql`${table.progress} between 0 and 100`),
    check("projects_date_order", sql`${table.startDate} is null or ${table.deadline} is null or ${table.startDate} <= ${table.deadline}`),
    check("projects_completed_timestamp", sql`${table.status} <> 'completed' or ${table.completedAt} is not null`)
  ]
);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    deadline: date("deadline"),
    status: text("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "milestones_user_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.projectId, table.userId], foreignColumns: [projects.id, projects.userId], name: "milestones_project_owner_fk" }).onDelete("restrict"),
    uniqueIndex("milestones_id_user_unique").on(table.id, table.userId),
    index("milestones_project_position_idx").on(table.projectId, table.position),
    index("milestones_user_status_idx").on(table.userId, table.status),
    check("milestones_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("milestones_position_nonnegative", sql`${table.position} >= 0`),
    check("milestones_status_valid", inList(table.status, milestoneStatuses)),
    check("milestones_completed_timestamp", sql`${table.status} <> 'completed' or ${table.completedAt} is not null`)
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    projectId: uuid("project_id"),
    goalId: uuid("goal_id"),
    lifeAreaId: uuid("life_area_id"),
    parentTaskId: uuid("parent_task_id"),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("inbox"),
    priority: text("priority").notNull().default("medium"),
    commitmentLevel: text("commitment_level").notNull().default("could"),
    estimatedMinutes: integer("estimated_minutes"),
    actualMinutes: integer("actual_minutes"),
    dueDate: date("due_date"),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdAt,
    updatedAt
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "tasks_user_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.projectId, table.userId], foreignColumns: [projects.id, projects.userId], name: "tasks_project_owner_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.goalId, table.userId], foreignColumns: [goals.id, goals.userId], name: "tasks_goal_owner_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.lifeAreaId, table.userId], foreignColumns: [lifeAreas.id, lifeAreas.userId], name: "tasks_life_area_owner_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.parentTaskId, table.userId], foreignColumns: [table.id, table.userId], name: "tasks_parent_owner_fk" }).onDelete("restrict"),
    uniqueIndex("tasks_id_user_unique").on(table.id, table.userId),
    index("tasks_user_status_due_idx").on(table.userId, table.status, table.dueDate),
    index("tasks_user_scheduled_start_idx").on(table.userId, table.scheduledStart),
    index("tasks_project_idx").on(table.projectId),
    index("tasks_goal_idx").on(table.goalId),
    index("tasks_life_area_idx").on(table.lifeAreaId),
    index("tasks_parent_task_idx").on(table.parentTaskId),
    check("tasks_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("tasks_not_own_parent", sql`${table.parentTaskId} is null or ${table.parentTaskId} <> ${table.id}`),
    check("tasks_status_valid", inList(table.status, taskStatuses)),
    check("tasks_priority_valid", inList(table.priority, priorities)),
    check("tasks_commitment_level_valid", inList(table.commitmentLevel, commitmentLevels)),
    check("tasks_durations_nonnegative", sql`(${table.estimatedMinutes} is null or ${table.estimatedMinutes} >= 0) and (${table.actualMinutes} is null or ${table.actualMinutes} >= 0)`),
    check("tasks_schedule_order", sql`${table.scheduledStart} is null or ${table.scheduledEnd} is null or ${table.scheduledStart} <= ${table.scheduledEnd}`),
    check("tasks_position_nonnegative", sql`${table.position} >= 0`),
    check("tasks_completed_timestamp", sql`${table.status} <> 'completed' or ${table.completedAt} is not null`)
  ]
);

export const inboxItems = pgTable(
  "inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    content: text("content").notNull(),
    status: text("status").notNull().default("unprocessed"),
    createdAt,
    processedAt: timestamp("processed_at", { withTimezone: true })
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "inbox_items_user_fk" }).onDelete("restrict"),
    index("inbox_items_user_status_created_idx").on(table.userId, table.status, table.createdAt),
    check("inbox_items_content_not_blank", sql`length(btrim(${table.content})) > 0`),
    check("inbox_items_status_valid", inList(table.status, inboxStatuses)),
    check("inbox_items_processed_timestamp", sql`${table.status} <> 'processed' or ${table.processedAt} is not null`)
  ]
);

export const dailyPriorities = pgTable(
  "daily_priorities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    priorityDate: date("priority_date").notNull(),
    taskId: uuid("task_id").notNull(),
    position: integer("position").notNull(),
    createdAt
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "daily_priorities_user_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.taskId, table.userId], foreignColumns: [tasks.id, tasks.userId], name: "daily_priorities_task_owner_fk" }).onDelete("restrict"),
    uniqueIndex("daily_priorities_user_date_position_unique").on(table.userId, table.priorityDate, table.position),
    uniqueIndex("daily_priorities_user_date_task_unique").on(table.userId, table.priorityDate, table.taskId),
    index("daily_priorities_user_date_idx").on(table.userId, table.priorityDate),
    check("daily_priorities_position_range", sql`${table.position} between 1 and 3`)
  ]
);

export const goalProgressHistory = pgTable(
  "goal_progress_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    goalId: uuid("goal_id").notNull(),
    progress: numeric("progress", { precision: 5, scale: 2 }).notNull(),
    currentValue: numeric("current_value", { precision: 18, scale: 4 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [appUsers.id], name: "goal_progress_history_user_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.goalId, table.userId], foreignColumns: [goals.id, goals.userId], name: "goal_progress_history_goal_owner_fk" }).onDelete("restrict"),
    index("goal_progress_history_goal_recorded_idx").on(table.goalId, table.recordedAt),
    index("goal_progress_history_user_recorded_idx").on(table.userId, table.recordedAt),
    check("goal_progress_history_progress_range", sql`${table.progress} between 0 and 100`),
    check("goal_progress_history_value_nonnegative", sql`${table.currentValue} is null or ${table.currentValue} >= 0`)
  ]
);

export type AppUser = typeof appUsers.$inferSelect;
export type LifeArea = typeof lifeAreas.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type InboxItem = typeof inboxItems.$inferSelect;
export type DailyPriority = typeof dailyPriorities.$inferSelect;
