import { dateTimeLocalValue, localDateTimeToIso } from "./date-time";

export type CalendarView = "day" | "week" | "month";
export type CalendarItem = { id: string; kind: "event" | "task" | "block"; title: string; startAt: Date; endAt: Date; allDay?: boolean; taskId?: string | null; status?: string };

export function addDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + amount, 12));
  return value.toISOString().slice(0, 10);
}

export function periodFor(date: string, view: CalendarView, timeZone = "Africa/Casablanca") {
  const [year, month, day] = date.split("-").map(Number);
  const noon = new Date(Date.UTC(year!, month! - 1, day!, 12));
  let startDate = date;
  let endDate = addDays(date, 1);
  if (view === "week") {
    const weekday = noon.getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    startDate = addDays(date, -mondayOffset);
    endDate = addDays(startDate, 7);
  } else if (view === "month") {
    startDate = `${date.slice(0, 7)}-01`;
    const nextMonth = new Date(Date.UTC(year!, month!, 1, 12));
    endDate = nextMonth.toISOString().slice(0, 10);
  }
  return { startDate, endDate, start: new Date(localDateTimeToIso(`${startDate}T00:00`, timeZone)!), end: new Date(localDateTimeToIso(`${endDate}T00:00`, timeZone)!) };
}

export function dateKeys(startDate: string, endDate: string) {
  const values: string[] = [];
  for (let cursor = startDate; cursor < endDate; cursor = addDays(cursor, 1)) values.push(cursor);
  return values;
}

export function itemDateKey(date: Date, timeZone = "Africa/Casablanca") { return dateTimeLocalValue(date, timeZone).slice(0, 10); }
export function durationMinutes(start: Date, end: Date) { return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000)); }

export function plannedMinutes(items: CalendarItem[]) {
  const scheduledTaskIds = new Set(items.filter((item) => item.kind === "task").map((item) => item.id));
  return items.reduce((sum, item) => item.kind === "event" || (item.kind === "block" && item.taskId && scheduledTaskIds.has(item.taskId)) ? sum : sum + durationMinutes(item.startAt, item.endAt), 0);
}
