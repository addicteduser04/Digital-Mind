"use client";

import { useActionState } from "react";
import { saveGoalAction, saveLifeAreaAction, saveMilestoneAction, saveProjectAction, updateGoalProgressAction } from "@/app/planning-actions";
import { initialActionState } from "@/lib/action-state";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

type Option = { id: string; label: string };

export function LifeAreaForm({ area }: { area?: { id: string; name: string; description: string | null; icon: string | null; position: number; importance: number | null; satisfaction: number | null; status: string } }) {
  const [state, action] = useActionState(saveLifeAreaAction, initialActionState);
  return <form action={action} className="space-y-6">{area ? <input type="hidden" name="id" value={area.id} /> : null}<input type="hidden" name="position" value={area?.position ?? 0} />
    <Field label="Name" name="name" required defaultValue={area?.name} />
    <div className="grid gap-5 sm:grid-cols-3"><Field label="Icon" name="icon" placeholder="e.g. heart" defaultValue={area?.icon ?? ""} /><Field label="Importance (1–10)" name="importance" type="number" min="1" max="10" defaultValue={area?.importance ?? ""} /><Field label="Satisfaction (1–10)" name="satisfaction" type="number" min="1" max="10" defaultValue={area?.satisfaction ?? ""} /></div>
    <TextArea label="Description" name="description" defaultValue={area?.description ?? ""} />
    <input type="hidden" name="status" value={area?.status ?? "active"} /><FormEnd state={state} label="Save life area" />
  </form>;
}

type GoalEdit = { id: string; title: string; description: string | null; lifeAreaId: string | null; parentGoalId: string | null; level: string; measurementType: string; targetValue: string | null; currentValue: string | null; unit: string | null; startDate: string | null; deadline: string | null; status: string; priority: string; progress: string };
export function GoalForm({ goal, lifeAreas, parentGoals }: { goal?: GoalEdit; lifeAreas: Option[]; parentGoals: Option[] }) {
  const [state, action] = useActionState(saveGoalAction, initialActionState);
  return <form action={action} className="space-y-7">{goal ? <input type="hidden" name="id" value={goal.id} /> : null}
    <Field label="Goal title" name="title" required defaultValue={goal?.title} /><TextArea label="Description" name="description" defaultValue={goal?.description ?? ""} />
    <div className="grid gap-5 sm:grid-cols-2"><Select label="Life area" name="lifeAreaId" value={goal?.lifeAreaId} options={lifeAreas} /><Select label="Parent goal" name="parentGoalId" value={goal?.parentGoalId} options={parentGoals} /></div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><TextSelect label="Level" name="level" value={goal?.level ?? "general"} options={["long_term", "yearly", "quarterly", "general"]} /><TextSelect label="Measurement" name="measurementType" value={goal?.measurementType ?? "manual"} options={["binary", "numeric", "percentage", "milestone", "habit_based", "manual"]} /><TextSelect label="Priority" name="priority" value={goal?.priority ?? "medium"} options={["low", "medium", "high", "critical"]} /><TextSelect label="Status" name="status" value={goal?.status ?? "draft"} options={["draft", "active", "paused", "abandoned", "archived"]} /></div>
    <div className="grid gap-5 sm:grid-cols-3"><Field label="Target value" name="targetValue" type="number" min="0" step="any" defaultValue={goal?.targetValue ?? ""} /><Field label="Current value" name="currentValue" type="number" min="0" step="any" defaultValue={goal?.currentValue ?? ""} /><Field label="Unit" name="unit" defaultValue={goal?.unit ?? ""} /></div>
    <div className="grid gap-5 sm:grid-cols-3"><Field label="Progress (%)" name="progress" type="number" min="0" max="100" step="0.01" defaultValue={goal?.progress ?? "0"} /><Field label="Start date" name="startDate" type="date" defaultValue={goal?.startDate ?? ""} /><Field label="Deadline" name="deadline" type="date" defaultValue={goal?.deadline ?? ""} /></div>
    {goal?.measurementType === "habit_based" ? <p className="text-xs text-muted-foreground">Habit-to-goal automation is intentionally deferred; habit logs remain independent.</p> : null}<FormEnd state={state} label="Save goal" />
  </form>;
}

