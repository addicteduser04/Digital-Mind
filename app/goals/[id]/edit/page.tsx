import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GoalForm } from "@/components/planning-forms";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getGoalDetail, getGoalOptions } from "@/server/repositories/planning";
export const dynamic = "force-dynamic";
export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const userId = await getCurrentUserId(); const [detail, options] = await Promise.all([getGoalDetail(userId, id), getGoalOptions(userId, id)]); if (!detail) notFound(); return <AppShell><div className="mx-auto max-w-4xl"><h1 className="mb-8 text-3xl font-medium tracking-tight">Edit goal</h1><GoalForm goal={detail.goal} lifeAreas={options.lifeAreas.map((x) => ({ id: x.id, label: x.name }))} parentGoals={options.goals.map((x) => ({ id: x.id, label: x.title }))} /></div></AppShell>; }
