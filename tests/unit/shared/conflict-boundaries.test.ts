import { expect, test } from 'vitest';
import {
  type ConflictChoices,
  type ConflictProperty,
  combineConflictProperties,
  conflictBasis,
  conflictCombinationError,
  conflictProperties,
  conflictPropertyLabel,
  conflictPropertyValue,
  conflictValueText,
  sameConflictValue,
} from '../../../src/shared/conflict-properties.js';
import {
  conflictRemovalPlan,
  conflictRemovalProperties,
} from '../../../src/shared/conflict-removal.js';
import { specialConflict } from '../../../src/shared/conflict-special.js';
import {
  removedConflictDefinition,
  restorationIsCurrent,
} from '../../../src/shared/definition-restoration.js';
import type { DraftConflict } from '../../../src/shared/draft-conflicts.js';
import { draftDiscardPlan, draftProposalRefs } from '../../../src/shared/draft-discard.js';
import type {
  MapObject,
  MapRelationship,
  MapState,
  ObjectType,
  RelationshipType,
} from '../../../src/shared/map.js';

const objectType: ObjectType = {
  id: 'vehicle',
  householdId: 'home',
  revision: 1,
  name: 'Fordon',
  description: 'Fullständig definition',
  sections: [{ id: 'details', name: 'Detaljer' }],
  fields: [
    {
      id: 'note',
      name: 'Anteckning',
      description: 'Hela texten',
      kind: 'text',
      sectionId: 'details',
    },
    { id: 'count', name: 'Antal', description: '', kind: 'number', sectionId: '' },
    { id: 'date', name: 'Datum', description: '', kind: 'date' },
    { id: 'flag', name: 'Ja eller nej', description: '', kind: 'boolean' },
  ],
  builtins: [{ key: 'debt', name: 'Låneskuld', sectionId: 'details' }],
};
const edgeType: RelationshipType = {
  id: 'uses',
  householdId: 'home',
  revision: 1,
  name: 'Använder',
  description: '',
  forwardLabel: 'använder',
  reverseLabel: 'används av',
  fields: objectType.fields,
};
const alex: MapObject = {
  id: 'alex',
  householdId: 'home',
  revision: 1,
  typeId: 'vehicle',
  name: 'Alex',
  description: '',
};
const bike: MapObject = {
  ...alex,
  id: 'bike',
  name: 'Cykeln',
  description: 'Hela beskrivningen',
  profileImageId: 'saved-image',
};
const edge: MapRelationship = {
  id: 'edge',
  householdId: 'home',
  revision: 1,
  typeId: 'uses',
  sourceId: 'alex',
  targetId: 'bike',
  knowledge: 'known',
};
function household(): MapState {
  return {
    userId: 'alex',
    contentVersion: 1,
    types: [structuredClone(objectType)],
    relationshipTypes: [structuredClone(edgeType)],
    objects: [structuredClone(alex), structuredClone(bike)],
    relationships: [structuredClone(edge)],
    draft: { version: 3, changes: [] },
  };
}
const property = (key: string): ConflictProperty => ({
  key,
  label: key,
  before: undefined,
  saved: undefined,
  proposed: undefined,
});

