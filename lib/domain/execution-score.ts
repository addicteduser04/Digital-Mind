export type ScoreInput = { priorityRatio?: number; plannedExecutionRatio?: number; habitRatio?: number; reviewCompleted?: boolean };
export type ScoreComponent = { key: "priorities" | "planned" | "habits" | "review"; label: string; ratio: number; baseWeight: number; normalizedWeight: number; points: number };
const definitions = [
  { key: "priorities", label: "Priority commitments", weight: 35 },
  { key: "planned", label: "Planned execution", weight: 25 },
  { key: "habits", label: "Habits", weight: 25 },
  { key: "review", label: "Daily review", weight: 15 }
] as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function calculateExecutionScore(input: ScoreInput) {
  const values = { priorities: input.priorityRatio, planned: input.plannedExecutionRatio, habits: input.habitRatio, review: input.reviewCompleted === undefined ? undefined : input.reviewCompleted ? 1 : 0 };
  const available = definitions.filter((item) => values[item.key] !== undefined); const totalWeight = available.reduce((sum, item) => sum + item.weight, 0); if (!totalWeight) return { score: null, components: [] as ScoreComponent[] };
  const components: ScoreComponent[] = available.map((item) => { const normalizedWeight = item.weight / totalWeight * 100; const ratio = clamp(values[item.key]!); return { key: item.key, label: item.label, ratio, baseWeight: item.weight, normalizedWeight, points: ratio * normalizedWeight }; });
  return { score: Math.round(components.reduce((sum, item) => sum + item.points, 0)), components };
}

export function averageEvaluable(scores: Array<number | null>) { const values = scores.filter((score): score is number => score !== null); return values.length ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length) : null; }
