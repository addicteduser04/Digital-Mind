"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Inbox, ListTodo, Plus, Repeat2, Square, Timer, X } from "lucide-react";
import { CaptureForm } from "./capture-form";
import { QuickCreateForm } from "./quick-create-form";

export function GlobalQuickAction() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"task" | "capture">("task");
  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="flex flex-col items-center justify-center gap-1 text-[11px]" aria-label="Open quick actions">
        <span className="grid size-12 -translate-y-3 place-items-center rounded-full bg-foreground text-background shadow-lg"><Plus size={21} /></span><span className="-translate-y-2">Add</span>
      </button>
      <dialog ref={dialogRef} className="modal bottom-0 mt-auto w-full max-w-lg rounded-t-3xl p-0 backdrop:bg-black/35 sm:bottom-auto sm:my-auto sm:rounded-2xl">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-medium tracking-tight">Quick action</h2><button className="button-icon-quiet" onClick={() => dialogRef.current?.close()} aria-label="Close quick actions"><X size={18} /></button></div>
          <div className="mt-5 grid grid-cols-2 gap-2" role="tablist" aria-label="Quick action type">
            <button type="button" role="tab" aria-selected={mode === "task"} onClick={() => setMode("task")} className={`choice-button ${mode === "task" ? "choice-button-active" : ""}`}><ListTodo size={16} />New task</button>
            <button type="button" role="tab" aria-selected={mode === "capture"} onClick={() => setMode("capture")} className={`choice-button ${mode === "capture" ? "choice-button-active" : ""}`}><Inbox size={16} />Quick capture</button>
          </div>
          <div className="mt-5">{mode === "task" ? <QuickCreateForm /> : <CaptureForm />}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground"><Link href="/calendar/events/new" className="rounded-lg p-2 hover:bg-secondary"><CalendarDays className="mx-auto mb-1" size={15} />Event</Link><Link href="/calendar/blocks/new" className="rounded-lg p-2 hover:bg-secondary"><Square className="mx-auto mb-1" size={15} />Time block</Link><Link href="/habits/new" className="rounded-lg p-2 hover:bg-secondary"><Repeat2 className="mx-auto mb-1" size={15} />Habit</Link><Link href="/focus" className="rounded-lg p-2 hover:bg-secondary"><Timer className="mx-auto mb-1" size={15} />Focus</Link><Link href="/focus/manual" className="rounded-lg p-2 hover:bg-secondary"><Timer className="mx-auto mb-1" size={15} />Manual</Link><Link href="/inbox" className="rounded-lg p-2 hover:bg-secondary"><Inbox className="mx-auto mb-1" size={15} />Inbox</Link></div>
        </div>
      </dialog>
    </>
  );
}
