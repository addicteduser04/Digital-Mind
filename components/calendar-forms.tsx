"use client";

import { useActionState, useState } from "react";
import { saveEventAction, saveTimeBlockAction, scheduleTaskAction } from "@/app/calendar-actions";
import { initialActionState } from "@/lib/action-state";
import { dateTimeLocalValue } from "@/lib/domain/date-time";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

type Option = { id: string; label: string };
type EventEdit = { id: string; title: string; description: string | null; location: string | null; startAt: Date; endAt: Date; allDay: number; status: string };
export function EventForm({ event, initialDate }: { event?: EventEdit; initialDate?: string }) {
  const [state, action] = useActionState(saveEventAction, initialActionState);
  const [allDay, setAllDay] = useState(Boolean(event?.allDay));
  const start = event ? dateTimeLocalValue(event.startAt) : `${initialDate ?? new Date().toISOString().slice(0, 10)}T09:00`;
  const end = event ? dateTimeLocalValue(event.endAt) : `${initialDate ?? new Date().toISOString().slice(0, 10)}T10:00`;
  const allDayEnd = event ? dateTimeLocalValue(new Date(event.endAt.getTime() - 1)).slice(0, 10) : initialDate;
  return <form action={action} className="space-y-6">{event ? <input type="hidden" name="id" value={event.id} /> : null}<input type="hidden" name="status" value={event?.status ?? "confirmed"} />
    <Field label="Event title" name="title" required defaultValue={event?.title} /><div className="grid gap-5 sm:grid-cols-2"><Field label="Location" name="location" defaultValue={event?.location ?? ""} /><label className="flex min-h-11 items-center gap-3 self-end rounded-xl border bg-card px-3.5 text-sm"><input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />All-day event</label></div>
    {allDay ? <div className="grid gap-5 sm:grid-cols-2"><Field label="Start date" name="date" type="date" required defaultValue={start.slice(0, 10)} /><Field label="End date" name="endDate" type="date" required defaultValue={allDayEnd ?? start.slice(0, 10)} /></div> : <div className="grid gap-5 sm:grid-cols-2"><Field label="Starts" name="startAt" type="datetime-local" required defaultValue={start} /><Field label="Ends" name="endAt" type="datetime-local" required defaultValue={end} /></div>}
    <TextArea label="Notes" name="description" defaultValue={event?.description ?? ""} /><FormEnd state={state} label="Save event" />
  </form>;
}

type BlockEdit = { id: string; title: string; description: string | null; taskId: string | null; projectId: string | null; goalId: string | null; lifeAreaId: string | null; startAt: Date; endAt: Date; status: string };
export function TimeBlockForm({ block, options, initialDate }: { block?: BlockEdit; options: { tasks: Option[]; projects: Option[]; goals: Option[]; lifeAreas: Option[] }; initialDate?: string }) {
  const [state, action] = useActionState(saveTimeBlockAction, initialActionState); const day = initialDate ?? new Date().toISOString().slice(0, 10);
  return <form action={action} className="space-y-6">{block ? <input type="hidden" name="id" value={block.id} /> : null}<input type="hidden" name="status" value={block?.status ?? "planned"} />
    <Field label="Block title" name="title" required defaultValue={block?.title} /><div className="grid gap-5 sm:grid-cols-2"><Field label="Starts" name="startAt" type="datetime-local" required defaultValue={block ? dateTimeLocalValue(block.startAt) : `${day}T09:00`} /><Field label="Ends" name="endAt" type="datetime-local" required defaultValue={block ? dateTimeLocalValue(block.endAt) : `${day}T10:00`} /></div>
    <div><p className="form-section-title">Optional context</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><Select label="Task" name="taskId" value={block?.taskId} options={options.tasks} /><Select label="Project" name="projectId" value={block?.projectId} options={options.projects} /><Select label="Goal" name="goalId" value={block?.goalId} options={options.goals} /><Select label="Life area" name="lifeAreaId" value={block?.lifeAreaId} options={options.lifeAreas} /></div></div>
    <TextArea label="Intention / notes" name="description" defaultValue={block?.description ?? ""} /><FormEnd state={state} label="Save time block" />
  </form>;
}

export function ScheduleTaskForm({ task, initialDate }: { task: { id: string; title: string; scheduledStart: Date | null; scheduledEnd: Date | null; estimatedMinutes: number | null; dueDate: string | null }; initialDate?: string }) {
  const [state, action] = useActionState(scheduleTaskAction, initialActionState); const day = initialDate ?? new Date().toISOString().slice(0, 10); const start = task.scheduledStart ? dateTimeLocalValue(task.scheduledStart) : `${day}T09:00`; const inferredEnd = new Date(new Date(`${start}:00`).getTime() + (task.estimatedMinutes ?? 60) * 60_000); const end = task.scheduledEnd ? dateTimeLocalValue(task.scheduledEnd) : `${start.slice(0, 11)}${String(inferredEnd.getHours()).padStart(2, "0")}:${String(inferredEnd.getMinutes()).padStart(2, "0")}`;
  return <form action={action} className="space-y-6"><input type="hidden" name="id" value={task.id} /><div className="rounded-xl border bg-secondary/50 p-4"><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">Estimate: {task.estimatedMinutes ? `${task.estimatedMinutes} min` : "none"} · Due: {task.dueDate ?? "none"}</p></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Scheduled start" name="startAt" type="datetime-local" required defaultValue={start} /><Field label="Scheduled end" name="endAt" type="datetime-local" required defaultValue={end} /></div><p className="text-xs leading-5 text-muted-foreground">Scheduling does not change the estimate, due date, or actual time.</p><FormEnd state={state} label="Save schedule" />{task.scheduledStart ? <button type="submit" formNoValidate onClick={(event) => { const form = event.currentTarget.form!; (form.elements.namedItem("startAt") as HTMLInputElement).value = ""; (form.elements.namedItem("endAt") as HTMLInputElement).value = ""; }} className="button-secondary">Remove schedule</button> : null}</form>;
}

function FormEnd({ state, label }: { state: typeof initialActionState; label: string }) { return <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><ActionFeedback state={state} /><SubmitButton>{label}</SubmitButton></div>; }
function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><input className="input" id={name} name={name} {...props} /></div>; }
function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><textarea className="input min-h-24 resize-y" id={name} name={name} defaultValue={defaultValue} /></div>; }
function Select({ label, name, options, value }: { label: string; name: string; options: Option[]; value?: string | null }) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><select className="input" id={name} name={name} defaultValue={value ?? ""}><option value="">None</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>; }
