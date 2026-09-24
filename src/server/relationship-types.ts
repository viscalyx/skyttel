import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import { resolvedRelationshipType } from '../shared/draft-conflicts.js';
import type { MapDraft, RelationshipType } from '../shared/map.js';
import { proposedRelationshipTypes } from '../shared/map.js';
import { MapError } from './map-error.js';

export function relationshipTypes(database: Database.Database, householdId: string) {
  function read(): RelationshipType[] {
    return database
      .prepare(`SELECT t.*, l.forwardLabel, l.reverseLabel FROM relationship_type t
        LEFT JOIN relationship_type_labels l ON l.typeId = t.id
        WHERE t.householdId = ? ORDER BY t.name, t.id`)
      .all(householdId)
      .map((row) => {
        const { forwardLabel, reverseLabel, ...type } = row as RelationshipType;
        return {
          ...type,
          ...(forwardLabel ? { forwardLabel } : {}),
          ...(reverseLabel ? { reverseLabel } : {}),
        };
      });
  }
  function validate(value: unknown) {
    const type = value as Partial<RelationshipType> | null;
    if (
      !type ||
      Object.keys(type).some(
        (key) => !['name', 'description', 'forwardLabel', 'reverseLabel'].includes(key),
      ) ||
      typeof type.name !== 'string' ||
      !type.name.trim() ||
      type.name.length > 200 ||
      typeof type.description !== 'string' ||
      type.description.length > 2000 ||
      typeof type.forwardLabel !== 'string' ||
      !type.forwardLabel.trim() ||
      type.forwardLabel.length > 200 ||
      typeof type.reverseLabel !== 'string' ||
      !type.reverseLabel.trim() ||
      type.reverseLabel.length > 200
    )
      throw new MapError('invalid_relationship_type', 400);
    return {
      name: type.name.trim(),
      description: type.description,
      forwardLabel: type.forwardLabel.trim(),
      reverseLabel: type.reverseLabel.trim(),
    };
  }
  return {
    read,
    effective(draft: MapDraft) {
      return proposedRelationshipTypes(read(), draft.relationshipTypes);
    },
    resolve(
      draft: MapDraft,
      id: string,
      current: RelationshipType | null,
      choice: 'saved' | 'proposed',
    ) {
      const change = draft.relationshipTypes?.find((item) => item.id === id);
      if (!change || !current) throw new MapError('type_conflict');
      if (choice === 'saved')
        draft.relationshipTypes = draft.relationshipTypes?.filter((item) => item.id !== id);
      else {
        change.after = resolvedRelationshipType(change, current);
        change.before = current;
      }
      const type = choice === 'saved' ? current : change.after;
      for (const proposal of draft.relationships ?? [])
        if (proposal.type.id === id) proposal.type = type;
      return { ...draft, version: draft.version + 1 };
    },
    propose(draft: MapDraft, body: Record<string, unknown>) {
      if (typeof body.id !== 'string' || !/^[\w-]{1,128}$/.test(body.id))
        throw new MapError('invalid_relationship_type', 400);
      const existing = draft.relationshipTypes?.find((item) => item.id === body.id);
      const before = existing
        ? existing.before
        : (read().find((type) => type.id === body.id) ?? null);
      if ((before?.revision ?? null) !== body.baseRevision) throw new MapError('type_conflict');
      const after: RelationshipType = {
        id: body.id,
        householdId,
        revision: (before?.revision ?? 0) + 1,
        ...validate(body.value),
      };
      draft.relationshipTypes = [
        ...(draft.relationshipTypes ?? []).filter((item) => item.id !== body.id),
        { id: body.id, before, after },
      ];
      for (const change of draft.relationships ?? [])
        if (change.type.id === after.id) change.type = after;
      return { ...draft, version: draft.version + 1 };
    },
    save(draft: MapDraft) {
      for (const change of draft.relationshipTypes ?? []) {
        const current = read().find((type) => type.id === change.id) ?? null;
        if (!isDeepStrictEqual(current, change.before)) throw new MapError('type_conflict');
        if (
          !current &&
          database.prepare('SELECT 1 FROM relationship_type WHERE id = ?').get(change.id)
        )
          throw new MapError('type_conflict');
        database
          .prepare(`INSERT INTO relationship_type (id, householdId, revision, name, description) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, name = excluded.name, description = excluded.description`)
          .run(
            change.id,
            householdId,
            change.after.revision,
            change.after.name,
            change.after.description,
          );
        database
          .prepare(`INSERT INTO relationship_type_labels (typeId, forwardLabel, reverseLabel) VALUES (?, ?, ?)
          ON CONFLICT(typeId) DO UPDATE SET forwardLabel = excluded.forwardLabel, reverseLabel = excluded.reverseLabel`)
          .run(change.id, change.after.forwardLabel, change.after.reverseLabel);
      }
      return draft.relationshipTypes ?? [];
    },
  };
}
