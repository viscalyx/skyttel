import type { RelationshipType, RelationshipValue } from './map.js';
import { relationshipVerb } from './relationship-verb.js';

/** Grouping, direction and the effective forward verb identify a relationship. */
export function equivalentRelationships(
  left: RelationshipValue,
  right: RelationshipValue,
  types: readonly RelationshipType[],
) {
  if (
    left.typeId !== right.typeId ||
    left.sourceId !== right.sourceId ||
    left.targetId !== right.targetId
  )
    return false;
  const type = types.find((type) => type.id === left.typeId);
  return relationshipVerb(left, type) === relationshipVerb(right, type);
}

/** Find the local ungrouped category using the same definition as proposal creation. */
export function ungroupedRelationshipType(types: readonly RelationshipType[]) {
  return types.find(
    (type) =>
      type.name === 'Samband' &&
      type.description === 'Hushållets samband utan särskilt vald gruppering.' &&
      type.forwardLabel === undefined &&
      type.reverseLabel === undefined,
  );
}
