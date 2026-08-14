import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Inbox, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CaptureForm } from "@/components/capture-form";
import { PriorityPicker } from "@/components/priority-picker";
import { QuickCreateForm } from "@/components/quick-create-form";
import { TaskRow } from "@/components/task-row";
import { dateKeyInTimeZone, groupTodayTasks } from "@/lib/domain/today";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTodayExecution } from "@/server/repositories/execution";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const today = dateKeyInTimeZone(now, user.timezone);
  const execution = await getTodayExecution(user.id, today);
  const groups = groupTodayTasks(execution.tasks, today, user.timezone);
  const priorityMap = new Map(execution.priorities.map((priority) => [priority.taskId, priority.position]));
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: user.timezone, weekday: "long", month: "long", day: "numeric" }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: user.timezone, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const priorityTasks = execution.priorities.map((priority) => ({ ...priority, task: execution.tasks.find((task) => task.id === priority.taskId) })).filter((item) => item.task);

  return (
    <AppShell>
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{dateLabel}</p><h1 className="mt-3 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">{greeting}.</h1><p className="mt-3 text-sm text-muted-foreground">Choose what matters, then protect the time to do it.</p></div>
        <Link href="/tasks" className="button-secondary self-start sm:self-auto"><SlidersHorizontal size={15} />All tasks</Link>
      </header>

      <div className="grid gap-12 pt-9 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)] lg:gap-14">
        <div className="space-y-11">
          <section aria-labelledby="priorities-heading">
            <div className="flex items-end justify-between"><div><p className="section-kicker">Primary commitments</p><h2 id="priorities-heading" className="section-title">Top priorities</h2></div><span className="font-mono text-xs text-muted-foreground">{priorityTasks.length} / 3</span></div>
            <div className="mt-4 rounded-2xl border border-border bg-card px-4 sm:px-5">
              {priorityTasks.length ? priorityTasks.map(({ position, task }) => <TaskRow key={task!.id} task={task!} priorityPosition={position} timeZone={user.timezone} />) : <EmptyLine text="No priorities chosen yet." />}
            </div>
            <details className="group mt-3 rounded-xl border border-transparent open:border-border open:bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ChevronDown className="transition-transform group-open:rotate-180" size={14} />Choose today’s priorities</summary>
              <div className="border-t border-border p-3"><PriorityPicker tasks={execution.tasks.map(({ id, title }) => ({ id, title }))} selected={execution.priorities.map(({ taskId }) => taskId)} /></div>
            </details>
          </section>

          <TaskGroup title="Overdue" kicker="Needs attention" tasks={groups.overdue} priorityMap={priorityMap} timeZone={user.timezone} empty="Nothing overdue." />
          <TaskGroup title="Scheduled today" kicker="Protected time" tasks={groups.scheduled} priorityMap={priorityMap} timeZone={user.timezone} empty="Nothing scheduled yet." />
          <TaskGroup title="Due today" kicker="Due" tasks={groups.due} priorityMap={priorityMap} timeZone={user.timezone} empty="Nothing else due today." />
          <TaskGroup title="Other tasks" kicker="Available next" tasks={groups.other.slice(0, 8)} priorityMap={priorityMap} timeZone={user.timezone} empty="No active tasks." />
        </div>

        <aside className="space-y-9">
          <section><p className="section-kicker">Plan</p><h2 className="section-title">Add task</h2><div className="mt-4"><QuickCreateForm /></div></section>
          <section><p className="section-kicker">Record</p><h2 className="section-title">Quick capture</h2><div className="mt-4 rounded-2xl bg-ink p-5 text-ink-foreground"><div className="mb-5 flex items-start gap-3"><Inbox className="mt-0.5" size={17} /><div><p className="text-sm font-medium">Clear your mind</p><p className="mt-1 text-xs leading-5 text-ink-muted">Capture now. Organize later.</p></div></div><CaptureForm dark /></div></section>
        </aside>
      </div>
    </AppShell>
  );
}

function EmptyLine({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>; }

function TaskGroup({ title, kicker, tasks, priorityMap, timeZone, empty }: { title: string; kicker: string; tasks: Awaited<ReturnType<typeof getTodayExecution>>["tasks"]; priorityMap: Map<string, number>; timeZone: string; empty: string }) {
  return <section aria-labelledby={`${title.replaceAll(" ", "-")}-heading`}><div className="flex items-end justify-between"><div><p className="section-kicker">{kicker}</p><h2 id={`${title.replaceAll(" ", "-")}-heading`} className="section-title">{title}</h2></div>{tasks.length ? <span className="font-mono text-xs text-muted-foreground">{tasks.length}</span> : null}</div><div className="mt-4 border-t border-border">{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} priorityPosition={priorityMap.get(task.id)} timeZone={timeZone} />) : <EmptyLine text={empty} />}</div></section>;
}
