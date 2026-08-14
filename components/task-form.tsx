"use client";

import { useActionState } from "react";
import { createTaskAction, updateTaskAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";
import { dateTimeLocalValue } from "@/lib/domain/date-time";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

type Options = {
  projects: { id: string; title: string }[];
  goals: { id: string; title: string }[];
  lifeAreas: { id: string; name: string }[];
};

type EditableTask = {
  id: string; title: string; description: string | null; status: string; priority: string; commitmentLevel: string;
  dueDate: string | null; scheduledStart: Date | null; scheduledEnd: Date | null; estimatedMinutes: number | null;
  completedAt: Date | null;
  projectId: string | null; goalId: string | null; lifeAreaId: string | null;
};

export function TaskForm({ options, task, prefill }: { options: Options; task?: EditableTask; prefill?: { projectId?: string; goalId?: string; lifeAreaId?: string } }) {
  const [state, action] = useActionState(task ? updateTaskAction : createTaskAction, initialActionState);
  const error = (name: string) => state.errors?.[name]?.[0];
  return (
    <form action={action} className="space-y-7">
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      {task?.completedAt ? <input type="hidden" name="completedAt" value={task.completedAt.toISOString()} /> : null}
      <div className="space-y-2">
        <label className="label" htmlFor="title">Task title</label>
        <input className="input" id="title" name="title" required maxLength={300} defaultValue={task?.title} aria-describedby={error("title") ? "title-error" : undefined} />
        {error("title") ? <p id="title-error" className="field-error">{error("title")}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="label" htmlFor="description">Notes <span className="label-optional">Optional</span></label>
        <textarea className="input min-h-24 resize-y" id="description" name="description" maxLength={10_000} defaultValue={task?.description ?? ""} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Select label="Priority" name="priority" defaultValue={task?.priority ?? "medium"} options={["low", "medium", "high", "critical"]} />
        <Select label="Commitment" name="commitmentLevel" defaultValue={task?.commitmentLevel ?? "should"} options={["must", "should", "could"]} />
        <Select label="Status" name="status" defaultValue={task?.status ?? "todo"} options={["todo", "scheduled", "in_progress", ...(task?.status === "completed" ? ["completed"] : []), "cancelled", "archived"]} />
      </div>
      <div>
        <h2 className="form-section-title">Timing</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Due date" name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} />
          <Field label="Estimate (minutes)" name="estimatedMinutes" type="number" min="0" step="1" defaultValue={task?.estimatedMinutes?.toString() ?? ""} />
          <Field label="Scheduled start" name="scheduledStart" type="datetime-local" defaultValue={dateTimeLocalValue(task?.scheduledStart ?? null)} />
          <Field label="Scheduled end" name="scheduledEnd" type="datetime-local" defaultValue={dateTimeLocalValue(task?.scheduledEnd ?? null)} />
        </div>
      </div>
      <div>
        <h2 className="form-section-title">Life context</h2>
        <p className="mt-1 text-xs text-muted-foreground">Connect this task only where it adds useful context.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <OwnedSelect label="Project" name="projectId" value={task?.projectId ?? prefill?.projectId} options={options.projects.map(({ id, title }) => ({ id, label: title }))} />
          <OwnedSelect label="Goal" name="goalId" value={task?.goalId ?? prefill?.goalId} options={options.goals.map(({ id, title }) => ({ id, label: title }))} />
          <OwnedSelect label="Life area" name="lifeAreaId" value={task?.lifeAreaId ?? prefill?.lifeAreaId} options={options.lifeAreas.map(({ id, name }) => ({ id, label: name }))} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ActionFeedback state={state} /><SubmitButton>{task ? "Save changes" : "Create task"}</SubmitButton>
      </div>
    </form>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><input className="input" id={name} name={name} {...props} /></div>;
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue: string }) {
  return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><select className="input capitalize" id={name} name={name} defaultValue={defaultValue}>{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select></div>;
}

function OwnedSelect({ label, name, options, value }: { label: string; name: string; options: { id: string; label: string }[]; value?: string | null }) {
  return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><select className="input" id={name} name={name} defaultValue={value ?? ""}><option value="">None</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>;
}
