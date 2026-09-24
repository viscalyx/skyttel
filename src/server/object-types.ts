import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import type { CustomField, CustomValues, MapDraft, ObjectType } from '../shared/map.js';
import { proposedObjectTypes } from '../shared/map.js';
import { MapError } from './map-error.js';

export function readCustomValues(value: unknown, type: ObjectType): CustomValues | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new MapError('invalid_custom_value', 400);
  const result: CustomValues = {};
  for (const [id, answer] of Object.entries(value)) {
    const field = type.fields?.find((item) => item.id === id);
    if (!field) throw new MapError('invalid_custom_value', 400);
    const valid =
      field.kind === 'boolean'
        ? typeof answer === 'boolean'
        : field.kind === 'number'
          ? typeof answer === 'number' && Number.isFinite(answer)
          : typeof answer === 'string' &&
            (field.kind === 'text'
              ? answer.length <= 2000
              : /^\d{4}-\d{2}-\d{2}$/.test(answer) &&
                !Number.isNaN(Date.parse(answer)) &&
                new Date(answer).toISOString().slice(0, 10) === answer);
    if (!valid) throw new MapError('invalid_custom_value', 400);
    result[id] = answer;
  }
  return Object.keys(result).length ? result : undefined;
}

export function objectTypes(database: Database.Database, householdId: string) {
  function read(): ObjectType[] {
    return (
      database
        .prepare(`SELECT t.*, f.fields FROM object_type t LEFT JOIN object_type_fields f ON f.typeId = t.id
      WHERE t.householdId = ? ORDER BY CASE WHEN t.name = 'Person' THEN 0 ELSE 1 END, t.name, t.id`)
        .all(householdId) as (ObjectType & { fields: string | null })[]
    ).map(({ fields, ...type }) => ({
      ...type,
      ...(fields && fields !== '[]' ? { fields: JSON.parse(fields) } : {}),
    }));
  }
  function validate(value: unknown): Pick<ObjectType, 'name' | 'description' | 'fields'> {
    const type = value as Partial<ObjectType> | null;
    if (
      !type ||
      typeof type.name !== 'string' ||
      !type.name.trim() ||
      type.name.length > 200 ||
      typeof type.description !== 'string' ||
      type.description.length > 2000 ||
      !Array.isArray(type.fields) ||
      type.fields.length > 100
    )
      throw new MapError('invalid_type_definition', 400);
    const ids = new Set<string>();
    const fields: CustomField[] = type.fields.map((field) => {
      if (
        !field ||
        typeof field.id !== 'string' ||
        !/^[\w-]{1,128}$/.test(field.id) ||
        ['__proto__', 'constructor', 'prototype'].includes(field.id) ||
        ids.has(field.id) ||
        typeof field.name !== 'string' ||
        !field.name.trim() ||
        field.name.length > 200 ||
        typeof field.description !== 'string' ||
        field.description.length > 2000 ||
        !['text', 'number', 'date', 'boolean'].includes(field.kind)
      )
        throw new MapError('invalid_type_definition', 400);
      ids.add(field.id);
      return {
        id: field.id,
        name: field.name.trim(),
        description: field.description,
        kind: field.kind,
      };
    });
    return {
      name: type.name.trim(),
      description: type.description,
      ...(fields.length ? { fields } : {}),
    };
  }
  function checkFields(before: ObjectType | null, after: ObjectType, draft: MapDraft) {
    for (const field of before?.fields ?? []) {
      const next = after.fields?.find((item) => item.id === field.id);
      if (!next) throw new MapError('field_removal_unsupported', 400);
      if (next.kind === field.kind) continue;
      const objects = database
        .prepare(
          'SELECT customValues FROM map_object WHERE householdId = ? AND typeId = ? AND deleted = 0',
        )
        .all(householdId, after.id) as { customValues: string | null }[];
      const drafts = database
        .prepare('SELECT changes FROM map_draft WHERE householdId = ?')
        .all(householdId) as { changes: string }[];
      const used =
        objects.some(
          (object) =>
            object.customValues && Object.hasOwn(JSON.parse(object.customValues), field.id),
        ) ||
        [
          ...drafts.flatMap((item) => JSON.parse(item.changes) as MapDraft['changes']),
          ...draft.changes,
        ].some(
          (change) =>
            change.after?.typeId === after.id &&
            Object.hasOwn(change.after.customValues ?? {}, field.id),
        );
      if (used) throw new MapError('field_kind_in_use');
    }
  }
  return {
    read,
    effective(draft: MapDraft) {
      return proposedObjectTypes(read(), draft.objectTypes);
    },
    resolve(draft: MapDraft, id: string, current: ObjectType | null, choice: 'saved' | 'proposed') {
      const change = draft.objectTypes?.find((item) => item.id === id);
      if (!change || !current) throw new MapError('type_conflict');
      if (choice === 'saved')
        draft.objectTypes = draft.objectTypes?.filter((item) => item.id !== id);
      else {
        checkFields(current, change.after, draft);
        change.before = current;
        change.after = { ...change.after, revision: current.revision + 1 };
      }
      const type = choice === 'saved' ? current : change.after;
      for (const proposal of draft.changes)
        if (proposal.type.id === id) {
          if (proposal.after) readCustomValues(proposal.after.customValues, type);
          proposal.type = type;
        }
      return { ...draft, version: draft.version + 1 };
    },
    propose(draft: MapDraft, body: Record<string, unknown>) {
      if (typeof body.id !== 'string' || !/^[\w-]{1,128}$/.test(body.id))
        throw new MapError('invalid_type_definition', 400);
      const existing = draft.objectTypes?.find((item) => item.id === body.id);
      const before = existing
        ? existing.before
        : (read().find((item) => item.id === body.id) ?? null);
      if ((before?.revision ?? null) !== body.baseRevision) throw new MapError('type_conflict');
      const after: ObjectType = {
        id: body.id,
        householdId,
        revision: (before?.revision ?? 0) + 1,
        ...validate(body.value),
      };
      checkFields(before, after, draft);
      if (existing)
        checkFields(
          {
            ...existing.after,
            fields: existing.after.fields?.filter(
              (field) => !before?.fields?.some((saved) => saved.id === field.id),
            ),
          },
          after,
          draft,
        );
      draft.objectTypes = [
        ...(draft.objectTypes ?? []).filter((item) => item.id !== body.id),
        { id: body.id, before, after },
      ];
      for (const change of draft.changes)
        if (change.type.id === body.id) {
          if (change.after) readCustomValues(change.after.customValues, after);
          change.type = after;
        }
      return { ...draft, version: draft.version + 1 };
    },
    save(draft: MapDraft) {
      for (const change of draft.objectTypes ?? []) {
        const current = read().find((item) => item.id === change.id) ?? null;
        if (!isDeepStrictEqual(current, change.before)) throw new MapError('type_conflict');
        if (!current && database.prepare('SELECT 1 FROM object_type WHERE id = ?').get(change.id))
          throw new MapError('type_conflict');
        checkFields(current, change.after, draft);
        database
          .prepare(`INSERT INTO object_type (id, householdId, revision, name, description) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, name = excluded.name, description = excluded.description`)
          .run(
            change.id,
            householdId,
            change.after.revision,
            change.after.name,
            change.after.description,
          );
        database
          .prepare(
            'INSERT INTO object_type_fields (typeId, fields) VALUES (?, ?) ON CONFLICT(typeId) DO UPDATE SET fields = excluded.fields',
          )
          .run(change.id, JSON.stringify(change.after.fields ?? []));
      }
      return draft.objectTypes ?? [];
    },
  };
}