test('combining explicit choices preserves whole nested facts, false and zero without mutating comparisons', () => {
  const fields: ConflictProperty[] = [
    { ...property('name'), saved: 'Sparat', proposed: 'Föreslaget' },
    {
      ...property('financialFacts.debt'),
      saved: { knowledge: 'known', value: '0' },
      proposed: { knowledge: 'uncertain', value: '1200', reportedOn: '2026-01-01' },
    },
    { ...property('customValues.flag'), saved: false, proposed: false },
    { ...property('customValues.count'), saved: 0, proposed: 0 },
    { ...property('description'), saved: undefined, proposed: undefined },
  ];
  const before = structuredClone(fields);
  expect(combineConflictProperties(fields, {})).toBeNull();
  expect(combineConflictProperties(fields, { name: 'saved' })).toBeNull();
  expect(
    combineConflictProperties(fields, { name: 'proposed', 'financialFacts.debt': 'saved' }),
  ).toEqual({
    name: 'Föreslaget',
    financialFacts: { debt: { knowledge: 'known', value: '0' } },
    customValues: { flag: false, count: 0 },
  });
  expect(
    combineConflictProperties(fields, { name: 'saved', 'financialFacts.debt': 'proposed' }),
  ).toEqual({
    name: 'Sparat',
    financialFacts: { debt: { knowledge: 'uncertain', value: '1200', reportedOn: '2026-01-01' } },
    customValues: { flag: false, count: 0 },
  });
  expect(fields).toEqual(before);
  expect(sameConflictValue({ a: { b: false }, c: 0 }, { c: 0, a: { b: false } })).toBe(true);
  expect(sameConflictValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  expect(sameConflictValue({ a: 1 }, { a: 2 })).toBe(false);
  expect(sameConflictValue(null, {})).toBe(false);
  expect(sameConflictValue('1', 1)).toBe(false);
  expect(conflictPropertyValue({ customValues: { flag: false } }, 'customValues.flag')).toBe(false);
  expect(conflictPropertyValue(null, 'customValues.flag')).toBeUndefined();
  expect(conflictPropertyLabel({ ...property('note'), label: 'Anteckning' })).toBe('Anteckning');
  expect(conflictPropertyLabel({ ...property('note'), label: 'Anteckning' }, 'saved')).toBe(
    'Anteckning',
  );
});

test('combined object and relationship values validate actual field kinds and calendar dates', () => {
  const state = household();
  const objectConflict: DraftConflict = { kind: 'object', id: 'bike', current: bike };
  const valid = {
    name: 'Cykeln',
    typeId: 'vehicle',
    customValues: { note: '', count: 0, date: '2024-02-29', flag: false },
  };
  expect(conflictCombinationError(state, objectConflict, valid)).toBe('');
  expect(conflictCombinationError(state, objectConflict, null)).toBe('');
  expect(conflictCombinationError(state, objectConflict, { definition: objectType })).toBe('');
  expect(conflictCombinationError(state, objectConflict, { ...valid, name: '  ' })).toBe(
    'Objektet behöver ett namn.',
  );
  expect(
    conflictCombinationError(state, objectConflict, { ...valid, typeId: 'missing' }),
  ).toContain('typen finns inte');
  for (const customValues of [
    { absent: 'value' },
    { count: '0' },
    { count: Number.POSITIVE_INFINITY },
    { flag: 'false' },
    { note: false },
    { note: 'a'.repeat(2001) },
  ])
    expect(conflictCombinationError(state, objectConflict, { ...valid, customValues })).toContain(
      'valt värde',
    );
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '02-01-2026'])
    expect(
      conflictCombinationError(state, objectConflict, { ...valid, customValues: { date } }),
    ).toContain('valt datum');
  const relationshipConflict: DraftConflict = { kind: 'relationship', id: 'edge', current: edge };
  expect(
    conflictCombinationError(state, relationshipConflict, {
      ...edge,
      customValues: valid.customValues,
    }),
  ).toBe('');
  expect(
    conflictCombinationError(state, relationshipConflict, {
      ...edge,
      knowledge: 'unknown',
      targetId: null,
    }),
  ).toBe('');
  for (const update of [
    { knowledge: 'known', targetId: null },
    { knowledge: 'uncertain', targetId: null },
    { knowledge: 'none', targetId: 'bike' },
  ])
    expect(conflictCombinationError(state, relationshipConflict, { ...edge, ...update })).toContain(
      'målobjektet',
    );
  expect(
    conflictCombinationError(state, relationshipConflict, { ...edge, sourceId: 'absent' }),
  ).toContain('valt objekt');
  expect(
    conflictCombinationError(state, relationshipConflict, { ...edge, targetId: 'absent' }),
  ).toContain('valt objekt');
  expect(
    conflictCombinationError(state, { ...relationshipConflict, id: 'another' }, { ...edge }),
  ).toBe('Det valda sambandet finns redan i kartan.');
  state.draft.changes = [{ id: 'bike', before: bike, after: null, type: objectType }];
  expect(conflictCombinationError(state, relationshipConflict, { ...edge })).toContain(
    'valt objekt',
  );
  state.draft.changes = [
    { id: 'new-bike', before: null, after: { ...bike, name: 'Ny cykel' }, type: objectType },
  ];
  expect(
    conflictCombinationError(state, relationshipConflict, { ...edge, targetId: 'new-bike' }),
  ).toBe('');
});