type ProjectEdit = { id: string; title: string; description: string | null; goalId: string | null; lifeAreaId: string | null; priority: string; status: string; startDate: string | null; deadline: string | null; progress: string };
export function ProjectForm({ project, goals, lifeAreas }: { project?: ProjectEdit; goals: Option[]; lifeAreas: Option[] }) {
  const [state, action] = useActionState(saveProjectAction, initialActionState);
  return <form action={action} className="space-y-7">{project ? <input type="hidden" name="id" value={project.id} /> : null}<Field label="Project title" name="title" required defaultValue={project?.title} /><TextArea label="Description" name="description" defaultValue={project?.description ?? ""} />
    <div className="grid gap-5 sm:grid-cols-2"><Select label="Goal" name="goalId" value={project?.goalId} options={goals} /><Select label="Life area" name="lifeAreaId" value={project?.lifeAreaId} options={lifeAreas} /></div>
    <div className="grid gap-5 sm:grid-cols-3"><TextSelect label="Priority" name="priority" value={project?.priority ?? "medium"} options={["low", "medium", "high", "critical"]} /><TextSelect label="Status" name="status" value={project?.status ?? "planned"} options={["planned", "active", "paused", "cancelled", "archived"]} /><Field label="Progress (%)" name="progress" type="number" min="0" max="100" step="0.01" defaultValue={project?.progress ?? "0"} /></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Start date" name="startDate" type="date" defaultValue={project?.startDate ?? ""} /><Field label="Deadline" name="deadline" type="date" defaultValue={project?.deadline ?? ""} /></div><FormEnd state={state} label="Save project" />
  </form>;
}

export function ProgressForm({ goal }: { goal: { id: string; progress: string; currentValue: string | null; measurementType: string; unit: string | null } }) {
  const [state, action] = useActionState(updateGoalProgressAction, initialActionState);
  return <form action={action} className="space-y-4"><input type="hidden" name="id" value={goal.id} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Progress (%)" name="progress" type="number" min="0" max="100" step="0.01" required defaultValue={goal.progress} />{goal.measurementType === "numeric" ? <Field label={`Current value${goal.unit ? ` (${goal.unit})` : ""}`} name="currentValue" type="number" min="0" step="any" defaultValue={goal.currentValue ?? ""} /> : null}</div><FormEnd state={state} label="Record progress" /></form>;
}

export function MilestoneForm({ projectId, nextPosition, milestone }: { projectId: string; nextPosition: number; milestone?: { id: string; title: string; description: string | null; deadline: string | null; position: number; status: string } }) {
  const [state, action] = useActionState(saveMilestoneAction, initialActionState);
  return <form action={action} className="space-y-4"><input type="hidden" name="projectId" value={projectId} />{milestone ? <input type="hidden" name="id" value={milestone.id} /> : null}<input type="hidden" name="position" value={milestone?.position ?? nextPosition} /><input type="hidden" name="status" value={milestone?.status ?? "pending"} /><Field label="Milestone" name="title" required defaultValue={milestone?.title} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Deadline" name="deadline" type="date" defaultValue={milestone?.deadline ?? ""} /><Field label="Notes" name="description" defaultValue={milestone?.description ?? ""} /></div><FormEnd state={state} label={milestone ? "Save milestone" : "Add milestone"} /></form>;
}

function FormEnd({ state, label }: { state: typeof initialActionState; label: string }) { return <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><ActionFeedback state={state} /><SubmitButton>{label}</SubmitButton></div>; }
function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><input className="input" id={name} name={name} {...props} /></div>; }
function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><textarea className="input min-h-24 resize-y" id={name} name={name} defaultValue={defaultValue} /></div>; }
function Select({ label, name, options, value }: { label: string; name: string; options: Option[]; value?: string | null }) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><select className="input" id={name} name={name} defaultValue={value ?? ""}><option value="">None</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>; }
function TextSelect({ label, name, options, value }: { label: string; name: string; options: string[]; value: string }) { return <div className="space-y-2"><label className="label" htmlFor={name}>{label}</label><select className="input capitalize" id={name} name={name} defaultValue={value}>{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select></div>; }
