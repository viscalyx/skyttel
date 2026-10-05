import { type APIRequestContext, expect, test } from '@playwright/test';
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
      await expect(card).toContainText('1 200');
      await expect(card).toContainText('Osäkert uppgivet');
      await expect(card).toContainText('2026-06-01');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(history.getByRole('button', { name: /Ångra/ })).toHaveCount(0);
    } finally {
      await installation.close();
    }
  });
}

test('HISTORIK-07: failed and delayed Reports reads preserve newer focus and retry real saves', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await setup(page.request, installation.origin);
    await data.object('person', 'Lo Exempel');
    await data.save('initial');
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await page.route('**/map/history?**', (route) => route.abort(), { times: 1 });
    await (await utilityButton(page, 'Rapporter')).click();
    await expect(page.getByRole('alert')).toContainText('Historiken kunde inte hämtas');
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      '**/map/history?**',
      async (route) => {
        await waiting;
        await route.continue();
      },
      { times: 1 },
    );
    await page.getByRole('button', { name: 'Hämta historik igen' }).click();
    await expect(
      page.getByRole('heading', { name: 'Ändringshistorik', exact: true }),
    ).toBeFocused();
    const back = page.getByRole('button', { name: 'Tillbaka till arbetet', exact: true });
    await back.focus();
    release();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(back).toBeFocused();
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    await installation.close();
  }
});

test('HISTORIK-10: a direct save link reads historical types after their definitions change', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await setup(page.request, installation.origin);
    await data.object('person', 'Lo Exempel');
    const receipt = await data.save('initial');
    const state = await data.read();
    const type = state.types[0];
    expect(
      (
        await data.post('object-type', {
          version: state.draft.version,
          id: type.id,
          baseRevision: type.revision,
          value: {
            name: 'Dagens personbenämning',
            description: type.description,
            fields: type.fields ?? [],
            sections: type.sections,
            builtins: type.builtins,
            propertyOrder: type.propertyOrder,
          },
        })
      ).ok(),
    ).toBe(true);
    await data.save('type-rename');
    await page.goto(
      `${installation.origin}/households/${data.household.id}?report=history&save=${receipt.operationId}&savedBy=${encodeURIComponent(receipt.userId)}`,
    );
    const card = page.getByRole('article').filter({ hasText: 'Sparande: initial' });
    await expect(card.getByText(`Objekttyp: ${type.name}.`, { exact: true })).toBeVisible();
    await expect(card.getByRole('heading', { level: 3 })).toBeFocused();
    await expect(card).not.toContainText('Dagens personbenämning');
    await expect(
      card.getByRole('link', { name: 'Länk till sparandet', exact: true }),
    ).toHaveAttribute('href', /report=history.*save=initial/);
    await expect(page.getByRole('region', { name: 'Samtal med Skyttel', exact: true })).toHaveCount(
      0,
    );
  } finally {
    await installation.close();
  }
});

test('HISTORIK-11: private rejected and pending save attempts never enter shared Reports', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await setup(page.request, installation.origin);
    await data.object('person', 'Lo Exempel');
    await data.save('completed');
    await data.object('private', 'Osparad person');
    const before = await data.read();
    const rejected = await data.post('operations', {
      operationId: 'private-rejected',
      version: before.draft.version - 1,
      contentVersion: before.contentVersion,
    });
    expect(rejected.ok()).toBe(true);
    expect((await rejected.json()).operation.status).toBe('rejected');
    const pending = await data.post('operations', {
      operationId: 'private-pending',
      version: before.draft.version,
      contentVersion: before.contentVersion,
    });
    expect(pending.ok()).toBe(true);
    expect((await pending.json()).operation.status).toBe('pending');
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await (await utilityButton(page, 'Rapporter')).click();
    const history = page.getByRole('region', { name: 'Ändringshistorik', exact: true });
    await expect(history.getByRole('article')).toHaveCount(1);
    await expect(history).toContainText('Lo Exempel');
    await expect(history).not.toContainText('Osparad person');
    await expect(history).not.toContainText('private-rejected');
    await expect(history).not.toContainText('private-pending');
    expect(await data.read()).toEqual(before);
  } finally {
    await installation.close();
  }
});
