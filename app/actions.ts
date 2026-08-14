"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { commitmentLevels, priorities, taskStatuses } from "@/lib/domain/constants";
import type { ActionState } from "@/lib/action-state";
import { localDateTimeToIso } from "@/lib/domain/date-time";
import { dateKeyInTimeZone } from "@/lib/domain/today";
import { getCurrentUser, getCurrentUserId } from "@/server/auth/current-user";
import {
  archiveOwnedTask,
  captureInboxItem,
  convertInboxToTask,
  createOwnedTask,
  replaceDailyPriorities,
  setInboxStatus,
  setTaskCompletion,
  updateOwnedTask
} from "@/server/repositories/execution";

const taskIdSchema = z.uuid();
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const optionalNumber = (form: FormData, key: string) => {
  const value = optional(form, key);
  return value === undefined ? undefined : Number(value);
};

function safeFailure(error: unknown): ActionState {
  if (error instanceof z.ZodError) return { status: "error", message: "Check the highlighted details.", errors: z.flattenError(error).fieldErrors };
  return { status: "error", message: error instanceof Error && ["Task not found.", "Inbox item not found.", "Inbox item is unavailable.", "Choose up to three unique priorities.", "One or more priority tasks are unavailable."].includes(error.message) ? error.message : "Digital Mind could not save that change." };
}

function taskInput(form: FormData) {
  const scheduledStart = optional(form, "scheduledStart");
  const scheduledEnd = optional(form, "scheduledEnd");
  let status = text(form, "status") || "todo";
  if (scheduledStart && status === "todo") status = "scheduled";
  if (!scheduledStart && status === "scheduled") status = "todo";
  return {
    title: text(form, "title"),
    description: optional(form, "description"),
    priority: z.enum(priorities).parse(text(form, "priority") || "medium"),
    commitmentLevel: z.enum(commitmentLevels).parse(text(form, "commitmentLevel") || "should"),
    status: z.enum(taskStatuses).parse(status),
    dueDate: optional(form, "dueDate"),
    scheduledStart: scheduledStart ? localDateTimeToIso(scheduledStart) : undefined,
    scheduledEnd: scheduledEnd ? localDateTimeToIso(scheduledEnd) : undefined,
    estimatedMinutes: optionalNumber(form, "estimatedMinutes"),
    completedAt: optional(form, "completedAt"),
    projectId: optional(form, "projectId"),
    goalId: optional(form, "goalId"),
    lifeAreaId: optional(form, "lifeAreaId")
  };
}

function revalidateExecution() {
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/inbox");
}

export async function quickCreateTaskAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await createOwnedTask(userId, { title: text(form, "title"), status: "todo", priority: "medium", commitmentLevel: "should" });
    revalidateExecution();
    return { status: "success", message: "Task created." };
  } catch (error) { return safeFailure(error); }
}

export async function createTaskAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await createOwnedTask(userId, taskInput(form));
    revalidateExecution();
    return { status: "success", message: "Task created." };
  } catch (error) { return safeFailure(error); }
}

export async function updateTaskAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await updateOwnedTask(userId, taskIdSchema.parse(form.get("taskId")), taskInput(form));
    revalidateExecution();
    return { status: "success", message: "Task updated." };
  } catch (error) { return safeFailure(error); }
}

export async function toggleTaskAction(form: FormData) {
  const userId = await getCurrentUserId();
  await setTaskCompletion(userId, taskIdSchema.parse(form.get("taskId")), form.get("completed") !== "true");
  revalidateExecution();
}

export async function archiveTaskAction(form: FormData) {
  const userId = await getCurrentUserId();
  await archiveOwnedTask(userId, taskIdSchema.parse(form.get("taskId")));
  revalidateExecution();
}

export async function savePrioritiesAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    const taskIds = form.getAll("taskIds").map(String).filter(Boolean);
    await replaceDailyPriorities(user.id, dateKeyInTimeZone(new Date(), user.timezone), taskIds);
    revalidatePath("/today");
    return { status: "success", message: "Priorities saved." };
  } catch (error) { return safeFailure(error); }
}

export async function captureInboxAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await captureInboxItem(userId, text(form, "content"));
    revalidateExecution();
    return { status: "success", message: "Captured." };
  } catch (error) { return safeFailure(error); }
}

export async function convertInboxAction(form: FormData) {
  const userId = await getCurrentUserId();
  await convertInboxToTask(userId, taskIdSchema.parse(form.get("inboxId")));
  revalidateExecution();
}

export async function archiveInboxAction(form: FormData) {
  const userId = await getCurrentUserId();
  await setInboxStatus(userId, taskIdSchema.parse(form.get("inboxId")), "archived");
  revalidatePath("/inbox");
}
