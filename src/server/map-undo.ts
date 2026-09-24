import type {
  MapDraft,
  MapState,
  ObjectType,
  RelationshipType,
  SaveReceipt,
} from '../shared/map.js';
import { proposedObjectTypes, proposedRelationshipTypes } from '../shared/map.js';
import { MapError } from './map-error.js';
import type { mapTombstones } from './map-tombstones.js';
import { inverseChange } from './undo-facts.js';

export function undoSave(
  state: MapState,
  receipt: SaveReceipt,
  tombstones: ReturnType<typeof mapTombstones>,
  retainedTypes: ObjectType[],
  retainedEdgeTypes: RelationshipType[],
): MapDraft {
  const draft = structuredClone(state.draft);
  for (const saved of receipt.objectTypes ?? []) {
    const current = state.types.find((type) => type.id === saved.id) ?? null;
    const own = draft.objectTypes?.find((change) => change.id === saved.id);
    const change = inverseChange('objectType', saved, current, own);
    if (!change) continue;
    const restoreRevision =
      !current && change.after ? tombstones.revision('objectType', saved.id) : undefined;
    if (change.after)
      change.after = { ...change.after, revision: (current?.revision ?? restoreRevision ?? 0) + 1 };
    draft.objectTypes = [
      ...(draft.objectTypes ?? []).filter((item) => item.id !== saved.id),
      {
        ...change,
        id: saved.id,
        undo: true,
        ...(restoreRevision !== undefined ? { restoreRevision } : {}),
      },
    ];
  }
  for (const saved of receipt.relationshipTypes ?? []) {
    const current = state.relationshipTypes.find((type) => type.id === saved.id) ?? null;
    const own = draft.relationshipTypes?.find((change) => change.id === saved.id);
    const change = inverseChange('relationshipType', saved, current, own);
    if (!change) continue;
    const restoreRevision =
      !current && change.after ? tombstones.revision('relationshipType', saved.id) : undefined;
    if (change.after)
      change.after = { ...change.after, revision: (current?.revision ?? restoreRevision ?? 0) + 1 };
    draft.relationshipTypes = [
      ...(draft.relationshipTypes ?? []).filter((item) => item.id !== saved.id),
      {
        ...change,
        id: saved.id,
        undo: true,
        ...(restoreRevision !== undefined ? { restoreRevision } : {}),
      },
    ];
  }
  const types = proposedObjectTypes(state.types, draft.objectTypes);
  const edgeTypes = proposedRelationshipTypes(state.relationshipTypes, draft.relationshipTypes);
  for (const saved of receipt.changes) {
    const id = saved.after?.id ?? saved.before?.id;
    if (!id) throw new MapError('undo_unavailable');
    const current = state.objects.find((item) => item.id === id) ?? null;
    const own = draft.changes.find((item) => item.id === id);
    const change = inverseChange('object', saved, current, own);
    if (!change) continue;
    const typeId = change.after?.typeId ?? current?.typeId ?? saved.type.id;
    let type =
      types.find((item) => item.id === typeId) ?? retainedTypes.find((item) => item.id === typeId);
    if (!type) throw new MapError('undo_unavailable');
    if (change.after && !types.some((item) => item.id === typeId)) {
      if (draft.objectTypes?.some((item) => item.id === typeId))
        throw new MapError('undo_draft_overlap');
      const restoreRevision = tombstones.revision('objectType', typeId);
      type = { ...type, revision: restoreRevision + 1 };
      draft.objectTypes = [
        ...(draft.objectTypes ?? []),
        { id: typeId, before: null, after: type, restoreRevision },
      ];
      types.push(type);
    }
    draft.changes = [
      ...draft.changes.filter((item) => item.id !== id),
      {
        ...change,
        id,
        type,
        undo: true,
        ...(!current && change.after ? { restoreRevision: tombstones.revision('object', id) } : {}),
      },
    ];
  }
  for (const saved of receipt.relationships ?? []) {
    const current = state.relationships.find((item) => item.id === saved.id) ?? null;
    const own = draft.relationships?.find((item) => item.id === saved.id);
    const change = inverseChange('relationship', saved, current, own);
    if (!change) continue;
    const typeId = change.after?.typeId ?? current?.typeId ?? saved.type.id;
    let type =
      edgeTypes.find((item) => item.id === typeId) ??
      retainedEdgeTypes.find((item) => item.id === typeId);
    if (!type) throw new MapError('undo_unavailable');
    if (change.after && !edgeTypes.some((item) => item.id === typeId)) {
      if (draft.relationshipTypes?.some((item) => item.id === typeId))
        throw new MapError('undo_draft_overlap');
      const restoreRevision = tombstones.revision('relationshipType', typeId);
      type = { ...type, revision: restoreRevision + 1 };
      draft.relationshipTypes = [
        ...(draft.relationshipTypes ?? []),
        { id: typeId, before: null, after: type, restoreRevision },
      ];
      edgeTypes.push(type);
    }
    draft.relationships = [
      ...(draft.relationships ?? []).filter((item) => item.id !== saved.id),
      {
        ...change,
        id: saved.id,
        type,
        undo: true,
        objectNames: saved.objectNames,
        ...(!current && change.after
          ? { restoreRevision: tombstones.revision('relationship', saved.id) }
          : {}),
      },
    ];
  }
  for (const change of draft.changes) {
    if (
      !change.after &&
      state.draft.relationships?.some(
        (own) =>
          own.after && (own.after.sourceId === change.id || own.after.targetId === change.id),
      )
    )
      throw new MapError('undo_draft_overlap');
  }
  for (const change of draft.relationships ?? []) {
    if (
      change.after &&
      state.draft.changes.some(
        (own) =>
          !own.after && (own.id === change.after?.sourceId || own.id === change.after?.targetId),
      )
    )
      throw new MapError('undo_draft_overlap');
  }
  return { ...draft, version: draft.version + 1 };
}
