import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { HouseholdMap } from '../../src/client/HouseholdMap.js';
import '../../src/client/styles.css';
import type { MapState } from '../../src/shared/map.js';
import { defaultViewSettings } from '../../src/shared/personal-view.js';

const state: MapState = {
  userId: 'alex',
  contentVersion: 1,
  types: [
    { id: 'person', householdId: 'home', revision: 1, name: 'Person', description: '' },
    { id: 'service', householdId: 'home', revision: 1, name: 'Tjänst', description: '' },
  ],
  relationshipTypes: [],
  relationships: [],
  objects: [
    {
      id: 'alex',
      householdId: 'home',
      typeId: 'person',
      revision: 1,
      name: 'Alex',
      description: '',
    },
    {
      id: 'music',
      householdId: 'home',
      typeId: 'service',
      revision: 1,
      name: 'Tonmoln',
      description: '',
    },
  ],
  draft: { version: 0, changes: [] },
};

async function open(width: number) {
  await page.viewport(width, 960);
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/view'))
      return Response.json({
        contentVersion: 1,
        positions: [],
        settings: { ...defaultViewSettings, version: 0 },
      });
    if (url.endsWith('/operations')) return Response.json({ operations: [] });
    if (url.endsWith('/text-assistant')) return Response.json({ available: true });
    if (url.includes('/map?')) return Response.json(state);
    throw new Error(`Unexpected request: ${url}`);
  });
  render(
    <main>
      <section className="panel household-panel">
        <HouseholdMap householdId="home" />
      </section>
    </main>,
  );
  await expect
    .element(page.getByRole('button', { name: 'Nytt objekt', exact: true }))
    .toBeVisible();
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('desktop keeps the wide map beside its inspector, with speech above and the object list below', async () => {
  await open(1440);
  const surface = document.querySelector('.spatial-surface');
  const inspector = page.getByRole('region', { name: 'Val och redigering' });
  await expect.element(inspector).toBeVisible();
  expect(surface).not.toBeNull();
  const bounds = surface?.getBoundingClientRect();
  const details = inspector.element().getBoundingClientRect();
  const speech = page.getByRole('region', { name: 'Talsamtal' }).element().getBoundingClientRect();
  expect(bounds?.width).toBeGreaterThan(800);
  expect(details.left).toBeGreaterThan(bounds?.right ?? 0);
  expect(speech.bottom).toBeLessThan(details.top);
  expect(
    page.getByRole('button', { name: 'Alex', exact: true }).element().getBoundingClientRect().top,
  ).toBeGreaterThan(bounds?.bottom ?? 0);
  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await expect.element(page.getByLabelText('Objektets namn', { exact: true })).toHaveValue('Alex');
});

test('phone starts with the list and preserves an edited name through full-map navigation', async () => {
  await open(390);
  await expect
    .element(page.getByRole('button', { name: 'Lista och detaljer', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Alex', exact: true }).click();
  await page.getByLabelText('Objektets namn', { exact: true }).fill('Alex ändrat');
  await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
  await expect
    .element(page.elementLocator(document.querySelector('.assistant-bar') as HTMLElement))
    .not.toBeVisible();
  await expect
    .element(page.elementLocator(document.querySelector('.map-inspector') as HTMLElement))
    .not.toBeVisible();
  const bounds = document.querySelector('.spatial-surface')?.getBoundingClientRect();
  expect(bounds?.height).toBeGreaterThan(500);
  expect(bounds?.width).toBeGreaterThan(340);
  await page.getByRole('button', { name: 'Visa detaljer och utkast', exact: true }).click();
  await expect
    .element(page.getByLabelText('Objektets namn', { exact: true }))
    .toHaveValue('Alex ändrat');
  await page.getByRole('button', { name: 'Till kartan', exact: true }).click();
  await page.getByRole('button', { name: 'Lista och detaljer', exact: true }).click();
  await expect.element(page.getByRole('region', { name: 'Talsamtal' })).toBeVisible();
  await expect
    .element(page.getByLabelText('Objektets namn', { exact: true }))
    .toHaveValue('Alex ändrat');
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
});

test('full map fills the available desktop and landscape phone area', async () => {
  await open(1280);
  await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
  const surface = () => document.querySelector('.spatial-surface')?.getBoundingClientRect();
  await expect.poll(() => surface()?.width).toBeGreaterThan(1200);
  await page.viewport(844, 390);
  await expect.poll(() => surface()?.width).toBeGreaterThan(800);
  await expect.poll(() => surface()?.height).toBeGreaterThan(200);
  await page.getByRole('button', { name: 'Välj objekt: Alex', exact: true }).click();
  await expect.element(page.getByLabelText('Objektets namn', { exact: true })).toHaveValue('Alex');
});
