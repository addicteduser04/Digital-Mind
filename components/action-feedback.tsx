import type { ActionState } from "@/lib/action-state";

export function ActionFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return <p role="status" className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>;
}
