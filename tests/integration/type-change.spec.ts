import { type APIRequestContext, expect, test } from '@playwright/test';
import sharp from 'sharp';
import { draftConflicts } from '../../src/shared/draft-conflicts.js';
import type { MapState, SaveReceipt } from '../../src/shared/map.js';
import { createHousehold, openWorkspace, signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';

async function setup(client: APIRequestContext, origin: string) {
  await signIn(client, origin);
  const { household } = await (await createHousehold(client, origin)).json();
  const path = `${origin}/api/households/${household.id}/map`;
  const read = async (actor = client): Promise<MapState> => (await actor.get(path)).json();
  const post = (route: string, data: unknown, actor = client) =>
    actor.post(`${path}/${route}`, { headers: { origin }, data });
  const save = async (operationId: string, actor = client): Promise<SaveReceipt> => {
    const response = await post(
      'save',
      { version: (await read(actor)).draft.version, operationId },
      actor,
    );
    expect(response.status()).toBe(200);
    return (await response.json()).receipt;
  };
  const object = async (id: string, update: Record<string, unknown>, actor = client) => {
    const state = await read(actor);
    const before = state.objects.find((item) => item.id === id);
    return post(
      'draft',
      {
        version: state.draft.version,
        id,
        baseRevision: before?.revision ?? null,
        value: { typeId: 'cycle', name: id, description: '', ...before, ...update },
      },
      actor,
    );
  };
  for (const [id, name, kind] of [
    ['cycle', 'Cykel', 'text'],
    ['vehicle', 'Motorfordon', 'number'],
  ]) {
    expect(
      (
        await post('object-type', {
          version: (await read()).draft.version,
          id,
          baseRevision: null,
          value: {
            name,
            description: '',
            fields: [
              { id: 'serial', name: 'Nummer', description: '', kind },
              { id: 'insured', name: 'Försäkrad', description: '', kind: 'boolean' },
            ],
          },
        })
      ).status(),
    ).toBe(200);
  }
  expect(
    (
      await object('bike', {
        name: 'Alex blå cykel',
        customValues: { serial: 'SYNTH-42', insured: false },
      })
    ).status(),
  ).toBe(200);
  expect((await object('garage', { name: 'Garaget' })).status()).toBe(200);
  const state = await read();
  expect(
    (
      await post('relationship', {
        version: state.draft.version,
        id: 'parking',
        baseRevision: null,
        value: {
          typeId: state.relationshipTypes[0].id,
          sourceId: 'bike',
          targetId: 'garage',
          knowledge: 'known',
        },
      })
    ).status(),
  ).toBe(200);
  await save('setup');
  return { path, read, post, save, object };
}

test('TYP-06: type changes review displaced values and preserve identity, edges and historical reading through restart', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read, post, save } = await setup(page.request, installation.origin);
    const initial = await read();
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Uppgifter för Alex blå cykel', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await page.getByLabel('Objekttyp', { exact: true }).selectOption('vehicle');
    const previous = page.getByRole('dialog', { name: 'Ta bort tidigare egna fält?', exact: true });
    await expect(previous).toContainText('Nummer: SYNTH-42');
    await expect(previous).toContainText('Försäkrad: Nej');
    await previous
      .getByRole('button', { name: 'Ta bort fältvärdena och byt typ', exact: true })
      .click();
    const form = page.getByRole('dialog', { name: 'Redigera Alex blå cykel', exact: true });
    await form.getByRole('button', { name: 'Egna fält', exact: true }).click();
    await expect(form.getByLabel('Nummer', { exact: true })).toHaveValue('');
    await expect(form.getByLabel('Försäkrad', { exact: true })).toHaveValue('');
    await form.getByLabel('Nummer', { exact: true }).fill('42');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    const review = page.getByRole('region', { name: 'Hela mitt utkast' });
    await expect(review).toContainText('Objekttyp: Cykel');
    await expect(review).toContainText('Objekttyp: Motorfordon');
    await expect(review).toContainText('Nummer: SYNTH-42');
    await expect(review).toContainText('Nummer: 42');
    await expect(review).toContainText('Försäkrad: Obesvarat');
    await installation.restart();
    await page.reload();
    await openWorkspace(page);
    await expect(review).toContainText('Nummer: SYNTH-42');
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('status', { name: 'Hushållsarbetets status' })).toContainText(
      'Sparat',
