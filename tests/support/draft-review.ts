import { type APIRequestContext, expect } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from './client.js';

/** Public HTTP preparation shared by automated and manual draft review. */
export async function prepareDraftReview(client: APIRequestContext, origin: string) {
  await signIn(client, origin);
  const { household } = await (await createHousehold(client, origin, 'Utkastgranskning')).json();
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
  const field = {
    id: 'serial',
    name: 'Ramnummer',
    description: 'Hela ramnumret.',
    kind: 'text',
    sectionId: '',
  };
  await post('object-type', {
    id: 'draft-vehicle',
    baseRevision: null,
    value: { name: 'Utkastfordon', description: 'Fordon för granskning', fields: [field] },
  });
  await post('relationship-type', {
    id: 'draft-uses',
    baseRevision: null,
    value: {
      name: 'Granskar',
      description: 'Samband för granskning',
      forwardLabel: 'granskar',
      reverseLabel: 'granskas av',
      fields: [{ ...field, id: 'note', name: 'Dold anteckning' }],
    },
  });
  await post('draft', {
    id: 'draft-bike',
    baseRevision: null,
    value: {
      typeId: 'draft-vehicle',
      name: 'Blå cykel',
      description: 'Hela den sparade beskrivningen',
      customValues: { serial: 'SPARAT-17' },
      financialFacts: { debt: { knowledge: 'none' } },
    },
  });
  await post('save', { operationId: 'draft-review-setup' });
  const saved = await read();
  const bike = saved.objects.find((object) => object.id === 'draft-bike');
  const type = saved.types.find((type) => type.id === 'draft-vehicle');
  const relationshipType = saved.relationshipTypes.find((type) => type.id === 'draft-uses');
  if (!bike || !type || !relationshipType) throw new Error('Missing saved draft-review data');
  await post('draft', {
    id: bike.id,
    baseRevision: bike.revision,
    value: {
      ...bike,
      name: 'Alex blå cykel',
      description: 'Fullständig föreslagen beskrivning',
      customValues: { serial: 'FÖRESLAGET-42' },
      financialFacts: {
        debt: { knowledge: 'unknown' },
        creditLimit: { knowledge: 'uncertain', value: '500 SEK', reportedOn: '2026-01-01' },
      },
    },
  });
  await post('draft', {
    id: 'draft-unspecified',
    baseRevision: null,
    value: {
      typeId: type.id,
      name: 'Ospecificerat fordon',
      description: '',
      identity: 'unspecified',
    },
  });
  await post('draft', {
    id: 'draft-unresolved',
    baseRevision: null,
    value: { typeId: type.id, name: 'Olöst fordon', description: '', identity: 'unresolved' },
  });
  for (const knowledge of ['known', 'unknown', 'none', 'uncertain', 'unresolved'])
    await post('relationship', {
      id: `draft-edge-${knowledge}`,
      baseRevision: null,
      value: {
        typeId: relationshipType.id,
        sourceId:
          knowledge === 'unresolved' || knowledge === 'uncertain' ? 'draft-unspecified' : bike.id,
        targetId:
          knowledge === 'known' ? 'draft-unspecified' : knowledge === 'uncertain' ? bike.id : null,
        knowledge,
        customValues: { note: `Hela dolda uppgiften ${knowledge}` },
      },
    });
  await post('object-type', {
    id: type.id,
    baseRevision: type.revision,
    value: {
      ...type,
      description: 'Föreslagen typbeskrivning',
      fields: [{ ...field, description: 'Föreslagen fältbeskrivning' }],
    },
  });
  await post('relationship-type', {
    id: relationshipType.id,
    baseRevision: relationshipType.revision,
    value: {
      name: relationshipType.name,
      description: relationshipType.description,
      fields: relationshipType.fields,
      forwardLabel: relationshipType.forwardLabel,
      reverseLabel: 'kontrolleras av',
    },
  });
  return { household, path, read, post };
}

