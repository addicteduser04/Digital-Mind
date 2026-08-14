"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { goalLevels, goalMeasurementTypes, goalStatuses, lifeAreaStatuses, milestoneStatuses, priorities, projectStatuses } from "@/lib/domain/constants";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUserId } from "@/server/auth/current-user";
import {
  archiveLifeArea,
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

const id = z.uuid();
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const number = (form: FormData, key: string, fallback?: number) => optional(form, key) === undefined ? fallback : Number(form.get(key));

function failure(error: unknown): ActionState {
  if (error instanceof z.ZodError) return { status: "error", message: "Check the highlighted details.", errors: z.flattenError(error).fieldErrors };
  const safe = error instanceof Error && ["Goal parent is unavailable.", "Project and goal life areas must match.", "Goal is unavailable."].includes(error.message) ? error.message : "Digital Mind could not save that change.";
  return { status: "error", message: safe };
}

function refreshPlanning() {
  revalidatePath("/life"); revalidatePath("/goals"); revalidatePath("/projects"); revalidatePath("/tasks"); revalidatePath("/today");
}

export async function saveLifeAreaAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await saveLifeArea(userId, { name: text(form, "name"), description: optional(form, "description"), icon: optional(form, "icon"), position: number(form, "position", 0), importance: number(form, "importance"), satisfaction: number(form, "satisfaction"), status: z.enum(lifeAreaStatuses).parse(text(form, "status") || "active") }, optional(form, "id"));
    refreshPlanning(); return { status: "success", message: "Life area saved." };
  } catch (error) { return failure(error); }
}

export async function archiveLifeAreaAction(form: FormData) { await archiveLifeArea(await getCurrentUserId(), id.parse(form.get("id"))); refreshPlanning(); }
export async function reorderLifeAreasAction(form: FormData) { await reorderLifeAreas(await getCurrentUserId(), form.getAll("ids").map(String)); refreshPlanning(); }

export async function saveGoalAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await saveGoal(userId, { title: text(form, "title"), description: optional(form, "description"), lifeAreaId: optional(form, "lifeAreaId"), parentGoalId: optional(form, "parentGoalId"), level: z.enum(goalLevels).parse(text(form, "level") || "general"), measurementType: z.enum(goalMeasurementTypes).parse(text(form, "measurementType") || "manual"), targetValue: number(form, "targetValue"), currentValue: number(form, "currentValue"), unit: optional(form, "unit"), startDate: optional(form, "startDate"), deadline: optional(form, "deadline"), status: z.enum(goalStatuses).parse(text(form, "status") || "draft"), priority: z.enum(priorities).parse(text(form, "priority") || "medium"), progress: number(form, "progress", 0) }, optional(form, "id"));
    refreshPlanning(); return { status: "success", message: "Goal saved." };
  } catch (error) { return failure(error); }
}

export async function updateGoalProgressAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const changed = await updateGoalProgress(await getCurrentUserId(), id.parse(form.get("id")), Number(form.get("progress")), number(form, "currentValue"));
    refreshPlanning(); return { status: "success", message: changed ? "Progress recorded." : "Progress is unchanged." };
  } catch (error) { return failure(error); }
}
export async function toggleGoalCompletionAction(form: FormData) { await setGoalCompletion(await getCurrentUserId(), id.parse(form.get("id")), form.get("completed") !== "true"); refreshPlanning(); }

export async function saveProjectAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveProject(await getCurrentUserId(), { title: text(form, "title"), description: optional(form, "description"), goalId: optional(form, "goalId"), lifeAreaId: optional(form, "lifeAreaId"), status: z.enum(projectStatuses).parse(text(form, "status") || "planned"), priority: z.enum(priorities).parse(text(form, "priority") || "medium"), startDate: optional(form, "startDate"), deadline: optional(form, "deadline"), progress: number(form, "progress", 0) }, optional(form, "id"));
    refreshPlanning(); return { status: "success", message: "Project saved." };
  } catch (error) { return failure(error); }
}
export async function toggleProjectCompletionAction(form: FormData) { await setProjectCompletion(await getCurrentUserId(), id.parse(form.get("id")), form.get("completed") !== "true"); refreshPlanning(); }

export async function saveMilestoneAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveMilestone(await getCurrentUserId(), { projectId: id.parse(form.get("projectId")), title: text(form, "title"), description: optional(form, "description"), position: number(form, "position", 0), deadline: optional(form, "deadline"), status: z.enum(milestoneStatuses).parse(text(form, "status") || "pending") }, optional(form, "id"));
    refreshPlanning(); return { status: "success", message: "Milestone saved." };
  } catch (error) { return failure(error); }
}
export async function toggleMilestoneAction(form: FormData) { await setMilestoneCompletion(await getCurrentUserId(), id.parse(form.get("id")), form.get("completed") !== "true"); refreshPlanning(); }
export async function reorderMilestonesAction(form: FormData) { await reorderMilestones(await getCurrentUserId(), id.parse(form.get("projectId")), form.getAll("ids").map(String)); refreshPlanning(); }
