import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { HouseholdMap } from '../../../src/client/HouseholdMap.js';
import type { MapState } from '../../../src/shared/map.js';
import { applicationFixture } from '../server/fixture.js';

let fixture: Awaited<ReturnType<typeof applicationFixture>>;
let client: ReturnType<typeof fixture.client>;
let householdId: string;
let path: string;
const read = async (): Promise<MapState> => (await client.request(path)).json();
beforeEach(async () => {
  fixture = await applicationFixture();
  client = fixture.client();
  await client.signIn();
  householdId = (await (await client.json('/api/households', { name: 'Linden' })).json()).household
    .id;
  path = `/api/households/${householdId}/map`;
  const state = await read();
  await client.json(`${path}/draft`, {
    id: 'person',
    version: 0,
    baseRevision: null,
    value: { typeId: state.types[0].id, name: 'Lo Exempel', description: 'Befintlig text' },
  });
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
    client.request(url, {
      ...init,
      headers: { ...init?.headers, origin: fixture.config.origin },
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fixture.close();
});
async function open() {
  render(<HouseholdMap householdId={householdId} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Lista' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Lo Exempel' }));
  await userEvent.click(screen.getByRole('button', { name: 'Redigera valt objekt' }));
  return within(screen.getByRole('group', { name: 'Objektets detaljer' }));
}
test('Swedish and canonical searches stage an icon into the same object proposal and preserve unsent text', async () => {
  const details = await open();
  const picker = within(details.getByRole('region', { name: 'Ikon' }));
  const search = picker.getByRole('searchbox', { name: 'Sök ikon' });
  await userEvent.type(search, 'cykel');
  await userEvent.click(picker.getByRole('button', { name: 'Välj Cykel' }));
  await screen.findByText('Förslaget finns i ditt privata utkast. Kartan är inte ändrad.');
  expect((await read()).draft.changes[0].after).toMatchObject({
    iconId: 'bike',
    description: 'Befintlig text',
  });
  await userEvent.type(details.getByLabelText('Beskrivning', { exact: true }), ' och nytt');
  expect((search as HTMLInputElement).disabled).toBe(true);
  await userEvent.click(picker.getByRole('button', { name: 'Lägg uppgifterna i utkastet först' }));
  await userEvent.clear(search);
  await userEvent.type(search, 'telescope');
  await userEvent.click(picker.getByRole('button', { name: 'Välj telescope' }));
  await screen.findByText('Förslaget finns i ditt privata utkast. Kartan är inte ändrad.');
  expect((await read()).draft.changes[0].after).toMatchObject({
    iconId: 'telescope',
    description: 'Befintlig text och nytt',
  });
  await userEvent.clear(search);
  await userEvent.type(search, 'xyz-no-icon');
  expect(picker.getByText(/Inga ikoner matchar/)).toBeTruthy();
  await userEvent.click(picker.getByRole('button', { name: 'Typens standardikon' }));
  await screen.findByText('Förslaget finns i ditt privata utkast. Kartan är inte ändrad.');
  expect((await read()).draft.changes[0].after).not.toHaveProperty('iconId');
});
