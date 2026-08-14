"use client";

import { useActionState, useState } from "react";
import { savePrioritiesAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

export function PriorityPicker({ tasks, selected }: { tasks: { id: string; title: string }[]; selected: string[] }) {
  const [state, action] = useActionState(savePrioritiesAction, initialActionState);
  const [chosen, setChosen] = useState(selected);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        {tasks.map((task) => {
          const checked = chosen.includes(task.id);
          return <label key={task.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary/70"><input type="checkbox" name="taskIds" value={task.id} checked={checked} disabled={!checked && chosen.length >= 3} onChange={(event) => setChosen((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /><span className="min-w-0 truncate text-sm">{task.title}</span></label>;
        })}
      </div>
      <div className="flex items-center justify-between"><ActionFeedback state={state} /><SubmitButton>Save priorities</SubmitButton></div>
    </form>
  );
}
