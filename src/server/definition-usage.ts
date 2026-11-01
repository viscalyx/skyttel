import type Database from 'better-sqlite3';
import type { MapDraft, ObjectValue, RelationshipValue } from '../shared/map.js';
import { MapError } from './map-error.js';

export function definitionUsage(database: Database.Database, householdId: string) {
  return {
    assertUnused(
      kind: 'objectType' | 'relationshipType',
      id: string,
      draft: MapDraft,
      code: 'definition_in_use' | 'definition_creation_in_use' = 'definition_in_use',
    ) {
      if (kind === 'objectType') {
        const objects = new Map(
          (
            database
              .prepare('SELECT id, typeId FROM map_object WHERE householdId = ? AND deleted = 0')
              .all(householdId) as { id: string; typeId: string }[]
          ).map((row) => [
            row.id,
            {
              typeId: row.typeId,
            },
          ]),
        );
        for (const change of draft.changes) {
          if (change.after)
            objects.set(change.id, {
              typeId: change.after.typeId,
            });
          else objects.delete(change.id);
        }
        const uses = (value: Pick<ObjectValue, 'typeId'> | null) => value?.typeId === id;
        if ([...objects.values()].some(uses)) throw new MapError(code);
      } else {
        const edges = new Map(
          (
            database
              .prepare(
                'SELECT id, typeId FROM map_relationship WHERE householdId = ? AND deleted = 0',
              )
              .all(householdId) as { id: string; typeId: string }[]
          ).map((edge) => [edge.id, edge]),
        );
        for (const change of draft.relationships ?? []) {
          if (change.after)
            edges.set(change.id, {
              id: change.id,
              typeId: change.after.typeId,
            });
          else edges.delete(change.id);
        }
        const uses = (value: Pick<RelationshipValue, 'typeId'> | null) => value?.typeId === id;
        if ([...edges.values()].some(uses)) throw new MapError(code);
      }
    },
  };
}
