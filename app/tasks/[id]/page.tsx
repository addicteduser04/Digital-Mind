import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";
import { archiveTaskAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getOwnedTask, getTaskOptions } from "@/server/repositories/execution";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const [task, options] = await Promise.all([getOwnedTask(userId, id), getTaskOptions(userId)]);
  if (!task) notFound();
  return <AppShell><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><Link href="/tasks" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Back to tasks</Link><form action={archiveTaskAction}><input type="hidden" name="taskId" value={task.id} /><button className="button-secondary" aria-label={`Archive ${task.title}`}><Archive size={15} />Archive</button></form></div><header className="mb-8 mt-6"><p className="section-kicker">Task detail</p><h1 className="mt-2 text-3xl font-medium tracking-[-0.035em]">Edit task</h1></header><TaskForm options={options} task={task} /></div></AppShell>;
}
