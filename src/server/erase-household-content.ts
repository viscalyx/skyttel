import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import type {
  DraftChange,
  DraftRelationshipChange,
  MapObject,
  MapRelationship,
  ObjectMerge,
  RelationshipChange,
  SaveReceipt,
} from '../shared/map.js';
import { type ErasureScope, erasureContent, erasurePredicates } from './erasure-content.js';

// Call inside the maintenance owner's immediate transaction. Only documented
// typed paths are references; arbitrary field names and text remain ordinary data.
export function eraseHouseholdContent(
  database: Database.Database,
  householdId: string,
  actorId: string,
  scope: ErasureScope,
) {
  const content = erasureContent(database, householdId, actorId);
  const affected = erasurePredicates(scope);
  const names = (value: Record<string, string> | undefined) =>
    value && Object.fromEntries(Object.entries(value).filter(([id]) => !affected.objects.has(id)));
  function cleanEdge<T extends RelationshipChange>(change: T): T {
    return { ...change, ...(change.objectNames ? { objectNames: names(change.objectNames) } : {}) };
  }
  function cleanMerge<
    T extends
      | NonNullable<DraftChange['merge']>
      | NonNullable<SaveReceipt['changes'][number]['merge']>,
  >(merge: T): T {
    const result = {
      ...merge,
      relationships: merge.relationships.filter(
        (edge) => !affected.relationships.has(edge.id) && !affected.edgeValue(edge),
      ),
      relationshipTypes: merge.relationshipTypes.filter(
        (type) => !affected.relationshipTypes.has(type.id),
      ),
      objectNames: names(merge.objectNames) ?? {},
    };
    if ('previousChanges' in result) {
      const draftMerge = result as ObjectMerge;
      draftMerge.previousChanges = draftMerge.previousChanges.flatMap(cleanDraftObject);
      draftMerge.previousRelationships = draftMerge.previousRelationships.flatMap(cleanDraftEdge);
    }
    return result;
  }
  const objectMeaning = (value: MapObject) => ({
    typeId: value.typeId,
    customValues: value.customValues,
  });
  const edgeMeaning = (value: MapRelationship) => ({
    typeId: value.typeId,
    sourceId: value.sourceId,
    targetId: value.targetId,
    knowledge: value.knowledge,
  });
  const facts = (value: object) =>
    Object.fromEntries(
      Object.entries(value).filter(
        ([key, item]) =>
          !['id', 'householdId', 'revision', 'deleted'].includes(key) && item !== undefined,
      ),
    );
  function cleanDraftObject(change: DraftChange): DraftChange[] {
    if (affected.objects.has(change.id)) return [];
    let next = { ...change };
    if (affected.objectChange(change)) {
      const current = content.objects.find((object) => object.id === change.id);
      if (
        !current ||
        affected.objectValue(current) ||
        !change.before ||
        !change.after ||
        change.merge
      )
        return [];
      const type = content.allTypes.get(current.typeId);
      if (!type) return [];
      // Remove only erased type/custom meaning. Original expected/proposed
      // independent facts and revision remain, so newer edits still conflict.
      next = {
        ...change,
        before: { ...change.before, ...objectMeaning(current) },
        after: { ...change.after, ...objectMeaning(current) },
        type,
      };
      delete next.beforeType;
      if (next.undoFields)
        next.undoFields = next.undoFields.filter(
          (key) => key !== 'objectMeaning' && key !== 'typeId' && !key.startsWith('customValues:'),
        );
      if (isDeepStrictEqual(facts(next.before as MapObject), facts(next.after as object)))
        return [];
    }
    if (next.merge) next.merge = cleanMerge(next.merge);
    return [next];
  }
  function cleanDraftEdge(change: DraftRelationshipChange): DraftRelationshipChange[] {
    if (affected.relationships.has(change.id)) return [];
    let next = cleanEdge(change);
    if (affected.edgeChange(change)) {
      const current = content.relationships.find((edge) => edge.id === change.id);
      if (!current || affected.edgeValue(current) || !change.before || !change.after) return [];
      const type = content.allEdgeTypes.get(current.typeId);
      if (!type) return [];
      next = {
        ...next,
        before: { ...change.before, ...edgeMeaning(current) },
        after: { ...change.after, ...edgeMeaning(current) },
        type,
      };
      if (next.undoFields) next.undoFields = next.undoFields.filter((key) => key !== 'meaning');
      if (isDeepStrictEqual(facts(next.before as MapRelationship), facts(next.after as object)))
        return [];
    }
    if (next.removedWithObjects)
      next.removedWithObjects = next.removedWithObjects.filter((id) => !affected.objects.has(id));
    return [next];
  }
  for (const draft of content.drafts) {
    const next = {
      changes: draft.changes.flatMap(cleanDraftObject),
      relationships: draft.relationships.flatMap(cleanDraftEdge),
      objectTypes: draft.objectTypes.filter((change) => !affected.objectTypes.has(change.id)),
      relationshipTypes: draft.relationshipTypes.filter(
        (change) => !affected.relationshipTypes.has(change.id),
      ),
    };
    if (
      !['changes', 'relationships', 'objectTypes', 'relationshipTypes'].every((key) =>
        isDeepStrictEqual(draft[key as keyof typeof next], next[key as keyof typeof next]),
      )
    )
      database
        .prepare(
          'UPDATE map_draft SET version = version + 1, changes = ?, relationships = ?, objectTypes = ?, relationshipTypes = ? WHERE householdId = ? AND userId = ?',
        )
        .run(
          JSON.stringify(next.changes),
          JSON.stringify(next.relationships),
          JSON.stringify(next.objectTypes),
          JSON.stringify(next.relationshipTypes),
          householdId,
          draft.userId,
        );
  }
  for (const saved of content.saves) {
    const receipt: SaveReceipt = {
      ...saved.receipt,
      changes: saved.receipt.changes
        .filter((change) => !affected.objectChange(change))
        .map((change) => ({
          ...change,
          ...(change.merge ? { merge: cleanMerge(change.merge) } : {}),
        })),
      ...(saved.receipt.relationships
        ? {
            relationships: saved.receipt.relationships
              .filter((change) => !affected.edgeChange(change))
              .map(cleanEdge),
          }
        : {}),
      ...(saved.receipt.objectTypes
        ? {
            objectTypes: saved.receipt.objectTypes.filter(
              (change) => !affected.objectTypes.has(change.id),
            ),
          }
        : {}),
      ...(saved.receipt.relationshipTypes
        ? {
            relationshipTypes: saved.receipt.relationshipTypes.filter(
              (change) => !affected.relationshipTypes.has(change.id),
            ),
          }
        : {}),
    };
    if (
      !receipt.changes.length &&
      !receipt.relationships?.length &&
      !receipt.objectTypes?.length &&
      !receipt.relationshipTypes?.length
    ) {
      database
        .prepare('DELETE FROM map_save WHERE householdId = ? AND userId = ? AND operationId = ?')
        .run(householdId, saved.userId, saved.operationId);
      database
        .prepare(
          'DELETE FROM historical_operation WHERE householdId = ? AND userId = ? AND operationId = ?',
        )
        .run(householdId, saved.userId, saved.operationId);
    } else if (!isDeepStrictEqual(receipt, saved.receipt)) {
      database
        .prepare(
          'UPDATE map_save SET receipt = ? WHERE householdId = ? AND userId = ? AND operationId = ?',
        )
        .run(JSON.stringify(receipt), householdId, saved.userId, saved.operationId);
      database
        .prepare(
          'UPDATE historical_operation SET draftHash = NULL WHERE householdId = ? AND userId = ? AND operationId = ?',
        )
        .run(householdId, saved.userId, saved.operationId);
    }
  }
  for (const historical of content.history) {
    const changes = historical.changes
      .filter((change) => !affected.objectChange(change))
      .map((change) => ({
        ...change,
        ...(change.merge ? { merge: cleanMerge(change.merge) } : {}),
      }));
    const receipt = database
      .prepare('SELECT 1 FROM map_save WHERE householdId = ? AND userId = ? AND operationId = ?')
      .get(householdId, historical.userId, historical.operationId);
    if (!changes.length && !receipt)
      database
        .prepare('DELETE FROM map_history WHERE householdId = ? AND id = ?')
        .run(householdId, historical.id);
    else if (!isDeepStrictEqual(changes, historical.changes))
      database
        .prepare('UPDATE map_history SET changes = ? WHERE householdId = ? AND id = ?')
        .run(JSON.stringify(changes), householdId, historical.id);
  }
  for (const id of scope.relationships)
    database
      .prepare('DELETE FROM map_relationship WHERE householdId = ? AND id = ?')
      .run(householdId, id);
  for (const id of scope.objects) {
    database
      .prepare('DELETE FROM map_object WHERE householdId = ? AND id = ?')
      .run(householdId, id);
    database
      .prepare('DELETE FROM profile_image WHERE householdId = ? AND objectId = ?')
      .run(householdId, id);
    database
      .prepare('DELETE FROM personal_position WHERE householdId = ? AND objectId = ?')
      .run(householdId, id);
  }
  for (const [kind, table, ids] of [
    ['objectType', 'object_type', scope.objectTypes],
    ['relationshipType', 'relationship_type', scope.relationshipTypes],
  ] as const)
    for (const id of ids) {
      database.prepare('DELETE FROM removed_type WHERE kind = ? AND typeId = ?').run(kind, id);
      database
        .prepare(`DELETE FROM ${table} WHERE householdId = ? AND id = ?`)
        .run(householdId, id);
    }
}
