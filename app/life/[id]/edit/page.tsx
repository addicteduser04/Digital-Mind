import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LifeAreaForm } from "@/components/planning-forms";
import { getCurrentUserId } from "@/server/auth/current-user";
import { getLifeAreaDetail } from "@/server/repositories/planning";
export const dynamic = "force-dynamic";
export default async function EditLifeAreaPage({ params }: { params: Promise<{ id: string }> }) { const detail = await getLifeAreaDetail(await getCurrentUserId(), (await params).id); if (!detail) notFound(); return <AppShell><div className="mx-auto max-w-2xl"><h1 className="mb-8 text-3xl font-medium tracking-tight">Edit life area</h1><LifeAreaForm area={detail.area} /></div></AppShell>; }
