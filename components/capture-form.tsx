"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { captureInboxAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function CaptureForm({ dark = false }: { dark?: boolean }) {
  const [state, action] = useActionState(captureInboxAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const captureId = useId();
  useEffect(() => { if (state.status === "success") formRef.current?.reset(); }, [state.status]);
  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={captureId}>Quick capture</label>
        <input id={captureId} name="content" required maxLength={10_000} placeholder="What’s on your mind?" className={dark ? "input border-white/10 bg-white/[0.06] text-white placeholder:text-white/40" : "input"} />
        <SubmitButton className={dark ? "grid size-11 shrink-0 place-items-center rounded-xl bg-white text-ink disabled:opacity-50" : "button-icon"}><ArrowUp size={17} /><span className="sr-only">Capture</span></SubmitButton>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
