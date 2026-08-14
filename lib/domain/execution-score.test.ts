import { describe, expect, it } from "vitest"; import { averageEvaluable, calculateExecutionScore } from "./execution-score";
describe("execution score", () => {
  it("calculates the fully applicable weighted example", () => { const result = calculateExecutionScore({ priorityRatio: 2 / 3, plannedExecutionRatio: 90 / 120, habitRatio: 4 / 5, reviewCompleted: true }); expect(result.score).toBe(77); expect(result.components.map((x) => x.baseWeight)).toEqual([35,25,25,15]); });
  it("re-normalizes when priorities and planned work are unavailable", () => { const result = calculateExecutionScore({ habitRatio: 0.8, reviewCompleted: true }); expect(result.score).toBe(88); expect(result.components.map((x) => x.normalizedWeight)).toEqual([62.5,37.5]); });
  it("returns unavailable with no evaluable behavior", () => { expect(calculateExecutionScore({})).toEqual({ score: null, components: [] }); });
  it("caps ratios and averages only evaluable days", () => { expect(calculateExecutionScore({ plannedExecutionRatio: 2 }).score).toBe(100); expect(averageEvaluable([null,80,null,100])).toBe(90); expect(averageEvaluable([null])).toBeNull(); });
});
