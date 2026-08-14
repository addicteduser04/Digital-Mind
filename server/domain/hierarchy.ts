export class HierarchyCycleError extends Error {
  constructor(entity: "goal" | "task") {
    super(`The ${entity} hierarchy cannot contain a cycle.`);
    this.name = "HierarchyCycleError";
  }
}

export async function assertAcyclicParent(
  entity: "goal" | "task",
  itemId: string,
  proposedParentId: string | null | undefined,
  getParentId: (id: string) => Promise<string | null>
) {
  if (!proposedParentId) return;

  const visited = new Set([itemId]);
  let cursor: string | null = proposedParentId;

  while (cursor) {
    if (visited.has(cursor)) throw new HierarchyCycleError(entity);
    visited.add(cursor);
    cursor = await getParentId(cursor);
  }
}
