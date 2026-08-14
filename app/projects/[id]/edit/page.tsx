import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProjectForm } from "@/components/planning-forms";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getGoalOptions, getProjectDetail } from "@/server/repositories/planning";
export const dynamic = "force-dynamic";
export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const userId = await getCurrentUserId(); const [detail, options] = await Promise.all([getProjectDetail(userId, id), getGoalOptions(userId)]); if (!detail) notFound(); return <AppShell><div className="mx-auto max-w-4xl"><h1 className="mb-8 text-3xl font-medium tracking-tight">Edit project</h1><ProjectForm project={detail.project} goals={options.goals.map((x) => ({ id: x.id, label: x.title }))} lifeAreas={options.lifeAreas.map((x) => ({ id: x.id, label: x.name }))} /></div></AppShell>; }
