import { expect, test } from 'vitest';
import { draftResult, historyResult } from '../../../src/server/text-assistant-results.js';
import type {
  MapObject,
  MapRelationship,
  ObjectType,
  RelationshipType,
  SaveReceipt,
} from '../../../src/shared/map.js';

const cardType: ObjectType = {
  id: 'card',
  householdId: 'household',
  revision: 1,
  name: 'Kort',
  description: '',
  fields: [
    { id: 'last-digits', name: 'Sista siffror', description: '', kind: 'text' },
    { id: 'active', name: 'Aktivt', description: '', kind: 'boolean' },
    { id: 'limit', name: 'Köpgräns', description: '', kind: 'number' },
  ],
};
const usageType: RelationshipType = {
  id: 'usage',
  householdId: 'household',
  revision: 1,
  name: 'Användning',
  description: '',
  forwardLabel: 'används av',
};

function card(value: Partial<MapObject> = {}): MapObject {
  return {
    id: 'household-card',
    householdId: 'household',
    revision: 1,
    typeId: 'card',
    name: 'Hushållskortet',
    description: '',
    ...value,
  };
}

function usage(value: Partial<MapRelationship> = {}): MapRelationship {
  return {
    id: 'subscription-user',
    householdId: 'household',
    revision: 1,
    typeId: 'usage',
    sourceId: 'subscription',
    targetId: 'alex',
    knowledge: 'known',
    ...value,
  };
}

function receipt(value: Partial<SaveReceipt> = {}): SaveReceipt {
  return {
    operationId: 'save-card',
    householdId: 'household',
    userId: 'user',
    savedAt: '2026-09-24T12:00:00.000Z',
    contentVersion: 2,
    draftVersion: 3,
    changes: [],
    ...value,
  };
}

test('draft details report corrected card values, knowledge and dates without claiming a save', () => {
  const before = card({
    name: 'Gamla kortnamnet',
    description: 'Extrkort',
    financialFacts: {
      price: { knowledge: 'known', value: '119' },
      currency: { knowledge: 'known', value: 'SEK' },
      debt: { knowledge: 'known', value: '2500', reportedOn: '2026-08-01' },
    },
    customValues: { 'last-digits': '1234', active: true, limit: 100 },
  });
  const after = card({
    financialFacts: {
      price: { knowledge: 'known', value: '129' },
      currency: { knowledge: 'known', value: 'SEK' },
      debt: { knowledge: 'uncertain', value: '2400', reportedOn: '2026-09-01' },
    },
    customValues: { 'last-digits': '9876', active: false, limit: 0 },
  });

  const result = draftResult({
    version: 3,
    changes: [{ id: before.id, type: cardType, before, after }],
  });

  expect(result.kind).toBe('draft');
  expect(result.message).toContain('namn: Gamla kortnamnet → Hushållskortet');
  expect(result.message).toContain('beskrivning: Extrkort → tom');
  expect(result.message).toContain('Pris: 119 → 129');
  expect(result.message).toContain(
    'Senast uppgiven skuld: 2500 (2026-08-01) → osäkert uppgivet: 2400 (2026-09-01)',
  );
  expect(result.message).toContain('Sista siffror: 1234 → 9876');
  expect(result.message).toContain('Aktivt: true → false');
  expect(result.message).toContain('Köpgräns: 100 → 0');
  expect(result.message).not.toMatch(/Valuta|[Ss]parat/);
});

test('a corrected relationship names both people and preserves uncertainty', () => {
  const before = usage();
  const result = draftResult({
    version: 4,
    changes: [],
    relationships: [
      {
        id: before.id,
        before,
        after: usage({ targetId: 'lo', knowledge: 'uncertain' }),
        type: usageType,
        objectNames: { subscription: 'Musikabonnemanget', alex: 'Alex', lo: 'Lo' },
      },
    ],
  });

  expect(result).toEqual({
    kind: 'draft',
    message:
      'Utkast: Ändra sambandet Musikabonnemanget används av Alex → Musikabonnemanget används av Lo (osäkert uppgivet).',
  });
});

test('a corrected object type retains the historical names of removed custom fields', () => {
  const before = card({ customValues: { 'last-digits': '1234' } });
  const bankType: ObjectType = { ...cardType, id: 'bank', name: 'Bankkonto', fields: [] };
  const result = draftResult({
    version: 4,
    changes: [
      {
        id: before.id,
        before,
        after: card({ typeId: 'bank' }),
        type: bankType,
        beforeType: cardType,
      },
    ],
  });

  expect(result.message).toContain('objekttyp: Kort → Bankkonto');
  expect(result.message).toContain('Sista siffror: 1234 → ej angivet');
});

