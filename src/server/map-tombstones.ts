import type Database from 'better-sqlite3';
import { MapError } from './map-error.js';

export function mapTombstones(database: Database.Database, householdId: string) {
  const tables = {
    object: 'map_object',
    relationship: 'map_relationship',
    objectType: 'object_type',
    relationshipType: 'relationship_type',
  } as const;
  type Kind = keyof typeof tables;
  function read(kind: Kind, id: string) {
    const deleted =
      kind === 'objectType' || kind === 'relationshipType'
        ? `EXISTS (SELECT 1 FROM removed_type WHERE kind = '${kind}' AND typeId = id) AS deleted`
        : 'deleted';
    return database
      .prepare(`SELECT householdId, revision, ${deleted} FROM ${tables[kind]} WHERE id = ?`)
      .get(id) as { householdId: string; revision: number; deleted: number } | undefined;
  }
  return {
    assertRestoration(kind: 'objectType' | 'relationshipType', id: string, revision: number) {
      const current = read(kind, id);
      if (!current?.deleted || current.householdId !== householdId || current.revision !== revision)
        throw new MapError('type_conflict');
    },
    restoreType(kind: 'objectType' | 'relationshipType', id: string) {
      database.prepare('DELETE FROM removed_type WHERE kind = ? AND typeId = ?').run(kind, id);
    },
    removeType(kind: 'objectType' | 'relationshipType', id: string) {
      database
        .prepare(
          `UPDATE ${tables[kind]} SET revision = revision + 1 WHERE householdId = ? AND id = ?`,
        )
        .run(householdId, id);
      database.prepare('INSERT INTO removed_type (kind, typeId) VALUES (?, ?)').run(kind, id);
    },
    assertCreation(kind: Kind, id: string) {
      if (read(kind, id))
        throw new MapError(
          kind === 'objectType' || kind === 'relationshipType'
            ? 'type_conflict'
            : `${kind}_conflict`,
        );
    },
  };
}
