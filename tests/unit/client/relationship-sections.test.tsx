import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import {
  openConflictReview,
  renderHouseholdWork,
  saveHouseholdDraft,
} from '../../support/native-household-unit.js';
import { applicationFixture } from '../server/fixture.js';

let fixture: Awaited<ReturnType<typeof applicationFixture>>;
let client: ReturnType<typeof fixture.client>;
let householdId: string;
let path: string;
const read = async (): Promise<MapState> => (await client.request(path)).json();
beforeEach(async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
  fixture = await applicationFixture();
  client = fixture.client();
  await client.signIn();
  householdId = (await (await client.json('/api/households', { name: 'Linden' })).json()).household
    .id;
  path = `/api/households/${householdId}/map`;
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
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  fixture.close();
});
async function open() {
  renderHouseholdWork(householdId);
  await userEvent.click(await screen.findByRole('button', { name: 'Ny sambandstyp' }));
  const editor = within(screen.getByRole('group', { name: 'Sambandstypens definition' }));
  await userEvent.type(editor.getByLabelText('Sambandstypens namn'), 'Förvaring');
  await userEvent.type(editor.getByLabelText('Benämning från startobjektet'), 'förvaras i');
  await userEvent.type(editor.getByLabelText('Benämning från målobjektet'), 'innehåller');
  return editor;
}

test('relationship section and field controls retain focus, descriptions and placement through the actual map draft', async () => {
  const editor = await open();
  const first = editor.getByLabelText('Avsnitt 1');
  await userEvent.clear(first);
  await userEvent.type(first, 'Uppgifter');
  await userEvent.click(editor.getByRole('button', { name: 'Lägg till avsnitt' }));
  expect(document.activeElement).toBe(editor.getByLabelText('Avsnitt 2'));
  await userEvent.type(editor.getByLabelText('Avsnitt 2'), 'Service');
  await userEvent.click(editor.getByRole('button', { name: 'Flytta avsnittet Service upp' }));
  expect((document.activeElement as HTMLInputElement).value).toBe('Service');
  await userEvent.click(editor.getByRole('button', { name: 'Flytta avsnittet Service ned' }));
  for (const name of ['Effekt', 'Anteckning']) {
    await userEvent.click(editor.getByRole('button', { name: 'Lägg till fält' }));
    const groups = editor.getAllByRole('group', { name: /^Eget fält/ });
    const field = within(groups[groups.length - 1]);
    expect(document.activeElement).toBe(field.getByLabelText('Fältets namn'));
    await userEvent.type(field.getByLabelText('Fältets namn'), name);
    await userEvent.type(field.getByLabelText('Fältets beskrivning'), 'kW');
  }
  await userEvent.selectOptions(
    within(editor.getByRole('group', { name: 'Eget fält 1' })).getByLabelText('Värdeslag'),
    'number',
  );
  await userEvent.click(editor.getByRole('button', { name: 'Flytta fältet Anteckning upp' }));
  expect((document.activeElement as HTMLInputElement).value).toBe('Anteckning');
  await userEvent.click(editor.getByRole('button', { name: 'Flytta fältet Anteckning ned' }));
  await userEvent.click(editor.getByRole('button', { name: 'Dölj Effekt, behåll värden' }));
  const power = within(editor.getByRole('group', { name: 'Eget fält 1' }));
  expect(document.activeElement).toBe(power.getByLabelText('Visa i avsnitt'));
  expect((power.getByLabelText('Visa i avsnitt') as HTMLSelectElement).value).toBe('');
  await userEvent.selectOptions(
    power.getByLabelText('Visa i avsnitt'),
    editor.getAllByRole('option', { name: 'Service' })[0],
  );
  await userEvent.click(editor.getByRole('button', { name: 'Lägg sambandstypen i mitt utkast' }));
  await screen.findByText('Förslaget finns i ditt privata utkast. Kartan är inte ändrad.');
  const state = await read();
  const type = state.draft.relationshipTypes?.[0].after;
  expect(type?.sections?.map(({ name }) => name)).toEqual(['Uppgifter', 'Service']);
  expect(type?.fields?.map(({ name, description }) => [name, description])).toEqual([
    ['Effekt', 'kW'],
    ['Anteckning', 'kW'],
  ]);
});

test('the visible relationship conflict preview matches saved independent section names and proposed placement', async () => {
  const definition = {
    name: 'Förvaring',
    description: '',
    forwardLabel: 'förvaras i',
    reverseLabel: 'innehåller',
    sections: [
      { id: 'facts', name: 'Uppgifter' },
      { id: 'service', name: 'Service' },
    ],
    fields: [{ id: 'note', name: 'Anteckning', description: '', kind: 'text', sectionId: 'facts' }],
  };
  await client.json(`${path}/relationship-type`, {
    version: 0,
    id: 'storage',
    baseRevision: null,
    value: definition,
  });
  await client.json(`${path}/save`, { version: 1, operationId: 'initial' });
  fixture.setSubject('member');
  const other = fixture.client();
  await other.signIn();
  const { user } = await (await other.request('/api/bootstrap')).json();
  const { code } = await (
    await client.json(`/api/households/${householdId}/invitations`, { userId: user.id })
  ).json();
  await other.json('/api/invitations/accept', { code });
  await client.json(`${path}/relationship-type`, {
    version: 2,
    id: 'storage',
    baseRevision: 1,
    value: { ...definition, fields: [{ ...definition.fields[0], sectionId: 'service' }] },
  });
  await other.json(`${path}/relationship-type`, {
    version: 0,
    id: 'storage',
    baseRevision: 1,
    value: {
      ...definition,
      sections: [definition.sections[0], { id: 'service', name: 'Underhåll' }],
    },
  });
  await other.json(`${path}/save`, { version: 1, operationId: 'other' });
  renderHouseholdWork(householdId);
  const dialog = await openConflictReview();
  await userEvent.click(dialog.getByRole('button', { name: /^Egna fält: Ditt förslag/ }));
  await userEvent.click(dialog.getByRole('button', { name: /^Avsnitt: Sparat i kartan nu/ }));
  const preview = dialog.getByRole('region', { name: 'Resultat av valen' });
  expect(preview.textContent).toContain('Underhåll');
  expect(preview.textContent).toContain('Anteckning');
  await userEvent.click(dialog.getByRole('button', { name: 'Lägg valen i utkastet' }));
  await waitFor(() => expect(dialog.getByRole('status').textContent).toContain('Valen finns'));
  await userEvent.click(dialog.getByRole('button', { name: 'Stäng konfliktdialogen' }));
  expect((await read()).draft.relationshipTypes?.[0].after).toMatchObject({
    sections: [definition.sections[0], { id: 'service', name: 'Underhåll' }],
    fields: [{ ...definition.fields[0], sectionId: 'service' }],
  });
  await saveHouseholdDraft();
  expect((await read()).relationshipTypes.find(({ id }) => id === 'storage')).toMatchObject({
    sections: [definition.sections[0], { id: 'service', name: 'Underhåll' }],
    fields: [{ ...definition.fields[0], sectionId: 'service' }],
  });
});
