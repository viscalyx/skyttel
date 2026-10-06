import type { DraftConflict } from './draft-conflicts.js';
import type { DefinitionRestoration, MapState, ObjectType, RelationshipType } from './map.js';

export function removedConflictDefinition(
  state: MapState,
  conflict: Pick<DraftConflict, 'kind' | 'id'>,
) {
  return (
    conflict.kind === 'objectType'
      ? state.removedDefinitions?.objectTypes
      : conflict.kind === 'relationshipType'
        ? state.removedDefinitions?.relationshipTypes
        : []
  )?.find((type) => type.id === conflict.id);
}

export function restorationIsCurrent(
  state: MapState,
  conflict: Pick<DraftConflict, 'kind' | 'id'>,
  restoration: DefinitionRestoration<ObjectType | RelationshipType>,
) {
  const removed = removedConflictDefinition(state, conflict);
  return (
    restoration.contentVersion === state.contentVersion &&
    removed?.revision === restoration.definition.revision &&
    removed?.householdId === restoration.definition.householdId
  );
}