test('definition combinations reject detached sections and invalid property order while accepting hidden and legacy fields', () => {
  const state = household();
  for (const kind of ['objectType', 'relationshipType'] as const) {
    const conflict: DraftConflict = { kind, id: 'type', current: null };
    expect(
      conflictCombinationError(state, conflict, { fields: [{ id: 'note', sectionId: 'missing' }] }),
    ).toContain('avsnitt som saknas');
    expect(
      conflictCombinationError(state, conflict, { fields: [{ id: 'note', sectionId: '' }] }),
    ).toBe('');
    expect(
      conflictCombinationError(state, conflict, {
        fields: [{ id: 'note', sectionId: 'custom-fields' }],
      }),
    ).toBe('');
    expect(
      conflictCombinationError(state, conflict, {
        fields: [{ id: 'note' }],
        propertyOrder: ['field:absent'],
      }),
    ).toContain('uppgift som saknas');
    expect(
      conflictCombinationError(state, conflict, {
        fields: [{ id: 'a' }, { id: 'b' }],
        propertyOrder: ['field:a', 'field:a'],
      }),
    ).toContain('uppgift som saknas');
    expect(
      conflictCombinationError(state, conflict, {
        fields: [{ id: 'a' }, { id: 'b' }],
        propertyOrder: ['field:a'],
      }),
    ).toContain('uppgift som saknas');
  }
  expect(
    conflictCombinationError(
      state,
      { kind: 'relationshipType', id: 'uses', current: edgeType },
      { fields: [{ id: 'note' }], propertyOrder: ['field:note'] },
    ),
  ).toBe('');
});

test('comparison text retains full definitions, missing values, hidden fields, knowledge and actual proposed endpoint names', () => {
  const state = household();
  state.draft.changes = [
    { id: 'alex', before: alex, after: { ...alex, name: 'Mitt Alex' }, type: objectType },
  ];
  state.draft.objectTypes = [
    { id: 'vehicle', before: objectType, after: { ...objectType, name: 'Mitt fordon' } },
  ];
  state.draft.relationshipTypes = [
    { id: 'uses', before: edgeType, after: { ...edgeType, name: 'Mitt samband' } },
  ];
  const text = (key: string, value: unknown) => conflictValueText(state, property(key), value);
  expect(text('definition', null)).toBe('Borttaget');
  expect(text('definition', objectType)).toBe('Fordon · Fullständig definition');
  expect(text('definition', edgeType)).toBe('Använder');
  expect(text('identity', 'unresolved')).toBe('Behöver redas ut');
  expect(text('name', null)).toBe('Ej uppgivet');
  expect(text('typeId', 'vehicle')).toBe('Fordon');
  expect(text('typeId', 'absent')).toBe('absent');
  expect(text('sourceId', 'alex')).toBe('Mitt Alex');
  expect(text('targetId', 'bike')).toBe('Cykeln');
  expect(text('targetId', 'absent')).toBe('absent');
  expect(text('iconId', 'bike')).toBe('Cykel');
  expect(text('profileImageId', 'saved-image')).toBe('Den sparade profilbilden');
  expect(text('profileImageId', 'new-image')).toBe('Din föreslagna profilbild');
  expect(text('relationship', edge)).toBe('Alex → använder → Cykeln');
  expect(text('sections', objectType.sections)).toBe('Detaljer');
  expect(text('sections', [])).toBe('Inga avsnitt');
  expect(text('fields', objectType.fields)).toBe(
    'Anteckning: Text · Detaljer — Hela texten; Antal: Tal · Dold uppgift; Datum: Datum · Egna fält; Ja eller nej: Ja eller nej · Egna fält',
  );
  expect(text('fields', [])).toBe('Inga egna fält');
  expect(text('builtins', objectType.builtins)).toBe('Låneskuld · Detaljer');
  expect(text('builtins', [])).toBe('Inga övriga uppgifter');
  expect(
    text('propertyOrder', ['field:note', 'builtin:debt', 'field:absent', 'builtin:absent']),
  ).toBe('Anteckning → Låneskuld → Uppgift som saknas → Uppgift som saknas');
  expect(text('propertyOrder', [])).toBe('Ingen särskild ordning');
  expect(text('financialFacts.debt', { knowledge: 'none' })).toBe('Uttryckligen inget');
  expect(text('financialFacts.debt', { knowledge: 'unknown' })).toBe('Okänt');
  expect(
    text('financialFacts.debt', {
      knowledge: 'uncertain',
      value: '500 SEK',
      reportedOn: '2026-01-01',
    }),
  ).toBe('500 SEK (Osäkert uppgivet) — datum för uppgiften: 2026-01-01');
  for (const [value, expected] of [
    ['known', 'Känt'],
    ['unknown', 'Okänt'],
    ['none', 'Uttryckligen inget'],
    ['uncertain', 'Osäkert uppgivet'],
    ['unresolved', 'Behöver redas ut'],
    ['new-mode', 'new-mode'],
  ])
    expect(text('knowledge', value)).toBe(expected);
  expect(text('customValues.flag', false)).toBe('Nej');
  expect(text('customValues.flag', true)).toBe('Ja');
  expect(text('customValues.count', 0)).toBe('0');
  expect(text('other', { full: 'value' })).toBe('{"full":"value"}');
});

