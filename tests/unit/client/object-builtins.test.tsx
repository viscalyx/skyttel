import { cleanup, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import {
  openNewObjectForm,
  readDraftProposal,
  readTableObject,
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
  fixture.close();
});

test('canonical properties can be added, ordered, hidden and shown in a private type definition', async () => {
  renderHouseholdWork(householdId);
  await userEvent.click(await screen.findByRole('button', { name: 'Ny objekttyp' }));
  await userEvent.type(screen.getByLabelText('Typens namn'), 'Husavtal');
  await userEvent.selectOptions(
    screen.getByLabelText('Lägg till gemensam egenskap'),
    'description',
  );
  await userEvent.selectOptions(screen.getByLabelText('Lägg till gemensam egenskap'), 'debt');
  const debt = within(
    screen.getByRole('group', { name: 'Gemensam egenskap: Senast uppgiven skuld' }),
  );
  expect(debt.queryByLabelText('Värdeslag')).toBeNull();
  await userEvent.clear(debt.getByLabelText('Fältets namn'));
  await userEvent.type(debt.getByLabelText('Fältets namn'), 'Återstående skuld');
  await userEvent.click(
    screen.getByRole('button', { name: 'Flytta fältet Återstående skuld upp' }),
  );
  expect(document.activeElement).toBe(debt.getByLabelText('Fältets namn'));
  await userEvent.click(
    screen.getByRole('button', { name: 'Dölj Återstående skuld, behåll värden' }),
  );
  expect(document.activeElement).toBe(debt.getByLabelText('Visa i avsnitt'));
  await userEvent.selectOptions(debt.getByLabelText('Visa i avsnitt'), 'custom-fields');
  await userEvent.click(screen.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' }));
  await screen.findByText('Förslaget finns i ditt privata utkast. Kartan är inte ändrad.');
  const state = await read();
  expect(state.types.some((type) => type.name === 'Husavtal')).toBe(false);
  expect(state.draft.objectTypes?.[0].after).toMatchObject({
    builtins: [
      { key: 'description', name: 'Beskrivning', sectionId: 'custom-fields' },
      { key: 'debt', name: 'Återstående skuld', sectionId: 'custom-fields' },
    ],
    propertyOrder: ['builtin:debt', 'builtin:description'],
  });
});

test('section editors keep complete financial facts and shared description through a type change', async () => {
  const definition = {
    name: 'Låneuppgifter',
    description: '',
    sections: [{ id: 'facts', name: 'Avtalets uppgifter' }],
    fields: [
      { id: 'note', name: 'Egen anteckning', description: '', kind: 'text', sectionId: 'facts' },
    ],
    builtins: [
      { key: 'debt', name: 'Återstående skuld', sectionId: 'facts' },
      { key: 'description', name: 'Avtalets text', sectionId: 'facts' },
      { key: 'price', name: 'Pris', sectionId: '' },
    ],
    propertyOrder: ['builtin:debt', 'field:note', 'builtin:description', 'builtin:price'],
  };
  expect(
    (
      await client.json(`${path}/object-type`, {
        version: 0,
        id: 'loan',
        baseRevision: null,
        value: definition,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await client.json(`${path}/object-type`, {
        version: 1,
        id: 'other',
        baseRevision: null,
        value: {
          name: 'Annan typ',
          description: '',
          fields: [],
          sections: [],
          builtins: [],
          propertyOrder: [],
        },
      })
    ).status,
  ).toBe(200);
  const financialFacts = {
    debt: { knowledge: 'uncertain', value: '12 300', reportedOn: '2026-09-01' },
    price: { knowledge: 'unknown' },
    currency: { knowledge: 'none' },
    startDate: { knowledge: 'known', value: '2026-08-01' },
    usedCredit: { knowledge: 'none', reportedOn: '2026-09-02' },
  };
  expect(
    (
      await client.json(`${path}/draft`, {
        version: 2,
        id: 'contract',
        baseRevision: null,
        value: {
          name: 'Mitt lån',
          typeId: 'loan',
          description: 'Gemensam avtalstext',
          financialFacts,
          customValues: { note: 'Tidigare värde' },
        },
      })
    ).status,
  ).toBe(200);
  expect((await client.json(`${path}/save`, { version: 3, operationId: 'original' })).status).toBe(
    200,
  );
  renderHouseholdWork(householdId);
  const details = await readTableObject('Mitt lån');
  expect(
    details.getByText('Återstående skuld', { selector: 'dt' }).nextElementSibling?.textContent,
  ).toBe('12 300 (Osäkert uppgivet) · datum för uppgiften: 2026-09-01');
  expect(details.getByText('Pris', { selector: 'dt' }).nextElementSibling?.textContent).toBe(
    'Okänt',
  );
  await userEvent.click(details.getByRole('button', { name: 'Redigera Mitt lån' }));
  const editor = within(screen.getByRole('dialog', { name: 'Redigera Mitt lån' }));
  await userEvent.click(editor.getByRole('button', { name: 'Avtalets uppgifter' }));
  const section = editor;
  expect(
    (section.getByLabelText('Återstående skuld: uppgiftens säkerhet') as HTMLSelectElement).value,
  ).toBe('uncertain');
  expect(
    (section.getByLabelText('Återstående skuld: datum för uppgiften') as HTMLInputElement).value,
  ).toBe('2026-09-01');
  await userEvent.clear(section.getByLabelText('Återstående skuld', { exact: true }));
  await userEvent.type(section.getByLabelText('Återstående skuld', { exact: true }), '12 000');
  await userEvent.click(editor.getByRole('button', { name: 'Grunduppgifter' }));
  await userEvent.selectOptions(editor.getByLabelText('Objekttyp', { exact: true }), 'other');
  await userEvent.click(screen.getByRole('button', { name: 'Ta bort fältvärdena och byt typ' }));
  expect((editor.getByLabelText('Beskrivning', { exact: true }) as HTMLTextAreaElement).value).toBe(
    'Gemensam avtalstext',
  );
  await userEvent.click(editor.getByRole('button', { name: 'Lägg i utkastet och stäng' }));
  await screen.findByText(/Ändringen finns i ditt utkast/);
  const state = await read();
  expect(state.objects[0].financialFacts).toEqual(financialFacts);
  expect(state.draft.changes[0].after).toMatchObject({
    typeId: 'other',
    description: 'Gemensam avtalstext',
    financialFacts: { ...financialFacts, debt: { ...financialFacts.debt, value: '12 000' } },
  });
  expect(state.draft.changes[0].after?.customValues).toBeUndefined();
  const review = await readDraftProposal('Mitt lån');
  const proposed = within(
    review.getByRole('heading', { name: 'Föreslagna värden' }).parentElement as HTMLElement,
  );
  expect(
    proposed.getByText('Senast uppgiven skuld', { selector: 'dt' }).nextElementSibling?.textContent,
  ).toBe('12 000 (Osäkert uppgivet) · datum för uppgiften: 2026-09-01');
});

test('legacy custom placement remains visible once while canonical presentation and hidden review coexist', async () => {
  expect(
    (
      await client.json(`${path}/object-type`, {
        version: 0,
        id: 'legacy',
        baseRevision: null,
        value: {
          name: 'Äldre avtal',
          description: '',
          builtins: [],
          fields: [
            { id: 'visible', name: 'Tidigare fält', description: '', kind: 'number' },
            { id: 'hidden', name: 'Dolt fält', description: '', kind: 'boolean', sectionId: '' },
          ],
        },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await client.json(`${path}/draft`, {
        version: 1,
        id: 'legacy-object',
        baseRevision: null,
        value: {
          typeId: 'legacy',
          name: 'Äldre uppgifter',
          description: 'Gemensam text',
          customValues: { visible: 0, hidden: false },
          financialFacts: { debt: { knowledge: 'unknown', reportedOn: '2026-09-01' } },
        },
      })
    ).status,
  ).toBe(200);
  renderHouseholdWork(householdId);
  const review = await readDraftProposal('Äldre uppgifter');
  expect(review.getAllByText('Tidigare fält', { selector: 'dt' })).toHaveLength(1);
  expect(
    review.getByText('Tidigare fält', { selector: 'dt' }).nextElementSibling?.textContent,
  ).toBe('0');
  expect(review.getByText('Dolt fält', { selector: 'dt' }).nextElementSibling?.textContent).toBe(
    'Nej',
  );
  expect(
    review.getByText('Senast uppgiven skuld', { selector: 'dt' }).nextElementSibling?.textContent,
  ).toBe('Okänt · datum för uppgiften: 2026-09-01');
  await userEvent.click(review.getByRole('button', { name: 'Stäng dialogen' }));
  await saveHouseholdDraft();
  expect((await read()).types.find(({ id }) => id === 'legacy')).not.toHaveProperty('sections');
  await userEvent.click(screen.getByRole('button', { name: 'Rapporter' }));
  const history = within(await screen.findByRole('region', { name: 'Ändringshistorik' }));
  await userEvent.click(await history.findByText('Visa ändringarna', { exact: true }));
  await history.findByText('Tidigare fält: 0');
  expect(history.getAllByText('Tidigare fält: 0')).toHaveLength(1);
  expect(history.getByText('Dolt fält: Nej')).toBeTruthy();
});

test('explicit custom-only order controls object editing and review without inventing built-in metadata', async () => {
  const user = userEvent.setup();
  expect(
    (
      await client.json(`${path}/object-type`, {
        version: 0,
        id: 'ordered',
        baseRevision: null,
        value: {
          name: 'Sorterat avtal',
          description: '',
          fields: [
            { id: 'first', name: 'Första fältet', description: '', kind: 'number' },
            { id: 'second', name: 'Andra fältet', description: '', kind: 'text' },
          ],
          propertyOrder: ['field:second', 'field:first'],
        },
      })
    ).status,
  ).toBe(200);
  renderHouseholdWork(householdId);
  const form = await openNewObjectForm();
  await userEvent.selectOptions(form.getByLabelText('Objekttyp', { exact: true }), 'ordered');
  await user.click(form.getByLabelText('Namn'));
  await user.paste('Sorterade uppgifter');
  await userEvent.click(form.getByRole('button', { name: 'Egna fält' }));
  const labels = form.getAllByText(/^(Andra fältet|Första fältet)$/, { selector: 'label' });
  expect(labels.map((label) => label.textContent)).toEqual(['Andra fältet', 'Första fältet']);
  await userEvent.type(form.getByLabelText('Andra fältet', { exact: true }), 'Två');
  await userEvent.type(form.getByLabelText('Första fältet', { exact: true }), '0');
  await userEvent.click(form.getByRole('button', { name: 'Grunduppgifter' }));
  await user.click(form.getByLabelText('Beskrivning', { exact: true }));
  await user.paste('Gemensam text');
  await userEvent.click(form.getByRole('button', { name: 'Lägg i utkastet och stäng' }));
  await screen.findByText(/Ändringen finns i ditt utkast/);
  const review = await readDraftProposal('Sorterade uppgifter');
  expect(
    review
      .getAllByText(/^(Andra fältet|Första fältet)$/, { selector: 'dt' })
      .map((element) => `${element.textContent}: ${element.nextElementSibling?.textContent}`),
  ).toEqual(['Andra fältet: Två', 'Första fältet: 0']);
  expect(review.getByText('Beskrivning', { selector: 'dt' }).nextElementSibling?.textContent).toBe(
    'Gemensam text',
  );
  await userEvent.click(review.getByRole('button', { name: 'Stäng dialogen' }));
  await saveHouseholdDraft();
  const state = await read();
  expect(state.types.find(({ id }) => id === 'ordered')).not.toHaveProperty('builtins');
  expect(state.types.find(({ id }) => id === 'ordered')?.propertyOrder).toEqual([
    'field:second',
    'field:first',
  ]);
  expect(state.objects[0]).toMatchObject({
    description: 'Gemensam text',
    customValues: { first: 0, second: 'Två' },
  });
});
