import { describe, expect, it } from "vitest";
import { assertAcyclicParent, HierarchyCycleError } from "./hierarchy";

describe("hierarchy cycle prevention", () => {
  it("allows an acyclic parent chain", async () => {
    const parents = new Map([["parent", "root"], ["root", null]]);
    await expect(assertAcyclicParent("goal", "child", "parent", async (id) => parents.get(id) ?? null)).resolves.toBeUndefined();
  });

  it("rejects direct self-parenting", async () => {
    await expect(assertAcyclicParent("task", "item", "item", async () => null)).rejects.toBeInstanceOf(HierarchyCycleError);
  });

  it("rejects an indirect cycle", async () => {
    const parents = new Map([["parent", "child"]]);
    await expect(assertAcyclicParent("goal", "child", "parent", async (id) => parents.get(id) ?? null)).rejects.toBeInstanceOf(HierarchyCycleError);
  });
});
