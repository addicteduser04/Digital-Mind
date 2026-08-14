import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LifeAreaForm } from "@/components/planning-forms";
export default function NewLifeAreaPage() { return <AppShell><div className="mx-auto max-w-2xl"><Link href="/life" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Back to life areas</Link><h1 className="mb-8 mt-6 text-3xl font-medium tracking-tight">New life area</h1><LifeAreaForm /></div></AppShell>; }
