"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { addDays } from "@/lib/domain/calendar";
import { localDateTimeToIso } from "@/lib/domain/date-time";
import { calendarEventStatuses, timeBlockStatuses } from "@/lib/domain/constants";
import { getCurrentUserId } from "@/server/auth/current-user";
import { saveCalendarEvent, saveTimeBlock, scheduleTask, setCalendarEventStatus, setTimeBlockStatus } from "@/server/repositories/calendar";

const id = z.uuid();
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const instant = (value: string) => localDateTimeToIso(value)!;
const refresh = () => { revalidatePath("/calendar"); revalidatePath("/today"); revalidatePath("/tasks"); };
function failure(error: unknown): ActionState {
  if (error instanceof z.ZodError) return { status: "error", message: "Check the calendar details.", errors: z.flattenError(error).fieldErrors };
  return { status: "error", message: error instanceof Error && ["Task schedule is invalid."].includes(error.message) ? error.message : "Digital Mind could not save that calendar change." };
}

export async function saveEventAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const allDay = form.get("allDay") === "on";
    const date = text(form, "date");
    const startAt = allDay ? instant(`${date}T00:00`) : instant(text(form, "startAt"));
    const endAt = allDay ? instant(`${addDays(text(form, "endDate") || date, 1)}T00:00`) : instant(text(form, "endAt"));
    await saveCalendarEvent(await getCurrentUserId(), { title: text(form, "title"), description: optional(form, "description"), location: optional(form, "location"), startAt, endAt, allDay, status: z.enum(calendarEventStatuses).parse(text(form, "status") || "confirmed") }, optional(form, "id"));
    refresh(); return { status: "success", message: "Event saved." };
  } catch (error) { return failure(error); }
}

export async function setEventStatusAction(form: FormData) { await setCalendarEventStatus(await getCurrentUserId(), id.parse(form.get("id")), z.enum(calendarEventStatuses).parse(form.get("status"))); refresh(); }

export async function saveTimeBlockAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveTimeBlock(await getCurrentUserId(), { title: text(form, "title"), description: optional(form, "description"), taskId: optional(form, "taskId"), projectId: optional(form, "projectId"), goalId: optional(form, "goalId"), lifeAreaId: optional(form, "lifeAreaId"), startAt: instant(text(form, "startAt")), endAt: instant(text(form, "endAt")), status: z.enum(timeBlockStatuses).parse(text(form, "status") || "planned") }, optional(form, "id"));
    refresh(); return { status: "success", message: "Time block saved." };
  } catch (error) { return failure(error); }
}

export async function setTimeBlockStatusAction(form: FormData) { await setTimeBlockStatus(await getCurrentUserId(), id.parse(form.get("id")), z.enum(timeBlockStatuses).parse(form.get("status"))); refresh(); }

export async function scheduleTaskAction(_state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const start = optional(form, "startAt"); const end = optional(form, "endAt");
    await scheduleTask(await getCurrentUserId(), id.parse(form.get("id")), start ? new Date(instant(start)) : undefined, end ? new Date(instant(end)) : undefined);
    refresh(); return { status: "success", message: start ? "Task scheduled." : "Schedule removed." };
  } catch (error) { return failure(error); }
}
