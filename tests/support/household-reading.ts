import { type APIRequestContext, expect } from '@playwright/test';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from './client.js';

/** Synthetic public-HTTP data for the nonvisual Alex → bicycle → garage chain. */
export async function prepareHouseholdReading(
  client: APIRequestContext,
  origin: string,
  fillers = true,
) {
  await signIn(client, origin);
  const { household } = await (await createHousehold(client, origin)).json();
  const path = `${origin}/api/households/${household.id}/map`;
  const read = async (): Promise<MapState> => (await client.get(path)).json();
  const post = async (route: string, data: object) => {
    const current = await read();
    const response = await client.post(`${path}/${route}`, {
      headers: { origin },
      data: { version: current.draft.version, contentVersion: current.contentVersion, ...data },
    });
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  };
  await post('object-type', {
    id: 'read-type',
    baseRevision: null,
    value: {
      name: 'Läsobjekt',
      description: '',
      fields: [
        { id: 'hidden', name: 'Dold egen uppgift', kind: 'text', description: '', sectionId: '' },
      ],
    },
  });
  for (const [id, name, extra] of [
    ['alex', 'Alex', {}],
    [
      'bike',
      'Cykel',
      {
        iconId: 'bike',
        customValues: { hidden: 'Ramens märkning är ett påhittat exempel' },
        financialFacts: {
          price: { knowledge: 'known', value: '2000 SEK' },
          debt: { knowledge: 'none' },
          endDate: { knowledge: 'unknown' },
        },
      },
    ],
    ['garage', 'Garage', { identity: 'unspecified' }],
    ...(fillers
      ? Array.from({ length: 53 }, (_, index) => [`filler-${index}`, `A ${index + 1}`, {}])
      : []),
  ] as const)
    await post('draft', {
      id,
      baseRevision: null,
      value: {
        name,
        typeId: 'read-type',
        description: `Hela beskrivningen för ${name}. `.repeat(15),
        ...extra,
      },
    });
  for (const [id, name] of [
    ['uses', 'Använder'],
    ['storage', 'Förvaras i'],
    ['none', 'Har ingen'],
    ['unknown', 'Okänd koppling'],
  ])
    await post('relationship-type', {
      id,
      baseRevision: null,
      value: {
        name,
        description: '',
        forwardLabel: name.toLocaleLowerCase('sv'),
        reverseLabel:
          id === 'uses'
            ? 'används av'
            : id === 'storage'
              ? 'förvarar'
              : name.toLocaleLowerCase('sv'),
        fields: [
          {
            id: 'note',
            name: 'Dold sambandsuppgift',
            description: '',
            kind: 'text',
            sectionId: '',
          },
        ],
      },
    });
  for (const [id, typeId, sourceId, targetId, knowledge, extra] of [
    ['alex-bike', 'uses', 'alex', 'bike', 'known', {}],
    [
      'bike-garage',
      'storage',
      'bike',
      'garage',
      'uncertain',
      {
        lifecycle: 'ended',
        endDate: { knowledge: 'known', value: '2024-12-31' },
        customValues: { note: 'Sparad dold sambandsuppgift' },
      },
    ],
    ['bike-none', 'none', 'bike', null, 'none', {}],
    ['bike-unknown', 'unknown', 'bike', null, 'unknown', {}],
  ] as const)
    await post('relationship', {
      id,
      baseRevision: null,
      value: { typeId, sourceId, targetId, knowledge, ...extra },
    });
  await post('save', { operationId: 'read-fixture-save' });
  const saved = await read();
  const bike = saved.objects.find((value) => value.id === 'bike');
  const edge = saved.relationships.find((value) => value.id === 'bike-garage');
  if (!bike || !edge) throw new Error('Missing read fixture');
  await post('draft', {
    id: 'bike',
    baseRevision: bike.revision,
    value: {
      ...bike,
      financialFacts: { ...bike.financialFacts, price: { knowledge: 'known', value: '2500 SEK' } },
    },
  });
  await post('relationship', {
    id: edge.id,
    baseRevision: edge.revision,
    value: { ...edge, customValues: { note: 'Föreslagen dold sambandsuppgift' } },
  });
  return { path, read, post };
}
