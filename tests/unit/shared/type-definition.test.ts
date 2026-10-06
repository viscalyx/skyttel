import { expect, test } from 'vitest';
import type { ObjectType, RelationshipType } from '../../../src/shared/map.js';
import {
  builtinPresentationChanges,
  orderedReferences,
} from '../../../src/shared/object-properties.js';
import {
  applyTypeDefinitionFacts,
  resolveTypeDefinition,
  typeDefinitionFacts,
} from '../../../src/shared/type-definition.js';

const definition: ObjectType = {
  id: 'equipment',
  householdId: 'synthetic-home',
  revision: 1,
  name: 'Utrustning',
  description: 'Hela den tidigare definitionen',
};

test('legacy definitions without presentation metadata keep independent current fields and scalar facts', () => {
  const current: ObjectType = {
    ...definition,
    revision: 2,
    description: 'Någon annans sparade beskrivning',
    fields: [{ id: 'serial', name: 'Serienummer', description: '', kind: 'text' }],
  };
  const before = structuredClone(current);
  const merged = resolveTypeDefinition(
    'objectType',
    definition,
    { ...definition, name: 'Mitt granskade namn' },
    current,
  );
  expect(merged).toEqual({ ...current, revision: 3, name: 'Mitt granskade namn' });
  expect(merged).not.toHaveProperty('sections');
  expect(merged).not.toHaveProperty('builtins');
  expect(merged).not.toHaveProperty('propertyOrder');
  expect(current).toEqual(before);
});

test('an independently added answer retains its required saved section when an older presentation is removed', () => {
  const original: ObjectType = {
    ...definition,
    sections: [{ id: 'details', name: 'Detaljer' }],
  };
  const current: ObjectType = {
    ...original,
    revision: 2,
    fields: [
      {
        id: 'serial',
        name: 'Serienummer',
        description: 'Ett oberoende tillägg',
        kind: 'text',
        sectionId: 'details',
      },
    ],
  };
  expect(resolveTypeDefinition('objectType', original, definition, current)).toEqual({
    ...current,
    revision: 3,
  });
});

test('complete proposed object presentation and independent saved fields retain their identities and order', () => {
  const current: ObjectType = {
    ...definition,
    revision: 2,
    fields: [{ id: 'count', name: 'Antal', description: '', kind: 'number' }],
  };
  const proposed: ObjectType = {
    ...definition,
    name: 'Granskad utrustning',
    sections: [{ id: 'details', name: 'Fullständiga uppgifter' }],
    fields: [
      {
        id: 'serial',
        name: 'Serienummer',
        description: '',
        kind: 'text',
        sectionId: 'details',
      },
    ],
    builtins: [{ key: 'description', name: 'Berättelse', sectionId: 'details' }],
    propertyOrder: ['builtin:description', 'field:serial'],
  };
  const merged = resolveTypeDefinition('objectType', definition, proposed, current);
  expect(merged.fields).toEqual([current.fields?.[0], proposed.fields?.[0]]);
  expect(merged.propertyOrder).toEqual(['field:count', 'builtin:description', 'field:serial']);
  expect(merged.sections).toEqual(proposed.sections);
  expect(merged.builtins).toEqual(proposed.builtins);
  expect(merged).toMatchObject({ name: proposed.name, revision: 3 });
});

test('relationship definition review retains independent directions while removing only the explicitly removed field', () => {
  const original: RelationshipType = {
    ...definition,
    forwardLabel: 'förvaras i',
    reverseLabel: 'förvarar',
    fields: [{ id: 'serial', name: 'Serienummer', description: '', kind: 'text' }],
  };
  const current: RelationshipType = { ...original, revision: 2, reverseLabel: 'har i förvar' };
  const proposed = { ...original, forwardLabel: 'står i' };
  delete proposed.fields;
  expect(resolveTypeDefinition('relationshipType', original, proposed, current)).toEqual({
    ...definition,
    revision: 3,
    forwardLabel: 'står i',
    reverseLabel: 'har i förvar',
  });
  expect(resolveTypeDefinition('relationshipType', null, proposed, current)).toEqual({
    ...proposed,
    revision: 3,
  });
});

test('explicit default and hidden builtin placement retain meaningful empty presentation choices', () => {
  const hidden: ObjectType = {
    ...definition,
    builtins: [{ key: 'description', name: 'Berättelse', sectionId: '' }],
    propertyOrder: ['builtin:description'],
  };
  const defaults = { ...definition, builtins: [], propertyOrder: [] };
  const facts = typeDefinitionFacts('objectType', defaults);
  expect(applyTypeDefinitionFacts('objectType', hidden, facts)).toEqual(defaults);
  expect(builtinPresentationChanges(null, hidden)).toEqual([
    'Placering av gemensam egenskap Beskrivning: Utanför typens avsnitt → Berättelse · Dold, behåll värden',
    'Egenskapernas ordning: Inga → Berättelse',
  ]);
  expect(builtinPresentationChanges(hidden, null)).toEqual([
    'Placering av gemensam egenskap Beskrivning: Berättelse · Dold, behåll värden → Utanför typens avsnitt',
    'Egenskapernas ordning: Berättelse → Inga',
  ]);
});

test('independent canonical references stay beside their surviving predecessor or retain their initial position', () => {
  expect(orderedReferences(['a', 'removed'], ['a', 'b', 'new'], ['a', 'b', 'new'])).toEqual([
    'a',
    'b',
    'new',
  ]);
  expect(orderedReferences(['b'], ['a', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
});
