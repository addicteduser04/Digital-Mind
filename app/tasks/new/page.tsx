import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getTaskOptions } from "@/server/repositories/execution";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ project?: string; goal?: string; lifeArea?: string }> }) {
  const query = await searchParams;
  const options = await getTaskOptions(await getCurrentUserId());
  const project = options.projects.find((item) => item.id === query.project)?.id;
  const goal = options.goals.find((item) => item.id === query.goal)?.id;
  const lifeArea = options.lifeAreas.find((item) => item.id === query.lifeArea)?.id;
  return <AppShell><div className="mx-auto max-w-3xl"><Link href="/tasks" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Back to tasks</Link><header className="mb-8 mt-6"><p className="section-kicker">Plan</p><h1 className="mt-2 text-3xl font-medium tracking-[-0.035em]">New task</h1></header><TaskForm options={options} prefill={{ projectId: project, goalId: goal, lifeAreaId: lifeArea }} /></div></AppShell>;
}
