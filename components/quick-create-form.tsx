"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Plus } from "lucide-react";
import { quickCreateTaskAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function QuickCreateForm() {
  const [state, action] = useActionState(quickCreateTaskAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  useEffect(() => { if (state.status === "success") formRef.current?.reset(); }, [state.status]);
  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={titleId}>Task title</label>
        <input id={titleId} name="title" required maxLength={300} placeholder="Add a task…" className="input min-w-0 flex-1" />
        <SubmitButton className="button-icon" ><Plus size={18} /><span className="sr-only">Add task</span></SubmitButton>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
