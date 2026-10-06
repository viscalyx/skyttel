import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import type { DefinitionRestoration, TypeDefinition } from '../shared/map.js';
import { assertContentVersion } from './content-maintenance.js';
import { MapError } from './map-error.js';
import { mapTombstones } from './map-tombstones.js';

type PrivateDefinitionChange<T extends TypeDefinition> = {
  id: string;
  before: T | null;
  after: T | null;
  restoration?: DefinitionRestoration<T>;
};

/** Narrow authority for a removed type, checked again inside the whole-draft save. */
export function definitionRestorations(database: Database.Database, householdId: string) {
  const tombstones = mapTombstones(database, householdId);
  function assertRemoved(
    kind: 'objectType' | 'relationshipType',
    definition: TypeDefinition,
    contentVersion: number,
  ) {
    assertContentVersion(database, householdId, contentVersion);
    tombstones.assertRestoration(kind, definition.id, definition.revision);
  }
  return {
    grant<T extends TypeDefinition>(
      kind: 'objectType' | 'relationshipType',
      change: PrivateDefinitionChange<T>,
      definition: T,
      contentVersion: number,
    ) {
      assertRemoved(kind, definition, contentVersion);
      if (!change.after || change.id !== definition.id || change.after.householdId !== householdId)
        throw new MapError('type_conflict');
      change.before = null;
      change.after = { ...change.after, revision: definition.revision + 1 };
      change.restoration = { contentVersion, definition };
    },
    assertAtSave<T extends TypeDefinition>(
      kind: 'objectType' | 'relationshipType',
      change: PrivateDefinitionChange<T>,
      removed: T | undefined,
    ) {
      const authority = change.restoration;
      if (!authority) throw new MapError('type_conflict');
      assertRemoved(kind, authority.definition, authority.contentVersion);
      if (
        change.before ||
        !change.after ||
        change.id !== authority.definition.id ||
        change.after.householdId !== householdId ||
        change.after.revision !== authority.definition.revision + 1 ||
        !isDeepStrictEqual(removed, authority.definition)
      )
        throw new MapError('type_conflict');
    },
  };
}