test('restoration basis expires on generation, removed revision and household changes for both definition kinds', () => {
  const state = household();
  state.removedDefinitions = { objectTypes: [objectType], relationshipTypes: [edgeType] };
  for (const [kind, definition] of [
    ['objectType', objectType],
    ['relationshipType', edgeType],
  ] as const) {
    const conflict = { kind, id: definition.id };
    const authority = { contentVersion: 1, definition };
    expect(removedConflictDefinition(state, conflict)).toEqual(definition);
    expect(restorationIsCurrent(state, conflict, authority)).toBe(true);
    expect(restorationIsCurrent(state, conflict, { ...authority, contentVersion: 2 })).toBe(false);
    expect(
      restorationIsCurrent(state, conflict, {
        ...authority,
        definition: { ...definition, revision: 2 },
      }),
    ).toBe(false);
    expect(
      restorationIsCurrent(state, conflict, {
        ...authority,
        definition: { ...definition, householdId: 'other' },
      }),
    ).toBe(false);
    expect(restorationIsCurrent(state, { ...conflict, id: 'absent' }, authority)).toBe(false);
    const empty = { ...state, removedDefinitions: undefined };
    expect(removedConflictDefinition(empty, conflict)).toBeUndefined();
  }
  expect(removedConflictDefinition(state, { kind: 'object', id: 'bike' })).toBeUndefined();
  state.draft.objectTypes = [
    { id: objectType.id, before: objectType, after: { ...objectType, name: 'Nytt namn' } },
  ];
  const conflict: DraftConflict = { kind: 'objectType', id: objectType.id, current: null };
  expect(conflictProperties(state, conflict)).toEqual([
    {
      key: 'definition',
      label: 'Typdefinition',
      before: objectType,
      saved: null,
      proposed: { ...objectType, name: 'Nytt namn' },
    },
  ]);
  expect(conflictBasis(state, conflict)).toMatchObject({
    restoration: { contentVersion: 1, definition: objectType },
  });
  const oldBasis = conflictBasis(state, conflict);
  state.contentVersion = 2;
  expect(conflictBasis(state, conflict)).not.toEqual(oldBasis);
  expect(conflictProperties(state, { kind: 'object', id: 'absent', current: null })).toEqual([]);
});