test('history details distinguish missing facts, unknown facts and explicitly no value', () => {
  const before = card({
    financialFacts: {
      price: { knowledge: 'known', value: '0' },
      currency: { knowledge: 'known', value: 'SEK' },
      debt: { knowledge: 'unknown', reportedOn: '2026-08-01' },
      creditLimit: { knowledge: 'known', value: '20000' },
    },
  });
  const after = card({
    revision: 2,
    description: 'Reserverat för hushållet',
    financialFacts: {
      price: { knowledge: 'none' },
      currency: { knowledge: 'unknown' },
      paymentInterval: { knowledge: 'known', value: 'månadsvis' },
      startDate: { knowledge: 'known', value: '2026-09-01' },
      endDate: { knowledge: 'unknown' },
      terms: { knowledge: 'uncertain', value: 'Räntefritt första månaden' },
      debt: { knowledge: 'none', reportedOn: '2026-09-01' },
      usedCredit: { knowledge: 'known', value: '0', reportedOn: '2026-09-01' },
    },
    customValues: { 'last-digits': '5678' },
  });

  const result = historyResult(receipt({ changes: [{ type: cardType, before, after }] }));

  expect(result.kind).toBe('history');
  expect(result.message).toContain('Sparandet: Ändrade Hushållskortet');
  expect(result.message).toContain('beskrivning: tom → Reserverat för hushållet');
  expect(result.message).toContain('Pris: 0 → uttryckligen inget');
  expect(result.message).toContain('Valuta: SEK → okänt');
  expect(result.message).toContain('Betalningsintervall: ej angivet → månadsvis');
  expect(result.message).toContain('Startdatum: ej angivet → 2026-09-01');
  expect(result.message).toContain('Slutdatum: ej angivet → okänt');
  expect(result.message).toContain(
    'Avtalsvillkor: ej angivet → osäkert uppgivet: Räntefritt första månaden',
  );
  expect(result.message).toContain(
    'Senast uppgiven skuld: okänt (2026-08-01) → uttryckligen inget (2026-09-01)',
  );
  expect(result.message).toContain('Beviljat kreditutrymme: 20000 → ej angivet');
  expect(result.message).toContain('Utnyttjad kredit: ej angivet → 0 (2026-09-01)');
  expect(result.message).toContain('Sista siffror: ej angivet → 5678');
});

test('draft details include object, relationship and type additions and removals', () => {
  const removedCard = card({ id: 'old-card', name: 'Gamla kortet' });
  const removedType = { ...cardType, id: 'old-type', name: 'Gammal korttyp' };
  const removedRelationshipType = { ...usageType, id: 'old-usage', name: 'Tidigare användning' };
  const result = draftResult({
    version: 8,
    changes: [
      { id: 'new-card', type: cardType, before: null, after: card() },
      { id: removedCard.id, type: cardType, before: removedCard, after: null },
    ],
    relationships: [
      {
        id: 'new-usage',
        before: null,
        after: usage({ targetId: null, knowledge: 'unknown' }),
        type: usageType,
        objectNames: { subscription: 'Musikabonnemanget' },
      },
      {
        id: 'old-usage',
        before: usage({ targetId: null, knowledge: 'none' }),
        after: null,
        type: usageType,
        objectNames: { subscription: 'Filmabonnemanget' },
      },
    ],
    objectTypes: [
      { id: cardType.id, before: null, after: cardType },
      { id: removedType.id, before: removedType, after: null },
    ],
    relationshipTypes: [
      { id: usageType.id, before: null, after: usageType },
      { id: removedRelationshipType.id, before: removedRelationshipType, after: null },
    ],
  });

  expect(result.message).toContain('Lägg till Hushållskortet');
  expect(result.message).toContain('Ta bort Gamla kortet');
  expect(result.message).toContain('Lägg till sambandet Musikabonnemanget används av okänt');
  expect(result.message).toContain(
    'Ta bort sambandet Filmabonnemanget används av uttryckligen ingen',
  );
  expect(result.message).toContain('Lägg till objekttypen Kort');
  expect(result.message).toContain('Ta bort objekttypen Gammal korttyp');
  expect(result.message).toContain('Lägg till sambandstypen Användning');
  expect(result.message).toContain('Ta bort sambandstypen Tidigare användning');
});

test('history reports saved additions, removals and relationship corrections in the past tense', () => {
  const result = historyResult(
    receipt({
      changes: [
        { type: cardType, before: null, after: card() },
        { type: cardType, before: card({ name: 'Gamla kortet' }), after: null },
      ],
      relationships: [
        {
          id: 'subscription-user',
          before: usage({ targetId: null, knowledge: 'unknown' }),
          after: usage({ targetId: null, knowledge: 'none', revision: 2 }),
          type: usageType,
          objectNames: { subscription: 'Musikabonnemanget' },
        },
        {
          id: 'second-user',
          before: null,
          after: usage({ id: 'second-user', targetId: 'lo', knowledge: 'uncertain' }),
          type: usageType,
          objectNames: { subscription: 'Filmabonnemanget', lo: 'Lo' },
        },
      ],
      objectTypes: [
        {
          id: cardType.id,
          before: cardType,
          after: { ...cardType, name: 'Betalkort', revision: 2 },
        },
      ],
      relationshipTypes: [
        {
          id: usageType.id,
          before: usageType,
          after: { ...usageType, name: 'Använder', revision: 2 },
        },
      ],
    }),
  );

  expect(result.kind).toBe('history');
  expect(result.message).toContain('Lade till Hushållskortet');
  expect(result.message).toContain('Tog bort Gamla kortet');
  expect(result.message).toContain(
    'Ändrade sambandet Musikabonnemanget används av okänt → Musikabonnemanget används av uttryckligen ingen',
  );
  expect(result.message).toContain(
    'Lade till sambandet Filmabonnemanget används av Lo (osäkert uppgivet)',
  );
  expect(result.message).toContain('Ändrade objekttypen Betalkort');
  expect(result.message).toContain('Ändrade sambandstypen Använder');
  expect(result.message).not.toMatch(/Utkast|Lägg till|Ta bort|Ångrat/);
});

test('an empty draft and absent history are explicit rather than implied changes', () => {
  expect(draftResult({ version: 0, changes: [] })).toEqual({
    kind: 'draft',
    message: 'Utkastet är tomt.',
  });
  expect(historyResult(undefined)).toEqual({
    kind: 'history',
    message: 'Det finns inget tidigare sparande i hushållets historik.',
  });
});
