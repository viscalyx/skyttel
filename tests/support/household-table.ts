import { type APIRequestContext, expect } from '@playwright/test';
import sharp from 'sharp';
import type { MapState, ObjectValue } from '../../src/shared/map.js';
import { createHousehold, signIn } from './client.js';

/** Shared public-HTTP preparation for automated and manual table checks. */
export async function prepareHouseholdTable(client: APIRequestContext, origin: string) {
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
  async function image(background: string) {
    const current = await read();
    const object = current.objects.find((object) => object.id === 'table-0');
    const response = await client.post(
      `${origin}/api/households/${household.id}/profile-images/table-0`,
      {
        headers: {
          origin,
          'X-Skyttel-Draft-Version': String(current.draft.version),
          'X-Skyttel-Content-Version': String(current.contentVersion),
          'X-Skyttel-Object-Revision': String(object?.revision ?? null),
          'Content-Type': 'image/png',
        },
        data: await sharp({ create: { width: 96, height: 96, channels: 3, background } })
          .png()
          .toBuffer(),
      },
    );
    expect(response.status(), await response.text()).toBe(200);
  }
  await post('object-type', {
    id: 'table-type-2',
    baseRevision: null,
    value: {
      name: 'Typ 2',
      description: '',
      fields: [
        { id: 'note', name: 'Egen anteckning', description: '', kind: 'text', sectionId: '' },
      ],
    },
  });
  await post('object-type', {
    id: 'table-type-10',
    baseRevision: null,
    value: { name: 'Typ 10', description: '', fields: [] },
  });
  const longText = 'En lång beskrivning med hushållets fullständiga uppgifter. '.repeat(12);
  const names = [
    'A 2',
    'A 10',
    'Zebra',
    'Åke',
    'Älg',
    'Örn',
    ...Array.from({ length: 51 }, (_, index) => `B ${index + 1}`),
  ];
  for (const [index, name] of names.entries())
    await post('draft', {
      id: `table-${index}`,
      baseRevision: null,
      value: {
        name,
        typeId: index % 2 ? 'table-type-10' : 'table-type-2',
        description: index === 0 ? longText : `Beskrivning ${name}`,
        ...(index === 0
          ? {
              iconId: 'bike',
              customValues: { note: 'Lång egen uppgift '.repeat(30) },
              financialFacts: {
                price: { knowledge: 'unknown' },
                currency: { knowledge: 'unknown' },
                debt: { knowledge: 'none' },
                creditLimit: {
                  knowledge: 'uncertain',
                  value: '100 000 SEK',
                  reportedOn: '2026-01-01',
                },
              },
            }
          : {}),
      },
    });
  for (const [id, name, lifecycle] of [
    ['ended', 'Upphört prov', 'ended'],
    ['removed', 'Borttaget prov', undefined],
    ['proposed-removal', 'Tas bort prov', 'ended'],
  ] as const)
    await post('draft', {
      id,
      baseRevision: null,
      value: { name, typeId: 'table-type-2', description: '', ...(lifecycle ? { lifecycle } : {}) },
    });
  await image('#3355aa');
  await post('save', { operationId: 'table-initial' });
  const saved = await read();
  const original = saved.objects.find((object) => object.id === 'table-0');
  if (!original) throw new Error('Missing prepared object');
  await post('draft', {
    id: original.id,
    baseRevision: original.revision,
    value: {
      ...original,
      description: `${longText}Föreslagen sluttext.`,
      financialFacts: {
        ...original.financialFacts,
        price: { knowledge: 'known', value: '299 SEK' },
      },
    },
  });
  for (const id of ['removed', 'proposed-removal']) {
    const object = saved.objects.find((object) => object.id === id);
    if (!object) throw new Error('Missing prepared removal');
    await post('draft', { id, baseRevision: object.revision, value: null });
    if (id === 'removed') {
      // Save this deletion separately, then restore the changed proposal.
      await post('save', { operationId: 'table-deletion' });
      const next = (await read()).objects.find((object) => object.id === 'table-0');
      if (!next) throw new Error('Missing updated object');
      const value: ObjectValue = {
        ...next,
        iconId: 'car',
        financialFacts: { ...next.financialFacts, price: { knowledge: 'known', value: '399 SEK' } },
        description: `${longText}Nytt föreslaget slut.`,
      };
      await post('draft', { id: next.id, baseRevision: next.revision, value });
    }
  }
  await post('draft', {
    id: 'new-object',
    baseRevision: null,
    value: { name: 'Nytt prov', typeId: 'table-type-2', description: '' },
  });
  await image('#33aa55');
  return { path, read, post, longText };
}
