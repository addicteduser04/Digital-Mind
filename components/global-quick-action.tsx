"use client";

import { useRef, useState } from "react";
import { Inbox, ListTodo, Plus, X } from "lucide-react";
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
        </div>
      </dialog>
    </>
  );
}
