import Link from "next/link";
import { CalendarClock, Flag, Pencil } from "lucide-react";
import { toggleTaskAction } from "@/app/actions";

export type TaskRowData = {
  id: string; title: string; status: string; priority: string; commitmentLevel: string;
  dueDate: string | null; scheduledStart: Date | null; estimatedMinutes: number | null;
  projectTitle: string | null; goalTitle: string | null; lifeAreaName: string | null;
};

export function TaskRow({ task, priorityPosition, timeZone = "Africa/Casablanca" }: { task: TaskRowData; priorityPosition?: number; timeZone?: string }) {
  const completed = task.status === "completed";
  const time = task.scheduledStart ? new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(task.scheduledStart) : null;
  const context = task.projectTitle ?? task.goalTitle ?? task.lifeAreaName;
  return (
    <article className="group flex items-start gap-3 border-b border-border py-3.5 last:border-b-0">
      <form action={toggleTaskAction}>
        <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="completed" value={String(completed)} />
        <button className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${completed ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`} aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`}>{completed ? "✓" : ""}</button>
      </form>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2"><h3 className={`min-w-0 flex-1 text-sm font-medium leading-5 ${completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</h3>{priorityPosition ? <span className="font-mono text-[10px] text-amber-700">TOP {priorityPosition}</span> : null}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="capitalize">{task.commitmentLevel}</span>
          {task.priority === "high" || task.priority === "critical" ? <span className="inline-flex items-center gap-1"><Flag size={11} />{task.priority}</span> : null}
          {time ? <span className="inline-flex items-center gap-1"><CalendarClock size={11} />{time}</span> : task.dueDate ? <span>Due {task.dueDate}</span> : null}
          {context ? <span className="truncate">{context}</span> : null}
          {task.estimatedMinutes ? <span>{task.estimatedMinutes}m</span> : null}
        </div>
      </div>
      <Link href={`/tasks/${task.id}`} className="button-icon-quiet opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label={`Edit ${task.title}`}><Pencil size={15} /></Link>
    </article>
  );
}
