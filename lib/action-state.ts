export type ActionState = { status: "idle" | "success" | "error"; message?: string; errors?: Record<string, string[]> };
export const initialActionState: ActionState = { status: "idle" };
