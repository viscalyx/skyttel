import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { HouseholdMap } from '../../src/client/HouseholdMap.js';
import '../../src/client/styles.css';
import { defaultConversationPreferences } from '../../src/shared/conversation-preferences.js';
import type { MapState } from '../../src/shared/map.js';
import { defaultViewSettings } from '../../src/shared/personal-view.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The browser renders the real map and panels against the public HTTP boundary.
 * Persistence and authorization of these same forms have real-SQLite unit cases. */
async function open(withDraft = true) {
  await page.viewport(1440, 900);
  const lo = {
    id: 'lo',
    householdId: 'home',
    revision: 1,
    typeId: 'person',
    name: 'Lo Exempel',
    description: 'Sparad beskrivning',
  };
  const person = {
    id: 'person',
    householdId: 'home',
    revision: 1,
    name: 'Person',
    description: '',
  };
  const state: MapState = {
    userId: 'alex',
    contentVersion: 1,
    types: [person],
    relationshipTypes: [],
    relationships: [],
    objects: [lo],
    draft: {
      version: withDraft ? 1 : 0,
      changes: withDraft
        ? [
            {
              id: 'lo',
              before: lo,
              after: { ...lo, description: 'Privat förslag' },
              type: person,
              beforeType: person,
            },
          ]
        : [],
    },
  };
  const writes: { path: string; body: unknown }[] = [];
  let failProposal = false;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/conversation-preferences'))
      return Response.json(defaultConversationPreferences);
    if (url.endsWith('/conversation-consent')) return Response.json({ saved: null });
    if (url.endsWith('/text-assistant')) return Response.json({ available: false });
    if (url.endsWith('/operations')) return Response.json({ operations: [] });
    if (url.endsWith('/view'))
      return Response.json({
        contentVersion: 1,
        positions: [],
        settings: { ...defaultViewSettings, version: 0 },
      });
    if (url.includes('/map?') || url.endsWith('/map')) return Response.json(state);
    if (url.endsWith('/object-form') && init?.method === 'POST') {
      writes.push({ path: url, body: JSON.parse(String(init.body)) });
      if (failProposal) throw new Error('Synthetic proposal transport failure');
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  render(
    <main>
      <HouseholdMap householdId="home" />
    </main>,
  );
  await expect.element(page.getByRole('region', { name: 'Rymdkarta', exact: true })).toBeVisible();
  return {
    writes,
    failProposal: () => {
      failProposal = true;
    },
  };
}

test('leaving an edited object protects unsent text and discards only that text, keeping saved and draft values', async () => {
  const home = await open();
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.getByRole('button', { name: 'Uppgifter för Lo Exempel', exact: true }).click();
  const object = page.getByRole('region', { name: 'Lo Exempel', exact: true });
  await object.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Redigera Lo Exempel', exact: true });
  const field = form.getByLabelText('Beskrivning', { exact: true });
  await field.fill('Fortfarande oskickat');
  await form.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await page.getByRole('button', { name: 'Fortsätt redigera', exact: true }).click();
  await expect.element(field).toHaveValue('Fortfarande oskickat');
  await form.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await page.getByRole('button', { name: 'Kasta ändringarna och fortsätt', exact: true }).click();
  await expect.element(form).not.toBeInTheDocument();
  expect(home.writes).toEqual([]);
  await object.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
  await expect
    .element(form.getByLabelText('Beskrivning', { exact: true }))
    .toHaveValue('Privat förslag');
  await form.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  const review = page.getByRole('region', { name: 'Hela mitt utkast', exact: true });
  await expect
    .element(review.getByText('Beskrivning: Privat förslag', { exact: true }))
    .toBeVisible();
  await expect
    .element(review.getByText('Beskrivning: Sparad beskrivning', { exact: true }))
    .toBeVisible();
});

test('unknown complete object staging requires checking before retry and retains all form text without another send', async () => {
  const home = await open(false);
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page
    .getByRole('region', { name: 'Lista och utkast', exact: true })
    .getByRole('button', { name: 'Nytt objekt', exact: true })
    .click();
  const name = page.getByLabelText('Namn', { exact: true });
  await name.fill('Privat oskickat objekt');
  home.failProposal();
  const submit = page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true });
  await submit.click();
  const check = page.getByRole('button', {
    name: 'Kontrollera om ändringen lades i utkastet',
    exact: true,
  });
  await expect.element(check).toBeVisible();
  await expect.element(submit).toBeDisabled();
  await check.click();
  await expect.element(check).not.toBeInTheDocument();
  await expect.element(submit).not.toBeDisabled();
  await expect.element(name).toHaveValue('Privat oskickat objekt');
  expect(home.writes).toHaveLength(1);
  expect(home.writes[0].body).toMatchObject({
    version: 0,
    contentVersion: 1,
    value: { name: 'Privat oskickat objekt' },
  });
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await page.getByRole('button', { name: 'Kasta ändringarna och fortsätt', exact: true }).click();
  await expect.element(name).not.toBeInTheDocument();
  await page
    .getByRole('region', { name: 'Lista och utkast', exact: true })
    .getByRole('button', { name: 'Nytt objekt', exact: true })
    .click();
  await expect.element(name).toHaveValue('');
  expect(home.writes).toHaveLength(1);
});