test('special conflicts distinguish saved and private duplicates, simultaneous missing type and ordinary correction', () => {
  const state = household();
  state.draft.relationships = [{ id: 'mine', before: null, after: edge, type: edgeType }];
  const conflict: DraftConflict = {
    kind: 'relationship',
    id: 'mine',
    current: null,
    duplicates: [edge],
    type: edgeType,
  };
  expect(specialConflict(state, conflict)).toMatchObject({
    kind: 'discard-relationship',
    reason: 'Ett sparat samband har redan samma typ, riktning och objekt.',
    afterDiscard: 'Det redan sparade sambandet och dess uppgifter behålls.',
  });
  state.relationships = [];
  expect(specialConflict(state, conflict)).toMatchObject({
    reason: 'Ett annat förslag i ditt utkast har samma typ, riktning och objekt.',
    afterDiscard: 'Det andra förslaget i ditt utkast och dess uppgifter behålls.',
  });
  const missingType = specialConflict(state, { ...conflict, type: null });
  expect(missingType?.additionalBlockers).toHaveLength(1);
  expect(missingType?.additionalBlockers?.[0].instruction).toContain(
    'Inställningar → Typer och egna fält',
  );
  expect(
    specialConflict(state, { ...conflict, duplicates: [], missingEndpoints: ['bike'] }),
  ).toMatchObject({
    reason: 'Ett objekt som sambandet pekar på saknas.',
    afterDiscard: 'Om du vill lägga till ett nytt samband gör du det den vanliga vägen.',
  });
  expect(specialConflict(state, { ...conflict, duplicates: undefined, type: null })).toMatchObject({
    kind: 'outside-correction',
  });
  expect(specialConflict(state, { ...conflict, duplicates: undefined })).toMatchObject({
    kind: 'outside-correction',
    instruction: expect.stringContaining('vanliga sambandsdialogen'),
  });
  state.draft.changes = [{ id: 'bike', before: null, after: bike, type: objectType }];
  expect(
    specialConflict(state, { kind: 'object', id: 'bike', current: null, type: objectType }),
  ).toMatchObject({
    kind: 'outside-correction',
    instruction: expect.stringContaining('vanliga objektdialogen'),
  });
  expect(
    specialConflict(state, { kind: 'object', id: 'bike', current: null, type: null }),
  ).toMatchObject({ kind: 'missing-object-type', action: 'Ta bort objektet ur ditt utkast' });
  state.draft.changes[0].before = bike;
  expect(specialConflict(state, { kind: 'object', id: 'bike', current: null })).toMatchObject({
    kind: 'removed',
  });
  state.draft.relationships[0].before = edge;
  expect(specialConflict(state, { kind: 'relationship', id: 'mine', current: null })).toMatchObject(
    { kind: 'removed', warning: 'Ett ändringsförslag kan inte återställa ett borttaget samband.' },
  );
  expect(specialConflict(state, { kind: 'object', id: 'absent', current: bike })).toBeNull();
});

