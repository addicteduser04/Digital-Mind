import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getTaskOptions } from "@/server/repositories/execution";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const options = await getTaskOptions(await getCurrentUserId());
  return <AppShell><div className="mx-auto max-w-3xl"><Link href="/tasks" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Back to tasks</Link><header className="mb-8 mt-6"><p className="section-kicker">Plan</p><h1 className="mt-2 text-3xl font-medium tracking-[-0.035em]">New task</h1></header><TaskForm options={options} /></div></AppShell>;
}
