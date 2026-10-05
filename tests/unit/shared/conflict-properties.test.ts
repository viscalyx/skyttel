import { expect, test } from 'vitest';
import {
  type ConflictProperty,
  conflictCombinationError,
  conflictValueText,
} from '../../../src/shared/conflict-properties.js';
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
