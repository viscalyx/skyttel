import type { MapDraft, MapState } from './map.js';
import { proposedRelationships } from './map.js';

/** Stage only the consequences visible at this explicit review boundary. */
export function stageTypeRemoval(
  state: MapState,
  draft: MapDraft,
  kind: 'objectType' | 'relationshipType',
  id: string,
) {
  if (kind === 'objectType') {
    const objects = new Map(state.objects.map((object) => [object.id, object]));
    for (const change of draft.changes) {
      if (change.after)
        objects.set(change.id, {
          ...change.after,
          id: change.id,
          householdId: state.types[0]?.householdId ?? '',
          revision: change.before?.revision ?? 0,
        });
      else objects.delete(change.id);
    }
    for (const object of objects.values()) {
      if (object.typeId !== id) continue;
      const existing = draft.changes.find((change) => change.id === object.id);
      const before = existing ? existing.before : object;
      draft.changes = draft.changes.filter((change) => change.id !== object.id);
      draft.changes.push({
        id: object.id,
        before,
        after: null,
        type: state.types.find((type) => type.id === before?.typeId) ?? existing!.type,
        removedWithTypes: [id],
        ...(existing ? { suppressed: structuredClone(existing) } : {}),
      });
    }
  }
  const removedObjects = new Set(
    draft.changes.filter((change) => !change.after).map((change) => change.id),
  );
  const effective = proposedRelationships(state.relationships, draft.relationships);
  const suppressed = (draft.relationships ?? []).flatMap((change) =>
    change.suppressed?.after ? [{ ...change.suppressed.after, id: change.id }] : [],
  );
  for (const edge of [...state.relationships, ...effective.values(), ...suppressed]) {
    const existing = draft.relationships?.find((change) => change.id === edge.id);
    const value = existing?.suppressed?.after ?? existing?.after ?? edge;
    const objectCauses = [edge.sourceId, edge.targetId, value.sourceId, value.targetId].filter(
      (id) => removedObjects.has(id),
    );
    const typeCause = kind === 'relationshipType' && value.typeId === id;
    if (!objectCauses.length && !typeCause) continue;
    if (existing && !existing.after) {
      if (!existing.removedWithObjects && !existing.removedWithTypes) continue;
      existing.removedWithObjects = [
        ...new Set([...(existing.removedWithObjects ?? []), ...objectCauses]),
      ];
      if (typeCause)
        existing.removedWithTypes = [...new Set([...(existing.removedWithTypes ?? []), id])];
      continue;
    }
    const before = existing
      ? existing.before
      : (state.relationships.find((value) => value.id === edge.id) ?? null);
    draft.relationships ??= [];
    draft.relationships = draft.relationships.filter((change) => change.id !== edge.id);
    draft.relationships.push({
      id: edge.id,
      before,
      after: null,
      type: state.relationshipTypes.find((type) => type.id === before?.typeId) ?? existing!.type,
      objectNames:
        existing?.objectNames ??
        Object.fromEntries(state.objects.map((object) => [object.id, object.name])),
      ...(objectCauses.length ? { removedWithObjects: [...new Set(objectCauses)] } : {}),
      ...(typeCause ? { removedWithTypes: [id] } : {}),
      ...(existing ? { suppressed: structuredClone(existing) } : {}),
    });
  }
}

/** Cancellation restores the original proposal only after its last cause disappears. */
export function reconcileTypeRemovals(draft: MapDraft) {
  const objectTypes = new Set(
    draft.objectTypes?.filter((change) => !change.after).map((change) => change.id),
  );
  draft.changes = draft.changes.flatMap((change) => {
    if (!change.removedWithTypes) return [change];
    change.removedWithTypes = change.removedWithTypes.filter((id) => objectTypes.has(id));
    return change.removedWithTypes.length ? [change] : change.suppressed ? [change.suppressed] : [];
  });
  const edgeTypes = new Set(
    draft.relationshipTypes?.filter((change) => !change.after).map((change) => change.id),
  );
  const objects = new Set(
    draft.changes.filter((change) => !change.after).map((change) => change.id),
  );
  draft.relationships = draft.relationships?.flatMap((change) => {
    if (!change.removedWithTypes && !change.removedWithObjects) return [change];
    if (change.removedWithTypes)
      change.removedWithTypes = change.removedWithTypes.filter((id) => edgeTypes.has(id));
    if (change.removedWithObjects)
      change.removedWithObjects = change.removedWithObjects.filter((id) => objects.has(id));
    if (!change.removedWithTypes?.length) delete change.removedWithTypes;
    if (!change.removedWithObjects?.length) delete change.removedWithObjects;
    return change.removedWithTypes?.length || change.removedWithObjects?.length
      ? [change]
      : change.suppressed
        ? [change.suppressed]
        : [];
  });
}
