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

test('draft and history details report complete typed properties and explicit status', () => {
  const before = card({
    properties: [
      { id: 'price', label: 'Pris', kind: 'number', value: 129 },
      { id: 'flag', label: 'Aktivt', kind: 'boolean', value: false },
    ],
  });
  const after = card({
    name: 'Nytt kort',
    lifecycle: 'ended',
    properties: [
      { id: 'price', label: 'Pris', kind: 'number', value: 0 },
      { id: 'flag', label: 'Aktivt', kind: 'boolean' },
      { id: 'date', label: 'Slutdatum', kind: 'date', value: '2024-02-29' },
      { id: 'unknown', label: 'Anteckning' },
    ],
  });
  for (const result of [
    draftResult({ version: 1, changes: [{ id: after.id, type: cardType, before, after }] }),
    historyResult(receipt({ changes: [{ type: cardType, before, after }] })),
  ]) {
    expect(result.message).toContain('Pris: 129 (Tal) → Pris: 0 (Tal)');
    expect(result.message).toContain('Aktivt: Nej (Ja/nej) → Aktivt: Tomt (Ja/nej)');
    expect(result.message).toContain('Slutdatum: 2024-02-29 (Datum)');
    expect(result.message).toContain('Anteckning: Tomt (ingen datatyp)');
    expect(result.message).toContain('Gäller: ej angivet → upphört');
  }
});
test('corrected relationships name both endpoints and retain ordinary uncertainty properties', () => {
  const before = usage();
  const after = usage({
    targetId: 'kim',
    properties: [{ id: 'uncertain', label: 'Osäkert uppgivet', kind: 'boolean', value: true }],
  });
  const result = draftResult({
    version: 1,
    changes: [],
    relationships: [
      {
        id: before.id,
        type: usageType,
        before,
        after,
        objectNames: { subscription: 'Musik', alex: 'Alex', kim: 'Kim' },
      },
    ],
  });
  expect(result.message).toContain('Musik används av Alex → Musik används av Kim');
  expect(result.message).toContain('Osäkert uppgivet: Ja (Ja/nej)');
});
test.each(['addition', 'removal'] as const)(
  'requested summaries retain all values during %s',
  (kind) => {
    const object = card({
      identity: 'unspecified',
      iconId: 'bike',
      profileImageId: 'image',
      properties: [{ id: 'memo', label: 'Beskrivning', kind: 'text', value: 'Påhittad uppgift' }],
    });
    const before = kind === 'removal' ? object : null,
      after = kind === 'addition' ? object : null;
    const result = historyResult(receipt({ changes: [{ type: cardType, before, after }] }));
    expect(result.message).toContain(
      kind === 'addition' ? 'Lade till Hushållskortet' : 'Tog bort Hushållskortet',
    );
    expect(result.message).toContain('Påhittad uppgift');
    expect(result.message).toContain('ospecificerat objekt');
    expect(result.message).toContain('Cykel');
    expect(result.message).toContain('bild');
  },
);
test('type explanations and directional labels remain readable before and after a correction', () => {
  const after = {
    ...usageType,
    name: 'Ägande',
    description: 'Ägarens koppling',
    forwardLabel: 'ägs av',
    reverseLabel: 'äger',
  };
  const result = historyResult(
    receipt({ relationshipTypes: [{ id: usageType.id, before: usageType, after }] }),
  );
  expect(result.message).toContain('namn: Användning → Ägande');
  expect(result.message).toContain('beskrivning: tom → Ägarens koppling');
  expect(result.message).toContain('Framåtriktning: används av → ägs av');
  expect(result.message).toContain('Omvänd riktning: ej angivet → äger');
});
test('icon descriptions preserve historical type defaults when resetting the visible choice', () => {
  const result = historyResult(
    receipt({
      changes: [
        { type: { ...cardType, name: 'Fordon' }, before: card({ iconId: 'bike' }), after: card() },
      ],
    }),
  );
  expect(result.message).toContain('Ikon: Cykel → Typens standardikon');
});
test('relationship corrections use endpoint names from the matching side of object renames', () => {
  const before = card({ id: 'subscription', name: 'Gamla abonnemanget' }),
    after = card({ id: 'subscription', name: 'Nya abonnemanget' });
  const result = historyResult(
    receipt({
      changes: [{ type: cardType, before, after }],
      relationships: [
        {
          id: 'usage',
          type: usageType,
          before: usage(),
          after: usage({ lifecycle: 'ended' }),
          objectNames: { subscription: 'Nya abonnemanget', alex: 'Alex' },
        },
      ],
    }),
  );
  expect(result.message).toContain(
    'Gamla abonnemanget används av Alex → Nya abonnemanget används av Alex',
  );
});
test('missing historical definitions stay unknown when the selected type changes', () => {
  const afterType = { ...cardType, id: 'bank', name: 'Bankkonto' };
  const result = historyResult(
    receipt({
      changes: [{ before: card(), after: card({ typeId: afterType.id }), type: afterType }],
      relationships: [
        {
          id: 'usage',
          before: usage(),
          after: usage({ typeId: 'ownership' }),
          type: { ...usageType, id: 'ownership', name: 'Ägande', forwardLabel: 'ägs av' },
          objectNames: { subscription: 'Musik', alex: 'Alex' },
        },
      ],
    }),
  );
  expect(result.message).toContain('objekttyp: okänd objekttyp → Bankkonto');
  expect(result.message).toContain('Musik okänd sambandstyp Alex → Musik ägs av Alex');
  expect(result.message).toContain('sambandstyp: okänd sambandstyp → Ägande');
});
test('an empty draft and missing history explicitly describe the available result', () => {
  expect(draftResult({ version: 0, changes: [] }).message).toBe('Utkastet är tomt.');
  expect(historyResult(undefined).message).toBe(
    'Det finns inget tidigare sparande i hushållets historik.',
  );
});
