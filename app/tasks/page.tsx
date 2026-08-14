import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { QuickCreateForm } from "@/components/quick-create-form";
import { TaskRow } from "@/components/task-row";
import { dateKeyInTimeZone } from "@/lib/domain/today";
import { getCurrentUser } from "@/server/auth/current-user";
import { listTasks, type TaskFilter } from "@/server/repositories/execution";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const params = await searchParams;
  const filter: TaskFilter = ["active", "completed", "overdue"].includes(params.view ?? "") ? params.view as TaskFilter : "active";
  const user = await getCurrentUser();
  const rows = await listTasks(user.id, filter, dateKeyInTimeZone(new Date(), user.timezone), params.q?.trim());
  return <AppShell>
    <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="section-kicker">Execution inventory</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.04em]">Tasks</h1><p className="mt-2 text-sm text-muted-foreground">Plan, schedule, and close the loop.</p></div><Link href="/tasks/new" className="button-primary self-start sm:self-auto"><Plus size={16} />New task</Link></header>
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px]">
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex gap-1 rounded-xl bg-secondary p-1" aria-label="Task filters">{(["active", "overdue", "completed"] as const).map((view) => <Link key={view} href={`/tasks?view=${view}`} aria-current={filter === view ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${filter === view ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{view}</Link>)}</nav>
          <form className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} /><input name="q" defaultValue={params.q} aria-label="Search tasks" placeholder="Search tasks" className="input pl-9 sm:w-56" /><input type="hidden" name="view" value={filter} /></form>
        </div>
        <div className="mt-6 border-t border-border">{rows.length ? rows.map((task) => <TaskRow key={task.id} task={task} timeZone={user.timezone} />) : <div className="py-16 text-center"><p className="text-sm font-medium">No {filter} tasks.</p><p className="mt-1 text-xs text-muted-foreground">Create a task when something needs your attention.</p></div>}</div>
      </section>
      <aside><p className="section-kicker">Fast path</p><h2 className="section-title">Add task</h2><div className="mt-4"><QuickCreateForm /></div></aside>
    </div>
  </AppShell>;
}
