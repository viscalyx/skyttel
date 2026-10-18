import { expect, test } from 'vitest';
import {
  type ConflictProperty,
  combineConflictProperties,
  conflictProperties,
  conflictPropertyLabel,
  conflictValueText,
} from '../../../src/shared/conflict-properties.js';
import { conflictRemovalPlan } from '../../../src/shared/conflict-removal.js';
import { specialConflict } from '../../../src/shared/conflict-special.js';
import type { MapState } from '../../../src/shared/map.js';

const state: MapState = {
  userId: 'alex',
  contentVersion: 0,
  types: [],
  relationshipTypes: [],
  objects: [],
  relationships: [],
  draft: { version: 0, changes: [] },
};
const property = (key: string): ConflictProperty => ({
  key,
  label: key,
  before: undefined,
  saved: undefined,
  proposed: undefined,
});
test('conflict values distinguish identified objects and lifecycle modes from missing facts', () => {
  expect(conflictValueText(state, property('identity'), undefined)).toBe('Identifierat objekt');
  expect(conflictValueText(state, property('identity'), 'unspecified')).toBe(
    'Ospecificerat objekt',
  );
  expect(conflictValueText(state, property('lifecycle'), undefined)).toBe('Gäller fortfarande');
  expect(conflictValueText(state, property('lifecycle'), 'active')).toBe('Gäller fortfarande');
  expect(conflictValueText(state, property('lifecycle'), 'ended')).toBe('Manuellt upphört');
  expect(conflictValueText(state, property('properties.note'), undefined)).toBe('Borttaget');
});

test('concurrent free property labels remain attached to their stable identities', () => {
  const type = {
    id: 'person',
    householdId: 'household',
    revision: 1,
    name: 'Person',
    description: '',
  };
  const before = {
    id: 'lo',
    householdId: 'household',
    revision: 1,
    typeId: 'person',
    name: 'Lo',
    properties: [{ id: 'note', label: 'Anteckning', kind: 'text' as const, value: 'Tidigare' }],
  };
  const saved = {
    ...before,
    revision: 2,
    properties: [
      { id: 'note', label: 'Sparad anteckning', kind: 'text' as const, value: 'Sparat' },
    ],
  };
  const proposed = {
    ...before,
    properties: [{ id: 'note', label: 'Min anteckning', kind: 'text' as const, value: 'Mitt' }],
  };
  const comparison: MapState = {
    ...state,
    types: [type],
    objects: [saved],
    draft: { version: 2, changes: [{ id: 'lo', before, after: proposed, type }] },
  };
  const fields = conflictProperties(comparison, { kind: 'object', id: 'lo', current: saved });
  const note = fields.find((field) => field.key === 'properties.note');
  expect(note && conflictPropertyLabel(note, 'saved')).toBe('Sparad anteckning · egenskap 1');
  expect(note && conflictPropertyLabel(note, 'proposed')).toBe('Min anteckning · egenskap 1');
  expect(combineConflictProperties(fields, { 'properties.note': 'proposed' })).toMatchObject({
    properties: proposed.properties,
  });
});

test('a changed relationship removal requires an explicit choice and retains the actual saved definition', () => {
  const originalType = {
    id: 'uses',
    householdId: 'household',
    revision: 1,
    name: 'Använder',
    description: '',
  };
  const actualType = { ...originalType, id: 'used-by', revision: 3, name: 'Används av' };
  const before = {
    id: 'edge',
    householdId: 'household',
    revision: 1,
    typeId: originalType.id,
    sourceId: 'lo',
    targetId: 'service',
  };
  const current = {
    ...before,
    revision: 2,
    typeId: actualType.id,

    properties: [{ id: 'note', label: 'note', kind: 'text' as const, value: 'Sparat' }],
  };
  const comparison: MapState = {
    ...state,
    relationshipTypes: [originalType, actualType],
    relationships: [current],
    draft: {
      version: 2,
      changes: [],
      relationships: [
        { id: 'edge', before, after: null, type: originalType, removedWithObjects: ['lo'] },
      ],
    },
  };
  const conflict = { kind: 'relationship' as const, id: 'edge', current };
  expect(specialConflict(comparison, conflict)?.kind).toBe('own-removal');
  expect(conflictProperties(comparison, conflict)).toMatchObject([
    { key: 'relationship', before, saved: current, proposed: 'Föreslagen borttagning' },
  ]);
  expect(conflictRemovalPlan(comparison, conflict, {})).toBeNull();
  expect(
    conflictRemovalPlan(comparison, conflict, { relationship: 'proposed', forged: 'saved' }),
  ).toBeNull();
  const retained = conflictRemovalPlan(comparison, conflict, { relationship: 'proposed' });
  expect(retained?.draft.relationships?.[0]).toMatchObject({
    before: current,
    after: null,
    type: actualType,
    beforeType: actualType,
  });
  expect(retained?.draft.relationships?.[0]).not.toHaveProperty('removedWithObjects');
  expect(retained?.effects).toEqual([
    { target: conflict, kind: 'retain', before: current, after: null },
  ]);
  const discarded = conflictRemovalPlan(comparison, conflict, { relationship: 'saved' });
  expect(discarded?.draft.relationships).toEqual([]);
  expect(discarded?.effects).toEqual([{ target: conflict, kind: 'discard' }]);
  expect(comparison.draft.relationships?.[0]).toMatchObject({
    before,
    after: null,
    type: originalType,
    removedWithObjects: ['lo'],
  });
});

test('type explanation choices retain each complete saved and proposed meaning', () => {
  const before = {
    id: 'type',
    householdId: 'home',
    revision: 1,
    name: 'Fordon',
    description: 'Ursprunglig förklaring',
  };
  const saved = { ...before, revision: 2, description: 'Gemensam förklaring' };
  const proposed = { ...before, description: 'Min förklaring' };
  const comparison: MapState = {
    ...state,
    types: [saved],
    draft: { version: 1, changes: [], objectTypes: [{ id: 'type', before, after: proposed }] },
  };
  const fields = conflictProperties(comparison, { kind: 'objectType', id: 'type', current: saved });
  expect(fields.find(({ key }) => key === 'description')).toMatchObject({
    label: 'Beskrivning',
    saved: 'Gemensam förklaring',
    proposed: 'Min förklaring',
  });
  expect(combineConflictProperties(fields, { description: 'saved' })).toMatchObject({
    description: 'Gemensam förklaring',
  });
  expect(combineConflictProperties(fields, { description: 'proposed' })).toMatchObject({
    description: 'Min förklaring',
  });
});
