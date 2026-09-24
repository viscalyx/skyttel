import { isDeepStrictEqual } from 'node:util';
import type { CustomField } from '../shared/map.js';
import { MapError } from './map-error.js';

type Kind = 'object' | 'relationship' | 'objectType' | 'relationshipType';
type Facts = Map<string, unknown>;
type Change<T> = { before: T | null; after: T | null };
const scalarFields = {
  object: ['typeId', 'name', 'description', 'identity', 'lifecycle'],
  relationship: ['lifecycle', 'endDate'],
  objectType: ['name', 'description'],
  relationshipType: ['name', 'description', 'forwardLabel', 'reverseLabel'],
};
const meaningFields = ['typeId', 'sourceId', 'targetId', 'knowledge'];

function facts(kind: Kind, value: object): Facts {
  const record = value as Record<string, unknown>;
  const result: Facts = new Map(scalarFields[kind].map((key) => [key, record[key]]));
  if (kind === 'relationship')
    result.set(
      'meaning',
      meaningFields.map((key) => record[key]),
    );
  if (kind === 'object')
    for (const group of ['financialFacts', 'customValues'])
      for (const [key, item] of Object.entries(record[group] ?? {}))
        result.set(`${group}:${key}`, item);
  if (kind === 'objectType')
    for (const field of (record.fields ?? []) as CustomField[]) {
      result.set(`field:${field.id}`, true);
      for (const key of ['name', 'description', 'kind'] as const)
        result.set(`field:${field.id}:${key}`, field[key]);
    }
  return result;
}

function apply<T extends object>(kind: Kind, base: T, values: Facts): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of scalarFields[kind]) {
    if (values.get(key) === undefined) delete result[key];
    else result[key] = values.get(key);
  }
  if (kind === 'relationship') {
    const meaning = values.get('meaning') as unknown[];
    meaningFields.forEach((key, index) => {
      result[key] = meaning[index];
    });
  }
  if (kind === 'object')
    for (const group of ['financialFacts', 'customValues']) {
      const entries = [...values].filter(
        ([key, value]) => key.startsWith(`${group}:`) && value !== undefined,
      );
      if (entries.length)
        result[group] = Object.fromEntries(
          entries.map(([key, value]) => [key.slice(group.length + 1), value]),
        );
      else delete result[group];
    }
  if (kind === 'objectType') {
    const fields = [...values]
      .filter(
        ([key, value]) => key.startsWith('field:') && key.split(':').length === 2 && value === true,
      )
      .map(([key]) => ({
        id: key.slice(6),
        name: values.get(`${key}:name`),
        description: values.get(`${key}:description`),
        kind: values.get(`${key}:kind`),
      }));
    if (fields.length) result.fields = fields;
    else delete result.fields;
  }
  return result as T;
}

function changed(before: Facts, after: Facts) {
  return [...new Set([...before.keys(), ...after.keys()])].filter(
    (key) => !isDeepStrictEqual(before.get(key), after.get(key)),
  );
}
function patch<T extends object>(kind: Kind, base: T, source: Facts, keys: string[]) {
  const result = facts(kind, base);
  for (const key of keys) result.set(key, source.get(key));
  return apply(kind, base, result);
}
function revision(value: object) {
  return (value as { revision: number }).revision;
}

// Reverse only the facts changed by the selected save. Build a new base so
// subsequent conflict resolution can still preserve independent newer facts.
export function inverseChange<T extends object>(
  kind: Kind,
  original: Change<T>,
  current: T | null,
  own?: Change<object>,
): (Change<T> & { undoFields?: string[] }) | null {
  const expected = original.after,
    desired = original.before;
  const keys = expected && desired ? changed(facts(kind, expected), facts(kind, desired)) : null;
  const ownKeys =
    own?.before && own.after ? changed(facts(kind, own.before), facts(kind, own.after)) : null;
  if (own && (!keys || !ownKeys || keys.some((key) => ownKeys.includes(key))))
    throw new MapError('undo_draft_overlap');
  if (!desired && !current && !own) return null;
  let before = expected;
  let after = desired;
  if (keys && expected && desired && current) {
    const overlaps = keys.some(
      (key) => !isDeepStrictEqual(facts(kind, current).get(key), facts(kind, expected).get(key)),
    );
    before = {
      ...patch(kind, current, facts(kind, expected), keys),
      revision: overlaps ? revision(expected) : revision(current),
    };
    after = patch(kind, current, facts(kind, desired), keys);
  } else if (current && expected && !changed(facts(kind, current), facts(kind, expected)).length)
    before = current;
  if (own?.before && own.after && ownKeys && before && after) {
    before = {
      ...patch(kind, before, facts(kind, own.before), ownKeys),
      revision:
        current && revision(own.before) === revision(current)
          ? revision(before)
          : revision(own.before),
    };
    after = patch(kind, after, facts(kind, own.after), ownKeys);
  }
  return { before, after, ...(keys ? { undoFields: keys } : {}) };
}

// Choosing the current value for an undo conflict does not discard facts
// contributed independently by the user's private draft.
export function keepIndependent<T extends object>(
  kind: Kind,
  change: { before: T | null; after: object | null; undo?: true; undoFields?: string[] },
  current: T | null,
): Change<T> | null {
  if (!change.undo || !change.undoFields || !change.before || !change.after) return null;
  const before = facts(kind, change.before),
    after = facts(kind, change.after);
  const keys = changed(before, after).filter((key) => !change.undoFields?.includes(key));
  if (!keys.length) return null;
  if (!current) return { before: change.before, after: patch(kind, change.before, after, keys) };
  const overlaps = keys.some(
    (key) => !isDeepStrictEqual(before.get(key), facts(kind, current).get(key)),
  );
  return {
    before: {
      ...patch(kind, current, before, keys),
      revision: overlaps ? revision(change.before) : revision(current),
    },
    after: patch(kind, current, after, keys),
  };
}
