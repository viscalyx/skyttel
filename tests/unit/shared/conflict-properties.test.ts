import { expect, test } from 'vitest';
import {
  type ConflictProperty,
  combineConflictProperties,
  conflictCombinationError,
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
  expect(conflictValueText(state, property('lifecycle'), undefined)).toBe('Följ slutdatum');
  expect(conflictValueText(state, property('lifecycle'), 'active')).toBe('Gäller fortfarande');
  expect(conflictValueText(state, property('lifecycle'), 'ended')).toBe('Manuellt upphört');
  expect(conflictValueText(state, property('customValues.note'), undefined)).toBe('Ej uppgivet');
});
test('object type choices accept a builtin property order and reject references absent from the chosen combination', () => {
  const conflict = { kind: 'objectType' as const, id: 'contract', current: null };
  const value = {
    name: 'Avtal',
    description: '',
    fields: [],
    sections: [{ id: 'finance', name: 'Ekonomi' }],
    builtins: [{ key: 'price', name: 'Pris', sectionId: 'finance' }],
    propertyOrder: ['builtin:price'],
  };
  expect(conflictCombinationError(state, conflict, value)).toBe('');
  expect(conflictCombinationError(state, conflict, { ...value, builtins: [] })).toContain(
    'uppgift som saknas',
  );
});

test('concurrent type labels keep saved and proposed meanings on the same property identities', () => {
  const type = {
    id: 'person',
    householdId: 'household',
    revision: 1,
    name: 'Person',
    description: '',
    builtins: [{ key: 'debt' as const, name: 'Sparad skuld', sectionId: '' }],
    fields: [
      {
        id: 'note',
        name: 'Sparad anteckning',
        description: '',
        kind: 'text' as const,
        sectionId: '',
      },
    ],
  };
  const before = {
    id: 'lo',
    householdId: 'household',
    revision: 1,
    typeId: type.id,
    name: 'Lo',
    description: '',
    customValues: { note: 'Tidigare' },
    financialFacts: { debt: { knowledge: 'known' as const, value: '1200' } },
  };
  const saved = {
    ...before,
    revision: 2,
    customValues: { note: 'Sparat' },
    financialFacts: { debt: { knowledge: 'known' as const, value: '2000' } },
  };
  const proposed = {
    ...before,
    customValues: { note: 'Mitt' },
    financialFacts: { debt: { knowledge: 'known' as const, value: '1700' } },
  };
  const proposedType = {
    ...type,
    revision: 2,
    builtins: [{ ...type.builtins[0], name: 'Min skuld' }],
    fields: [{ ...type.fields[0], name: 'Min anteckning' }],
  };
  const comparison = {
    ...state,
    types: [type],
    objects: [saved],
    draft: {
      version: 2,
      changes: [{ id: 'lo', before, after: proposed, type: proposedType, beforeType: type }],
      objectTypes: [{ id: type.id, before: type, after: proposedType }],
    },
  };
  const fields = conflictProperties(comparison, { kind: 'object', id: 'lo', current: saved });
  const debt = fields.find((field) => field.key === 'financialFacts.debt');
  const note = fields.find((field) => field.key === 'customValues.note');
  expect(debt && conflictPropertyLabel(debt, 'saved')).toBe('Sparad skuld');
  expect(debt && conflictPropertyLabel(debt, 'proposed')).toBe('Min skuld');
  expect(note && conflictPropertyLabel(note, 'saved')).toBe('Sparad anteckning');
  expect(note && conflictPropertyLabel(note, 'proposed')).toBe('Min anteckning');
  expect(
    combineConflictProperties(
      fields,
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          field.key === 'financialFacts.debt' ? 'saved' : 'proposed',
        ]),
      ),
    ),
  ).toMatchObject({
    customValues: { note: 'Mitt' },
    financialFacts: { debt: { knowledge: 'known', value: '2000' } },
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
    knowledge: 'known' as const,
  };
  const current = {
    ...before,
    revision: 2,
    typeId: actualType.id,
    customValues: { note: 'Sparat' },
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
