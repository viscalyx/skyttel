import type { DraftRelationshipChange, RelationshipType, RelationshipValue } from './map.js';

/** Type labels are a compatibility fallback for historical values without an edge verb. */
export function relationshipVerb(value: RelationshipValue, type?: RelationshipType) {
  return value.verb ?? type?.forwardLabel ?? type?.name ?? 'okänd sambandstyp';
}

export function relationshipReverseVerb(value: RelationshipValue, type?: RelationshipType) {
  return value.reverseVerb ?? (value.verb === undefined ? type?.reverseLabel : undefined);
}

export function withRelationshipVerbs<T extends RelationshipValue>(
  value: T,
  type?: RelationshipType,
): T {
  if (value.verb !== undefined) return value;
  const reverseVerb = relationshipReverseVerb(value, type);
  return {
    ...value,
    verb: relationshipVerb(value, type),
    ...(reverseVerb ? { reverseVerb } : {}),
  };
}

/** Upgrade a retained proposal from its own snapshots, never from today's category wording. */
export function withDraftRelationshipVerbs(
  change: DraftRelationshipChange,
): DraftRelationshipChange {
  return {
    ...change,
    before: change.before
      ? withRelationshipVerbs(change.before, change.beforeType ?? change.type)
      : null,
    after: change.after ? withRelationshipVerbs(change.after, change.type) : null,
    ...(change.suppressed ? { suppressed: withDraftRelationshipVerbs(change.suppressed) } : {}),
  };
}
