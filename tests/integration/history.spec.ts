import { type APIRequestContext, expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState, SaveReceipt } from '../../src/shared/map.js';
import { createHousehold, signIn, utilityButton } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

async function setup(client: APIRequestContext, origin: string) {
  await signIn(client, origin);
  const { household } = await (await createHousehold(client, origin)).json();
  const path = `${origin}/api/households/${household.id}/map`;
  const read = async (): Promise<MapState> => (await client.get(path)).json();
  const post = (route: string, data: unknown) =>
    client.post(`${path}/${route}`, { headers: { origin }, data });
  const object = async (id: string, name: string, extra = {}) => {
    const state = await read();
    const before = state.objects.find((item) => item.id === id);
    expect(
      (
        await post('draft', {
          version: state.draft.version,
          id,
          baseRevision: before?.revision ?? null,
          value: { typeId: state.types[0].id, description: '', ...before, name, ...extra },
        })
      ).ok(),
    ).toBe(true);
  };
  const save = async (operationId: string): Promise<SaveReceipt> => {
    const response = await post('save', { version: (await read()).draft.version, operationId });
    expect(response.ok()).toBe(true);
    return (await response.json()).receipt;
  };
  return { household, path, read, post, object, save };
}

test('HISTORIK-01: Reports preserves table work and lists only completed saves latest first', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await setup(page.request, installation.origin);
    await data.object('person', 'Lo Exempel');
    await data.save('initial');
    await data.object('person', 'Lo Lind');
    await data.save('rename');
    await data.object('private', 'Privat person');
    const before = await data.read();
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await (await utilityButton(page, 'Tabell')).click();
    const search = page.getByRole('searchbox', { name: 'Sök objekt i tabellen' });
    await search.fill('Lo Lind');
    await (await utilityButton(page, 'Rapporter')).click();
    const reports = page.getByRole('region', { name: 'Rapporter', exact: true });
    await expect(reports.getByRole('tab').first()).toHaveAccessibleName('Ändringshistorik');
    const history = reports.getByRole('region', { name: 'Ändringshistorik', exact: true });
    await expect(history.getByRole('article')).toHaveCount(2);
    const first = history.getByRole('article').first();
    await expect(first).toContainText('Lo Lind');
    await expect(first).toContainText('Alex Exempel');
    await expect(history).not.toContainText('Privat person');
    await first.getByText('Visa ändringarna', { exact: true }).click();
    await expect(first.getByText('Namn: Lo Exempel.', { exact: true })).toBeVisible();
    await expect(first.getByText('Namn: Lo Lind.', { exact: true })).toBeVisible();
    await reports.getByRole('button', { name: 'Tillbaka till arbetet', exact: true }).click();
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('Lo Lind');
    expect((await data.read()).draft).toEqual(before.draft);
  } finally {
    await installation.close();
  }
});

for (const width of [1280, 390, 320]) {
  test(`HISTORIK-06: Reports exposes complete historical values with keyboard at ${width}px`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      await page.setViewportSize({ width, height: 850 });
      const data = await setup(page.request, installation.origin);
      await data.object('subscription', 'Familjeabonnemang', {
        description: 'Hushållets musik',
        financialFacts: {
          debt: { knowledge: 'uncertain', value: '1 200 SEK', reportedOn: '2026-06-01' },
        },
      });
      await data.save('initial');
      await data.object('subscription', 'Musik för familjen');
      await data.save('rename');
      await page.goto(`${installation.origin}/households/${data.household.id}`);
      await (await utilityButton(page, 'Rapporter')).click();
      const history = page.getByRole('region', { name: 'Ändringshistorik', exact: true });
      const card = history.getByRole('article').first();
      await card.getByText('Visa ändringarna', { exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(card.getByText('Namn: Familjeabonnemang.', { exact: true })).toBeVisible();
      await expect(card.getByText('Namn: Musik för familjen.', { exact: true })).toBeVisible();
      for (const side of ['Före sparandet', 'Efter sparandet']) {
        await expect(
          card.locator(`xpath=.//p[preceding-sibling::h5[1][text()="${side}"]]`).filter({
            hasText: 'Beskrivning: Hushållets musik',
          }),
        ).toBeVisible();
