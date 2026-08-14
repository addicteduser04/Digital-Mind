export type TodayTask = {
  id: string;
  dueDate: string | null;
  scheduledStart: Date | null;
};

export type TodayGroups<T> = { overdue: T[]; scheduled: T[]; due: T[]; other: T[] };

export function dateKeyInTimeZone(value: Date, timeZone = "Africa/Casablanca") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function groupTodayTasks<T extends TodayTask>(tasks: T[], today: string, timeZone = "Africa/Casablanca"): TodayGroups<T> {
  const groups: TodayGroups<T> = { overdue: [], scheduled: [], due: [], other: [] };
  for (const task of tasks) {
    if (task.dueDate && task.dueDate < today) groups.overdue.push(task);
    else if (task.scheduledStart && dateKeyInTimeZone(task.scheduledStart, timeZone) === today) groups.scheduled.push(task);
    else if (task.dueDate === today) groups.due.push(task);
    else groups.other.push(task);
  }
  return groups;
}
