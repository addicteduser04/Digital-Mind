import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Inbox, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CaptureForm } from "@/components/capture-form";
import { PriorityPicker } from "@/components/priority-picker";
import { QuickCreateForm } from "@/components/quick-create-form";
import { TaskRow } from "@/components/task-row";
import { HabitLogControl } from "@/components/behavior-forms";
import { dateKeyInTimeZone, groupTodayTasks } from "@/lib/domain/today";
import { periodFor, plannedMinutes, type CalendarItem } from "@/lib/domain/calendar";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTodayExecution } from "@/server/repositories/execution";
import { listCalendarItems } from "@/server/repositories/calendar";
import { getFocusDashboard, listHabitProgress } from "@/server/repositories/behavior";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const today = dateKeyInTimeZone(now, user.timezone);
  const dayPeriod = periodFor(today, "day", user.timezone);
  const weekPeriod = periodFor(today, "week", user.timezone);
  const [execution, calendar, habits, focus] = await Promise.all([getTodayExecution(user.id, today), listCalendarItems(user.id, dayPeriod.start, dayPeriod.end), listHabitProgress(user.id, today), getFocusDashboard(user.id, dayPeriod.start, dayPeriod.end, weekPeriod.start, weekPeriod.end)]);
  const groups = groupTodayTasks(execution.tasks, today, user.timezone);
  const priorityMap = new Map(execution.priorities.map((priority) => [priority.taskId, priority.position]));
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: user.timezone, weekday: "long", month: "long", day: "numeric" }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: user.timezone, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const priorityTasks = execution.priorities.map((priority) => ({ ...priority, task: execution.tasks.find((task) => task.id === priority.taskId) })).filter((item) => item.task);
  const planItems: CalendarItem[] = [...calendar.tasks.filter((task) => task.scheduledStart && task.scheduledEnd).map((task) => ({ id: task.id, kind: "task" as const, title: task.title, startAt: task.scheduledStart!, endAt: task.scheduledEnd! })), ...calendar.blocks.map(({ block }) => ({ id: block.id, kind: "block" as const, title: block.title, startAt: block.startAt, endAt: block.endAt, taskId: block.taskId }))];

  return (
    <AppShell>
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{dateLabel}</p><h1 className="mt-3 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">{greeting}.</h1><p className="mt-3 text-sm text-muted-foreground">Choose what matters, then protect the time to do it.</p></div>
        <Link href="/tasks" className="button-secondary self-start sm:self-auto"><SlidersHorizontal size={15} />All tasks</Link>
      </header>

      <div className="grid gap-12 pt-9 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)] lg:gap-14">
        <div className="space-y-11">
          {focus.active ? <Link href="/focus" className="block rounded-2xl bg-ink p-5 text-ink-foreground"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Active focus session</p><p className="mt-2 text-xl font-medium">Continue focusing</p><p className="mt-1 text-xs text-ink-muted">Started {formatTime(focus.active.startedAt, user.timezone)} · server timer is running</p></Link> : <div className="flex items-center justify-between rounded-2xl border bg-card p-4"><div><p className="text-sm font-medium">Ready to focus?</p><p className="mt-1 text-xs text-muted-foreground">{focus.summary.todayMinutes} measured minutes today</p></div><Link href="/focus" className="button-primary">Start focus</Link></div>}
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
          <section><div className="flex items-end justify-between"><div><p className="section-kicker">Behavior</p><h2 className="section-title">Habits</h2></div><Link href="/habits" className="text-xs text-muted-foreground">Manage</Link></div><div className="mt-4 divide-y border-y">{habits.length ? habits.map(({ habit, value, today: log }) => { const target = habit.trackingType === "frequency" ? habit.targetFrequency ?? 1 : Number(habit.targetValue ?? 1); const unit = habit.trackingType === "duration" ? "min" : habit.unit; const entryValue = habit.trackingType === "frequency" && habit.frequencyType === "weekly" ? Number(log?.value ?? 0) : value; return <div key={habit.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><Link href={`/habits/${habit.id}`} className="text-sm font-medium">{habit.name}</Link><p className="mt-1 text-xs text-muted-foreground">{value} / {target} {unit ?? ""}{habit.trackingType === "frequency" && habit.frequencyType === "weekly" ? " this week" : " today"}</p></div><HabitLogControl habitId={habit.id} date={today} value={entryValue} type={habit.trackingType} target={target} unit={unit} /></div>; }) : <p className="py-8 text-center text-sm text-muted-foreground">No active habits.</p>}</div></section>
        </div>

        <aside className="space-y-9">
          <section><div className="flex items-end justify-between"><div><p className="section-kicker">Calendar</p><h2 className="section-title">Today’s schedule</h2></div><Link href={`/calendar?view=day&date=${today}`} className="text-xs text-muted-foreground">Open day</Link></div><p className="mt-2 text-xs text-muted-foreground">{plannedMinutes(planItems)} planned minutes</p><div className="mt-4 space-y-2">{calendar.events.map((event) => <TodayCalendarLine key={`event-${event.id}`} label="Event" title={event.title} at={event.allDay ? "All day" : formatTime(event.startAt, user.timezone)} />)}{calendar.blocks.map(({ block }) => <TodayCalendarLine key={`block-${block.id}`} label="Block" title={block.title} at={formatTime(block.startAt, user.timezone)} />)}{!calendar.events.length && !calendar.blocks.length ? <p className="rounded-xl border p-4 text-xs text-muted-foreground">No events or time blocks today.</p> : null}</div></section>
          <section><p className="section-kicker">Plan</p><h2 className="section-title">Add task</h2><div className="mt-4"><QuickCreateForm /></div></section>
          <section><p className="section-kicker">Record</p><h2 className="section-title">Quick capture</h2><div className="mt-4 rounded-2xl bg-ink p-5 text-ink-foreground"><div className="mb-5 flex items-start gap-3"><Inbox className="mt-0.5" size={17} /><div><p className="text-sm font-medium">Clear your mind</p><p className="mt-1 text-xs leading-5 text-ink-muted">Capture now. Organize later.</p></div></div><CaptureForm dark /></div></section>
        </aside>
      </div>
    </AppShell>
  );
}

function TodayCalendarLine({ label, title, at }: { label: string; title: string; at: string }) { return <div className="rounded-xl border bg-card p-3"><p className="font-mono text-[9px] uppercase text-muted-foreground">{label} · {at}</p><p className="mt-1 text-sm font-medium">{title}</p></div>; }
function formatTime(value: Date, timeZone: string) { return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(value); }

function EmptyLine({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>; }

function TaskGroup({ title, kicker, tasks, priorityMap, timeZone, empty }: { title: string; kicker: string; tasks: Awaited<ReturnType<typeof getTodayExecution>>["tasks"]; priorityMap: Map<string, number>; timeZone: string; empty: string }) {
  return <section aria-labelledby={`${title.replaceAll(" ", "-")}-heading`}><div className="flex items-end justify-between"><div><p className="section-kicker">{kicker}</p><h2 id={`${title.replaceAll(" ", "-")}-heading`} className="section-title">{title}</h2></div>{tasks.length ? <span className="font-mono text-xs text-muted-foreground">{tasks.length}</span> : null}</div><div className="mt-4 border-t border-border">{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} priorityPosition={priorityMap.get(task.id)} timeZone={timeZone} />) : <EmptyLine text={empty} />}</div></section>;
}
