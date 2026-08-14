"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { localDateTimeToIso } from "@/lib/domain/date-time";
import { habitFrequencyTypes, habitStatuses, habitTrackingTypes } from "@/lib/domain/constants";
import { getCurrentUserId } from "@/server/auth/current-user";
import { cancelFocusSession, createManualFocusSession, endFocusSession, logHabit, reorderHabits, saveHabit, setHabitArchived, startFocusSession, updateCompletedFocusSession } from "@/server/repositories/behavior";

const id = z.uuid(); const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim(); const optional = (form: FormData, key: string) => text(form, key) || undefined; const number = (form: FormData, key: string) => optional(form, key) === undefined ? undefined : Number(form.get(key));
const refresh = () => { revalidatePath("/habits"); revalidatePath("/focus"); revalidatePath("/today"); revalidatePath("/life"); revalidatePath("/projects"); revalidatePath("/goals"); };
function failure(error: unknown): ActionState { if (error instanceof z.ZodError) return { status: "error", message: "Check the highlighted details.", errors: z.flattenError(error).fieldErrors }; const safe = error instanceof Error && ["A focus session is already active.", "Focus session is not active.", "Boolean habit values must be zero or one.", "Manual duration must be positive."].includes(error.message) ? error.message : "Digital Mind could not save that behavior."; return { status: "error", message: safe }; }
const context = (form: FormData) => ({ taskId: optional(form, "taskId"), projectId: optional(form, "projectId"), goalId: optional(form, "goalId"), lifeAreaId: optional(form, "lifeAreaId"), plannedMinutes: number(form, "plannedMinutes"), notes: optional(form, "notes") });

export async function saveHabitAction(_state: ActionState, form: FormData): Promise<ActionState> { try { const trackingType = z.enum(habitTrackingTypes).parse(text(form, "trackingType")); await saveHabit(await getCurrentUserId(), { name: text(form, "name"), description: optional(form, "description"), lifeAreaId: optional(form, "lifeAreaId"), trackingType, unit: trackingType === "duration" ? "minutes" : optional(form, "unit"), targetValue: number(form, "targetValue"), frequencyType: z.enum(habitFrequencyTypes).parse(text(form, "frequencyType") || "daily"), targetFrequency: number(form, "targetFrequency"), status: z.enum(habitStatuses).parse(text(form, "status") || "active"), position: number(form, "position") ?? 0 }, optional(form, "id")); refresh(); return { status: "success", message: "Habit saved." }; } catch (error) { return failure(error); } }
export async function archiveHabitAction(form: FormData) { await setHabitArchived(await getCurrentUserId(), id.parse(form.get("id")), form.get("archived") !== "true"); refresh(); }
export async function reorderHabitsAction(form: FormData) { await reorderHabits(await getCurrentUserId(), form.getAll("ids").map(String)); refresh(); }
export async function logHabitAction(_state: ActionState, form: FormData): Promise<ActionState> { try { await logHabit(await getCurrentUserId(), id.parse(form.get("habitId")), text(form, "logDate"), Number(form.get("value")), optional(form, "notes")); refresh(); return { status: "success", message: "Logged." }; } catch (error) { return failure(error); } }

export async function startFocusAction(_state: ActionState, form: FormData): Promise<ActionState> { try { await startFocusSession(await getCurrentUserId(), context(form)); refresh(); return { status: "success", message: "Focus session started." }; } catch (error) { return failure(error); } }
export async function endFocusAction(form: FormData) { await endFocusSession(await getCurrentUserId(), id.parse(form.get("id"))); refresh(); }
export async function cancelFocusAction(form: FormData) { await cancelFocusSession(await getCurrentUserId(), id.parse(form.get("id"))); refresh(); }
export async function manualFocusAction(_state: ActionState, form: FormData): Promise<ActionState> { try { await createManualFocusSession(await getCurrentUserId(), { ...context(form), startedAt: localDateTimeToIso(text(form, "startedAt"))!, durationMinutes: Number(form.get("durationMinutes")) }); refresh(); return { status: "success", message: "Focus entry recorded." }; } catch (error) { return failure(error); } }
export async function updateFocusAction(_state: ActionState, form: FormData): Promise<ActionState> { try { await updateCompletedFocusSession(await getCurrentUserId(), id.parse(form.get("id")), context(form)); refresh(); return { status: "success", message: "Session details saved." }; } catch (error) { return failure(error); } }