test('removal choices reject incomplete, invented and stale combinations while retaining independent proposals', () => {
  const state = household();
  state.draft.changes = [
    { id: 'bike', before: bike, after: null, type: objectType },
    { id: 'independent', before: null, after: { ...alex, name: 'Annat objekt' }, type: objectType },
  ];
  const conflict: DraftConflict = {
    kind: 'object',
    id: 'bike',
    current: bike,
    connections: [edge],
  };
  const before = structuredClone(state);
  for (const choices of [
    {},
    { object: 'saved' },
    { object: 'proposed', 'relationship:edge': 'saved' },
    { object: 'saved', 'relationship:edge': 'saved', invented: 'saved' },
    { object: 'invalid', 'relationship:edge': 'saved' },
  ])
    expect(conflictRemovalPlan(state, conflict, choices as ConflictChoices)).toBeNull();
  const keep = conflictRemovalPlan(state, conflict, {
    object: 'saved',
    'relationship:edge': 'saved',
  });
  expect(keep?.draft.changes.map((change) => change.id)).toEqual(['independent']);
  expect(keep?.effects).toEqual([{ target: conflict, kind: 'discard' }]);
  const remove = conflictRemovalPlan(state, conflict, {
    object: 'proposed',
    'relationship:edge': 'proposed',
  });
  expect(remove?.draft.changes.map((change) => change.id)).toEqual(['bike', 'independent']);
  expect(remove?.draft.relationships).toEqual([
    {
      id: 'edge',
      before: edge,
      after: null,
      type: edgeType,
      beforeType: edgeType,
      proposedAt: expect.any(String),
      objectNames: { alex: 'Alex', bike: 'Cykeln' },
    },
  ]);
  expect(remove?.effects).toHaveLength(2);
  expect(
    conflictRemovalPlan({ ...state, types: [] }, conflict, {
      object: 'proposed',
      'relationship:edge': 'proposed',
    }),
  ).toBeNull();
  expect(
    conflictRemovalPlan({ ...state, relationshipTypes: [] }, conflict, {
      object: 'saved',
      'relationship:edge': 'proposed',
    }),
  ).toBeNull();
  expect(
    conflictRemovalPlan({ ...state, draft: { version: 3, changes: [] } }, conflict, {
      object: 'saved',
      'relationship:edge': 'saved',
    }),
  ).toBeNull();
  expect(
    conflictRemovalProperties(state, { kind: 'objectType', id: 'vehicle', current: objectType }),
  ).toEqual([]);
  expect(state).toEqual(before);
  state.draft.relationships = [
    {
      id: 'edge',
      before: edge,
      after: null,
      type: edgeType,
      objectNames: { bike: 'Historisk cykel' },
      removedWithObjects: ['bike'],
    },
  ];
  const relationshipConflict: DraftConflict = { kind: 'relationship', id: 'edge', current: edge };
  expect(
    conflictRemovalPlan(state, relationshipConflict, { relationship: 'saved' })?.draft
      .relationships,
  ).toEqual([]);
  const retained = conflictRemovalPlan(state, relationshipConflict, { relationship: 'proposed' });
  expect(retained?.draft.relationships?.[0]).toMatchObject({
    before: edge,
    after: null,
    type: edgeType,
    beforeType: edgeType,
    objectNames: { alex: 'Alex', bike: 'Cykeln' },
  });
  expect(retained?.draft.relationships?.[0]).not.toHaveProperty('removedWithObjects');
  expect(conflictBasis(state, relationshipConflict)).toMatchObject({
    types: [edgeType],
    endpoints: [
      { id: 'alex', revision: 1 },
      { id: 'bike', revision: 1 },
    ],
  });
  const absent = { ...state, objects: [] };
  expect(
    conflictRemovalPlan(absent, relationshipConflict, { relationship: 'proposed' })?.draft
      .relationships?.[0].objectNames,
  ).toEqual({ bike: 'Historisk cykel' });
  expect(
    conflictRemovalPlan({ ...state, relationshipTypes: [] }, relationshipConflict, {
      relationship: 'proposed',
    }),
  ).toBeNull();
  expect(
    conflictRemovalPlan({ ...state, draft: { version: 3, changes: [] } }, relationshipConflict, {
      relationship: 'proposed',
    }),
  ).toBeNull();
});

test('discarding type proposals reports dependent corrections without removing their values or independent proposals', () => {
  const state = household();
  state.draft.changes = [{ id: 'bike', before: null, after: bike, type: objectType }];
  state.draft.relationships = [{ id: 'edge', before: null, after: edge, type: edgeType }];
  state.draft.objectTypes = [{ id: 'vehicle', before: objectType, after: objectType }];
  state.draft.relationshipTypes = [{ id: 'uses', before: edgeType, after: edgeType }];
  const before = structuredClone(state);
  const objectAfter = { ...state.draft, objectTypes: [] };
  expect(draftDiscardPlan(state, objectAfter, 'objectType', 'vehicle')).toEqual({
    removed: ['Objekttyp-vehicle'],
    affected: [
      {
        key: 'object-bike',
        reason: 'Förslaget använder den sparade typen i stället för typförslaget.',
      },
    ],
  });
  expect(draftDiscardPlan({ ...state, types: [] }, objectAfter, 'objectType', 'vehicle')).toEqual({
    removed: ['Objekttyp-vehicle'],
    affected: [{ key: 'object-bike', reason: 'Objekttypen saknas.' }],
  });
  const relationshipAfter = { ...state.draft, relationshipTypes: [] };
  expect(
    draftDiscardPlan(
      { ...state, relationshipTypes: [] },
      relationshipAfter,
      'relationshipType',
      'uses',
    ),
  ).toEqual({
    removed: ['Sambandstyp-uses'],
    affected: [{ key: 'relationship-edge', reason: 'Sambandstypen saknas.' }],
  });
  expect(draftDiscardPlan(state, { version: 4, changes: [] }, 'all', '')).toEqual({
    removed: ['object-bike', 'relationship-edge', 'Objekttyp-vehicle', 'Sambandstyp-uses'],
    affected: [],
  });
  expect(draftProposalRefs({ version: 0, changes: [] })).toEqual([]);
  expect(state).toEqual(before);
});
