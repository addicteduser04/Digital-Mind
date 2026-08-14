import type { Metadata } from "next";
import { Archive, ArrowRight, Inbox as InboxIcon } from "lucide-react";
import { archiveInboxAction, convertInboxAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { CaptureForm } from "@/components/capture-form";
import { getCurrentUserId } from "@/server/auth/current-user";
import { listInbox } from "@/server/repositories/execution";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const items = await listInbox(await getCurrentUserId());
  const unprocessed = items.filter((item) => item.status === "unprocessed");
  const history = items.filter((item) => item.status !== "unprocessed");
  return <AppShell>
    <header className="border-b border-border pb-8"><p className="section-kicker">Quick capture</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.04em]">Inbox</h1><p className="mt-2 text-sm text-muted-foreground">Capture without deciding. Process when you are ready.</p><div className="mt-6 max-w-xl"><CaptureForm /></div></header>
    <div className="mt-9 max-w-3xl">
      <div className="flex items-end justify-between"><div><p className="section-kicker">Unprocessed</p><h2 className="section-title">Needs a decision</h2></div><span className="font-mono text-xs text-muted-foreground">{unprocessed.length}</span></div>
      <div className="mt-4 border-t border-border">{unprocessed.length ? unprocessed.map((item) => <article key={item.id} className="flex items-start gap-3 border-b border-border py-4"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary"><InboxIcon size={15} /></span><div className="min-w-0 flex-1"><p className="text-sm leading-5">{item.content}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(item.createdAt)}</p></div><div className="flex gap-1"><form action={convertInboxAction}><input type="hidden" name="inboxId" value={item.id} /><button className="button-secondary" aria-label={`Convert ${item.content} to a task`}>Task <ArrowRight size={14} /></button></form><form action={archiveInboxAction}><input type="hidden" name="inboxId" value={item.id} /><button className="button-icon-quiet" aria-label={`Archive ${item.content}`}><Archive size={15} /></button></form></div></article>) : <div className="py-16 text-center"><p className="text-sm font-medium">Your inbox is clear.</p><p className="mt-1 text-xs text-muted-foreground">New captures will appear here.</p></div>}</div>
      {history.length ? <details className="mt-8"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Processed history ({history.length})</summary><div className="mt-3 divide-y divide-border border-y border-border">{history.map((item) => <div key={item.id} className="flex items-center justify-between py-3 text-sm text-muted-foreground"><span className="truncate">{item.content}</span><span className="ml-4 text-[10px] uppercase tracking-wide">{item.status}</span></div>)}</div></details> : null}
    </div>
  </AppShell>;
}