/** Expired saved values, explicit active overrides and two distinct authorized images. */
export async function prepareDraftReviewMeanings(client: APIRequestContext, origin: string) {
  const fixture = await prepareDraftReview(client, origin);
  const { household, post, read } = fixture;
  await post('discard', {});
  const saved = await read();
  const bike = saved.objects.find(({ id }) => id === 'draft-bike');
  const type = saved.types.find(({ id }) => id === 'draft-vehicle');
  if (!bike || !type) throw new Error('Missing saved draft-review data');
  const builtins = [
    { key: 'description', name: 'Fordonets berättelse', sectionId: '' },
    { key: 'price', name: 'Avtalat pris', sectionId: '' },
    { key: 'endDate', name: 'Sista giltighetsdag', sectionId: '' },
  ];
  await post('object-type', {
    id: type.id,
    baseRevision: type.revision,
    value: { ...type, builtins },
  });
  await post('draft', {
    id: bike.id,
    baseRevision: bike.revision,
    value: { ...bike, financialFacts: { endDate: { knowledge: 'known', value: '2000-01-01' } } },
  });
  await post('draft', {
    id: 'draft-peer',
    baseRevision: null,
    value: { typeId: type.id, name: 'Röd cykel', description: '' },
  });
  await post('relationship', {
    id: 'draft-expired-edge',
    baseRevision: null,
    value: {
      sourceId: bike.id,
      targetId: 'draft-peer',
      typeId: 'draft-uses',
      knowledge: 'known',
      endDate: { knowledge: 'known', value: '2000-01-01' },
    },
  });
  async function image(background: string) {
    const current = await read();
    const object = current.objects.find(({ id }) => id === bike?.id);
    const response = await client.post(
      `${origin}/api/households/${household.id}/profile-images/${bike?.id}`,
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
  await image('#123abc');
  await post('save', { operationId: 'draft-meaning-setup' });
  const current = await read();
  const currentBike = current.objects.find(({ id }) => id === bike.id);
  const currentType = current.types.find(({ id }) => id === type.id);
  const edge = current.relationships.find(({ id }) => id === 'draft-expired-edge');
  if (!currentBike || !currentType || !edge) throw new Error('Missing saved meaning data');
  await post('object-type', {
    id: type.id,
    baseRevision: currentType.revision,
    value: {
      ...currentType,
      builtins: builtins.map((field) =>
        field.key === 'description' ? { ...field, name: 'Cykelns berättelse' } : field,
      ),
    },
  });
  await post('draft', {
    id: bike.id,
    baseRevision: currentBike.revision,
    value: { ...currentBike, lifecycle: 'active', description: '' },
  });
  await image('#bc321a');
  await post('relationship', {
    id: edge.id,
    baseRevision: edge.revision,
    value: { ...edge, lifecycle: 'active' },
  });
  return fixture;
}

/** Arbitrary names on both custom and builtin properties remain readable. */
export async function prepareDraftReviewWrapping(client: APIRequestContext, origin: string) {
  const fixture = await prepareDraftReview(client, origin);
  const state = await fixture.read();
  const type = state.types.find((value) => value.id === 'draft-vehicle');
  if (!type) throw new Error('Missing draft type');
  const customLabel = 'Ramnummer'.repeat(12);
  const builtinLabel = 'Berättelse'.repeat(12);
  await fixture.post('object-type', {
    id: type.id,
    baseRevision: type.revision,
    value: {
      ...type,
      fields: type.fields?.map((field) => ({ ...field, name: customLabel })),
      builtins: [{ key: 'description', name: builtinLabel, sectionId: '' }],
    },
  });
  const bike = (await fixture.read()).draft.changes.find((change) => change.id === 'draft-bike');
  if (!bike?.after || !bike.before) throw new Error('Missing draft bike');
  await fixture.post('draft', {
    id: bike.id,
    baseRevision: bike.before.revision,
    value: bike.after,
  });
  return { ...fixture, customLabel, builtinLabel };
}

/** Four proposals change only explicit lifecycle mode, leaving names and dates intact. */
export async function prepareDraftReviewLifecycle(client: APIRequestContext, origin: string) {
  const fixture = await prepareDraftReview(client, origin);
  await fixture.post('discard', {});
  for (const [id, name, date] of [
    ['past', 'Utgånget provobjekt', '2000-01-01'],
    ['future', 'Framtida provobjekt', '9999-12-31'],
  ]) {
    await fixture.post('draft', {
      id,
      baseRevision: null,
      value: {
        typeId: 'draft-vehicle',
        name,
        description: '',
        financialFacts: { endDate: { knowledge: 'known', value: date } },
      },
    });
    await fixture.post('relationship', {
      id: `edge-${id}`,
      baseRevision: null,
      value: {
        typeId: 'draft-uses',
        sourceId: id,
        targetId: 'draft-bike',
        knowledge: 'known',
        endDate: { knowledge: 'known', value: date },
      },
    });
  }
  await fixture.post('save', { operationId: 'lifecycle-only-setup' });
  const saved = await fixture.read();
  for (const value of saved.objects.filter(({ id }) => id === 'past' || id === 'future'))
    await fixture.post('draft', {
      id: value.id,
      baseRevision: value.revision,
      value: { ...value, lifecycle: 'active' },
    });
  for (const value of saved.relationships.filter(({ id }) => id.startsWith('edge-')))
    await fixture.post('relationship', {
      id: value.id,
      baseRevision: value.revision,
      value: { ...value, lifecycle: 'active' },
    });
  return fixture;
}
