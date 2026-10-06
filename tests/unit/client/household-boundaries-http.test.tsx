import { type APIRequestContext, request } from '@playwright/test';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import { authenticatedHttpFetch } from '../../support/authenticated-http-fetch.js';
import { createHousehold, signIn } from '../../support/client.js';
import { prepareHouseholdReading } from '../../support/household-reading.js';
import { createInstallation } from '../../support/installation.js';
import {
  editTableObjectForm,
  openDraftReview,
  openObjectRelationships,
  renderHouseholdWork,
  saveHouseholdDraft,
} from '../../support/native-household-unit.js';
import { prepareObjectSearch } from '../../support/object-search.js';

let installation: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
beforeEach(async () => {
  installation = await createInstallation();
  client = await request.newContext();
  vi.stubGlobal('fetch', authenticatedHttpFetch(client, installation.origin));
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await client.dispose();
  await installation.close();
});

async function tableSearchFixture() {
  const fixture = await prepareObjectSearch(client, installation.origin);
  const householdId = fixture.path.split('/households/')[1].split('/')[0];
  renderHouseholdWork(householdId);
  const tools = within(await screen.findByRole('navigation', { name: 'Kartans verktyg' }));
  await userEvent.click(tools.getByRole('button', { name: 'Tabell' }));
  const table = within(await screen.findByRole('region', { name: 'Hushållets tabell' }));
  await table.findByRole('button', { name: 'A 2' });
  return { ...fixture, tools, table };
}

async function filterDialog(table: ReturnType<typeof within>) {
  await userEvent.click(table.getByRole('button', { name: /^Filter/ }));
  return within(await screen.findByRole('dialog', { name: 'Tabellens filter' }));
}

test('table and map searches normalize Swedish own fields independently and never search unrelated relationships', async () => {
  const fixture = await tableSearchFixture();
  const before = await fixture.read();
  const query = fixture.table.getByLabelText('Sök objekt i tabellen');
  await userEvent.type(query, 'O\u0308VRIGT E\u0301LAN ÄPPLE');
  expect(fixture.table.getByRole('button', { name: 'Övrigt Élan' })).toBeTruthy();
  expect(fixture.table.queryByRole('button', { name: 'A 2' })).toBeNull();
  await userEvent.clear(query);
  await userEvent.type(query, 'hemlig anteckning');
  expect(fixture.table.getByText('Träff i Egen anteckning')).toBeTruthy();
  await userEvent.click(fixture.tools.getByRole('button', { name: 'Karta' }));
  await userEvent.click(fixture.tools.getByRole('button', { name: 'Sök i kartan' }));
  const map = within(await screen.findByRole('region', { name: 'Kartans sökning och filter' }));
  const mapQuery = map.getByLabelText('Sök objekt i kartan');
  expect((mapQuery as HTMLInputElement).value).toBe('');
  await userEvent.type(mapQuery, 'endast i sambandet');
  expect(map.getByRole('heading', { name: 'Inga objekt matchar' })).toBeTruthy();
  const empty = map.getByRole('heading', { name: 'Inga objekt matchar' }).parentElement;
  if (!empty) throw new Error('The ordinary empty-results message is required');
  await userEvent.click(
    within(empty).getByRole('button', { name: 'Återställ sökning och filter' }),
  );
  await userEvent.type(mapQuery, 'hemlig');
  expect(map.getByRole('list', { name: 'Matchande detaljfält' }).textContent).toContain(
    'Övrigt Élan: träff i Egen anteckning',
  );
  await userEvent.click(map.getByRole('button', { name: 'Stäng' }));
  expect(screen.getByRole('complementary', { name: 'Kartans sökresultat' }).textContent).toContain(
    'Sökning: hemlig',
  );
  await userEvent.click(fixture.tools.getByRole('button', { name: 'Tabell' }));
  expect((query as HTMLInputElement).value).toBe('hemlig anteckning');
  expect(await fixture.read()).toEqual(before);
}, 30_000);

test('table filters compose actual type, selected, ended, removed and proposal states while clear preserves filters', async () => {
  const fixture = await tableSearchFixture();
  const before = await fixture.read();
  await userEvent.click(fixture.table.getByRole('button', { name: 'A 2' }));
  const query = fixture.table.getByLabelText('Sök objekt i tabellen');
  await userEvent.type(query, '100 000');
  expect(fixture.table.getByRole('button', { name: 'A 2' })).toBeTruthy();
  expect(fixture.table.getByText('Träff i Beviljat kreditutrymme')).toBeTruthy();
  const filters = await filterDialog(fixture.table);
  await userEvent.click(filters.getByLabelText('Typ 2'));
  await userEvent.click(filters.getByLabelText('Bara markerade (1)'));
  await userEvent.click(filters.getByRole('button', { name: 'Stäng filter' }));
  await userEvent.click(fixture.table.getByRole('button', { name: 'Rensa sökning' }));
  expect(fixture.table.getByRole('button', { name: 'A 2' })).toBeTruthy();
  expect(fixture.table.queryByRole('button', { name: 'A 10' })).toBeNull();
  const next = await filterDialog(fixture.table);
  expect((next.getByLabelText('Typ 2') as HTMLInputElement).checked).toBe(true);
  expect((next.getByLabelText('Bara markerade (1)') as HTMLInputElement).checked).toBe(true);
  await userEvent.click(next.getByLabelText('Bara markerade (1)'));
  await userEvent.click(next.getByLabelText('Ta med upphörda'));
  await userEvent.click(next.getByLabelText('Ta med borttagna'));
  await userEvent.click(next.getByLabelText('Föreslagen borttagning'));
  await userEvent.click(next.getByRole('button', { name: 'Stäng filter' }));
  expect(fixture.table.getByRole('button', { name: 'Tas bort prov' })).toBeTruthy();
  expect(fixture.table.queryByRole('button', { name: 'A 2' })).toBeNull();
  const proposals = await filterDialog(fixture.table);
  await userEvent.click(proposals.getByLabelText('Föreslagen borttagning'));
  await userEvent.click(proposals.getByRole('button', { name: 'Alla typer' }));
  await userEvent.click(proposals.getByRole('button', { name: 'Stäng filter' }));
  await userEvent.type(query, 'Borttaget prov');
  await userEvent.click(fixture.table.getByRole('button', { name: 'Borttaget prov' }));
  expect(
    fixture.table.getByText('Borttaget', {
      selector: '.household-table tr[data-selected] td span',
    }),
  ).toBeTruthy();
  expect(fixture.table.queryByRole('button', { name: 'Redigera Borttaget prov' })).toBeNull();
  expect(fixture.table.queryByRole('button', { name: 'Visa Borttaget prov i kartan' })).toBeNull();
  expect(await fixture.read()).toEqual(before);
}, 30_000);

test('sorting and pagination preserve numeric Swedish order and resetting a no-match query returns the complete current table', async () => {
  const fixture = await tableSearchFixture();
  const before = await fixture.read();
  const pages = within(fixture.table.getByRole('navigation', { name: 'Tabellsidor' }));
  expect(pages.getByRole('status').textContent).toContain('Sida 1 av 2');
  await userEvent.click(pages.getByRole('button', { name: 'Nästa' }));
  expect(pages.getByRole('status').textContent).toContain('Sida 2 av 2');
  expect(fixture.table.getByRole('button', { name: 'Övrigt Élan' })).toBeTruthy();
  await userEvent.click(pages.getByRole('button', { name: 'Föregående' }));
  const rows = fixture.table.getAllByRole('row').filter((row) => row.hasAttribute('data-selected'));
  expect(
    rows.slice(0, 2).map((row) => within(row).getByRole('button', { name: /^A / }).textContent),
  ).toEqual(['▸A 2', '▸A 10']);
  await userEvent.selectOptions(fixture.table.getByLabelText('Sortering'), 'name-desc');
  expect(
    fixture.table.getAllByRole('row').find((row) => row.hasAttribute('data-selected'))?.textContent,
  ).toContain('Övrigt Élan');
  await userEvent.selectOptions(fixture.table.getByLabelText('Sortering'), 'type-asc');
  await userEvent.selectOptions(fixture.table.getByLabelText('Sortering'), 'type-desc');
  await userEvent.type(fixture.table.getByLabelText('Sök objekt i tabellen'), 'hittas aldrig');
  expect(fixture.table.getByRole('heading', { name: 'Inga objekt matchar' })).toBeTruthy();
  await userEvent.click(
    fixture.table.getByRole('button', { name: 'Återställ sökning och filter' }),
  );
  expect(pages.getByRole('status').textContent).toContain('Sida 1 av 2');
  expect(await fixture.read()).toEqual(before);
}, 30_000);

async function readingFixture() {
  const fixture = await prepareHouseholdReading(client, installation.origin, false);
  const householdId = fixture.path.split('/households/')[1].split('/')[0];
  renderHouseholdWork(householdId);
  const tools = within(await screen.findByRole('navigation', { name: 'Kartans verktyg' }));
  await screen.findByText('Rymdkartan kan inte visas. Använd Tabell för att fortsätta.');
  await userEvent.click(tools.getByRole('button', { name: 'Tabell' }));
  const table = within(await screen.findByRole('region', { name: 'Hushållets tabell' }));
  await table.findByRole('button', { name: 'Alex' });
  return { ...fixture, householdId, tools, table };
}

async function actions(table: ReturnType<typeof within>, name: string) {
  const toggle = table.getByRole('button', { name });
  if (toggle.getAttribute('aria-expanded') !== 'true') await userEvent.click(toggle);
  await userEvent.click(table.getByRole('button', { name: `Åtgärder för ${name}` }));
  return within(await screen.findByRole('dialog', { name: `Åtgärder för ${name}` }));
}

test('textual object removal works without graphics and stages every incident saved or proposed relationship without changing shared facts', async () => {
  const fixture = await readingFixture();
  const before = await fixture.read();
  const history = await (await client.get(`${fixture.path}/history`)).json();
  let menu = await actions(fixture.table, 'Cykel');
  expect(
    (menu.getByRole('button', { name: 'Visa samband i kartan' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(menu.getByText(/Objektet och dess 4 samband/)).toBeTruthy();
  await userEvent.click(menu.getByRole('button', { name: 'Avbryt' }));
  expect(await fixture.read()).toEqual(before);
  menu = await actions(fixture.table, 'Cykel');
  await userEvent.click(menu.getByRole('button', { name: 'Ta bort objekt' }));
  await waitFor(async () =>
    expect((await fixture.read()).draft.changes.find(({ id }) => id === 'bike')?.after).toBeNull(),
  );
  const after = await fixture.read();
  expect(after.objects).toEqual(before.objects);
  expect(after.relationships).toEqual(before.relationships);
  expect(after.draft.relationships?.map(({ id, after }) => [id, after]).sort()).toEqual([
    ['alex-bike', null],
    ['bike-garage', null],
    ['bike-none', null],
    ['bike-unknown', null],
  ]);
  expect(await (await client.get(`${fixture.path}/history`)).json()).toEqual(history);
  menu = await actions(fixture.table, 'Cykel');
  expect((menu.getByRole('button', { name: 'Ta bort objekt' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  await userEvent.click(menu.getByRole('button', { name: 'Avbryt' }));
  const draft = await openDraftReview();
  expect(draft.getByRole('button', { name: 'Visa förslaget: Cykel' })).toBeTruthy();
  await saveHouseholdDraft();
  expect((await fixture.read()).objects.some(({ id }) => id === 'bike')).toBe(false);
  expect((await fixture.read()).relationships).toEqual([]);
}, 30_000);

test('textual actions edit the same native object form and a dirty form blocks abandoning work until an explicit discard', async () => {
  const fixture = await readingFixture();
  const before = await fixture.read();
  const menu = await actions(fixture.table, 'Alex');
  await userEvent.click(menu.getByRole('button', { name: 'Redigera objekt' }));
  const form = within(await screen.findByRole('dialog', { name: 'Redigera Alex' }));
  await userEvent.type(form.getByLabelText('Namn'), ' förslag');
  await userEvent.click(form.getByRole('button', { name: 'Avbryt' }));
  const loss = within(await screen.findByRole('dialog', { name: 'Lämna ändrade uppgifter?' }));
  await userEvent.click(loss.getByRole('button', { name: 'Fortsätt redigera' }));
  expect((form.getByLabelText('Namn') as HTMLInputElement).value).toBe('Alex förslag');
  expect(await fixture.read()).toEqual(before);
  await userEvent.click(form.getByRole('button', { name: 'Avbryt' }));
  const confirmedLoss = within(
    await screen.findByRole('dialog', { name: 'Lämna ändrade uppgifter?' }),
  );
  await userEvent.click(
    confirmedLoss.getByRole('button', { name: 'Kasta ändringarna och fortsätt' }),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(await fixture.read()).toEqual(before);
}, 30_000);

for (const delivered of [false, true]) {
  test(`native object staging checks a lost ${delivered ? 'committed' : 'undelivered'} reply before allowing transition or retry`, async () => {
    const fixture = await readingFixture();
    const before = await fixture.read();
    const form = await editTableObjectForm('Alex');
    await userEvent.type(form.getByLabelText('Namn'), ' Lind');
    const actualFetch = authenticatedHttpFetch(client, installation.origin);
    let lost = true;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/object-form') && lost) {
        lost = false;
        if (delivered) await actualFetch(input, init);
        throw new TypeError('Controlled lost object staging reply');
      }
      return actualFetch(input, init);
    });
    await userEvent.click(form.getByRole('button', { name: 'Lägg i utkastet och öppna samband' }));
    await waitFor(() => expect(form.getByRole('alert').textContent).toContain('Det är oklart'));
    expect(
      (form.getByRole('button', { name: 'Lägg i utkastet och stäng' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await userEvent.click(
      form.getByRole('button', { name: 'Kontrollera om ändringen lades i utkastet' }),
    );
    if (!delivered) {
      await waitFor(() =>
        expect(
          (form.getByRole('button', { name: 'Lägg i utkastet och stäng' }) as HTMLButtonElement)
            .disabled,
        ).toBe(false),
      );
      expect(await fixture.read()).toEqual(before);
      expect((form.getByLabelText('Namn') as HTMLInputElement).value).toBe('Alex Lind');
      await userEvent.click(
        form.getByRole('button', { name: 'Lägg i utkastet och öppna samband' }),
      );
    }
    await screen.findByRole('dialog', { name: 'Samband för Alex Lind' });
    const after = await fixture.read();
    expect(after.draft.version).toBe(before.draft.version + 1);
    expect(after.draft.changes.find(({ id }) => id === 'alex')?.after?.name).toBe('Alex Lind');
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
  }, 30_000);
}

async function emptyHousehold() {
  await signIn(client, installation.origin);
  const { household } = await (await createHousehold(client, installation.origin)).json();
  const path = `${installation.origin}/api/households/${household.id}/map`;
  const read = async (): Promise<MapState> => (await client.get(path)).json();
  const post = async (route: string, body: object) => {
    const before = await read();
    const response = await client.post(`${path}/${route}`, {
      headers: { origin: installation.origin },
      data: { version: before.draft.version, contentVersion: before.contentVersion, ...body },
    });
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  };
  return { householdId: household.id as string, path, read, post };
}

async function typeSettings() {
  const settings = within(await screen.findByRole('region', { name: 'Typer och egna fält' }));
  await settings.findByRole('button', { name: 'Ny objekttyp' });
  const summary = settings.getByText('Objekttyper och egna fält');
  if (!summary.closest('details')?.open) await userEvent.click(summary);
  return settings;
}

test('configured type fields preserve explicit order, visibility and four answer kinds through actual UI staging, then unused type removal stays private', async () => {
  const fixture = await emptyHousehold();
  await fixture.post('object-type', {
    id: 'configured',
    baseRevision: null,
    value: {
      name: 'Provfält',
      description: '',
      fields: [],
      sections: [],
      builtins: [],
      propertyOrder: [],
    },
  });
  await fixture.post('save', { operationId: 'configured-type' });
  const before = await fixture.read();
  renderHouseholdWork(fixture.householdId);
  const settings = await typeSettings();
  await userEvent.click(settings.getByRole('button', { name: 'Ändra typ: Provfält' }));
  const form = within(settings.getByRole('group', { name: 'Objekttypens definition' }));
  await userEvent.click(form.getByRole('button', { name: 'Lägg till avsnitt' }));
  await userEvent.type(form.getByLabelText('Avsnitt 1'), 'Egna fält');
  await userEvent.click(form.getByRole('button', { name: 'Lägg till avsnitt' }));
  await userEvent.type(form.getByLabelText('Avsnitt 2'), 'Extra');
  await userEvent.click(form.getByRole('button', { name: 'Flytta avsnittet Extra upp' }));
  await userEvent.click(form.getByRole('button', { name: 'Flytta avsnittet Extra ned' }));
  for (const [index, name, kind] of [
    [1, 'Märkning', 'text'],
    [2, 'Antal', 'number'],
    [3, 'Kontrollerad', 'boolean'],
    [4, 'Provdatum', 'date'],
  ] as const) {
    await userEvent.click(form.getByRole('button', { name: 'Lägg till fält' }));
    const field = within(form.getByRole('group', { name: `Eget fält ${index}` }));
    await userEvent.type(field.getByLabelText('Fältets namn'), name);
    await userEvent.type(field.getByLabelText('Fältets beskrivning'), `Hela uppgiften ${name}`);
    await userEvent.selectOptions(field.getByLabelText('Värdeslag'), kind);
  }
  await userEvent.click(form.getByRole('button', { name: 'Flytta fältet Antal upp' }));
  await userEvent.click(form.getByRole('button', { name: 'Flytta fältet Antal ned' }));
  await userEvent.click(form.getByRole('button', { name: 'Dölj Kontrollerad, behåll värden' }));
  await userEvent.selectOptions(form.getByLabelText('Lägg till gemensam egenskap'), 'description');
  const description = within(form.getByRole('group', { name: 'Gemensam egenskap: Beskrivning' }));
  await userEvent.clear(description.getByLabelText('Fältets namn'));
  await userEvent.type(description.getByLabelText('Fältets namn'), 'Provets berättelse');
  await userEvent.click(form.getByRole('button', { name: 'Ta bort det tomma avsnittet Extra' }));
  await userEvent.click(form.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' }));
  await waitFor(() =>
    expect(settings.queryByRole('group', { name: 'Objekttypens definition' })).toBeNull(),
  );
  const after = await fixture.read();
  expect(after.types).toEqual(before.types);
  const proposal = after.draft.objectTypes?.find(({ id }) => id === 'configured');
  expect(proposal?.after?.fields?.map(({ name, kind }) => [name, kind])).toEqual([
    ['Märkning', 'text'],
    ['Antal', 'number'],
    ['Kontrollerad', 'boolean'],
    ['Provdatum', 'date'],
  ]);
  expect(proposal?.after?.sections?.map(({ name }) => name)).toEqual(['Egna fält']);
  expect(proposal?.after?.fields?.find(({ name }) => name === 'Kontrollerad')?.sectionId).toBe('');
  expect(proposal?.after?.builtins).toEqual([
    expect.objectContaining({ key: 'description', name: 'Provets berättelse' }),
  ]);
  await userEvent.click(settings.getByRole('button', { name: 'Ändra typ: Provfält' }));
  await userEvent.click(settings.getByRole('button', { name: 'Ta bort objekttypen' }));
  await waitFor(async () =>
    expect(
      (await fixture.read()).draft.objectTypes?.find(({ id }) => id === 'configured')?.after,
    ).toBeNull(),
  );
  expect((await fixture.read()).types).toEqual(before.types);
}, 30_000);

test('an actually used field rejects a datatype change and definition removal without losing the type form or private answers', async () => {
  const fixture = await readingFixture();
  const before = await fixture.read();
  const settings = await typeSettings();
  await userEvent.click(settings.getByRole('button', { name: 'Ändra typ: Läsobjekt' }));
  const form = within(settings.getByRole('group', { name: 'Objekttypens definition' }));
  await userEvent.selectOptions(form.getByLabelText('Värdeslag'), 'number');
  await userEvent.click(form.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' }));
  await screen.findByText(/Fältets värdeslag används redan/);
  expect(await fixture.read()).toEqual(before);
  expect((form.getByLabelText('Värdeslag') as HTMLSelectElement).value).toBe('number');
  await userEvent.selectOptions(form.getByLabelText('Värdeslag'), 'text');
  await userEvent.click(form.getByRole('button', { name: 'Ta bort objekttypen' }));
  await screen.findByText(/Typen används fortfarande i kartan eller privata utkast/);
  expect(await fixture.read()).toEqual(before);
  expect(form.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' })).toBeTruthy();
}, 30_000);
for (const outcome of ['absent', 'committed', 'duplicate', 'changed-duplicate'] as const) {
  test(`a lost relationship reply checks the authoritative ${outcome} result while preserving unrelated private work`, async () => {
    const fixture = await readingFixture();
    const before = await fixture.read();
    const dialog = await openObjectRelationships('Alex');
    await userEvent.click(dialog.getByRole('button', { name: 'Nytt samband' }));
    const form = within(dialog.getByRole('region', { name: 'Nytt samband' }));
    await userEvent.selectOptions(form.getByLabelText('Sambandstyp'), 'uses');
    await userEvent.selectOptions(
      form.getByLabelText('Till objekt'),
      outcome.includes('duplicate') ? 'bike' : 'garage',
    );
    const actual = authenticatedHttpFetch(client, installation.origin);
    let dropped = false;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!dropped && String(input).endsWith('/relationship-form') && init?.method === 'POST') {
        dropped = true;
        if (outcome !== 'absent') await actual(input, init);
        throw new TypeError('Synthetic delivery loss at the real HTTP boundary');
      }
      return actual(input, init);
    });
    await userEvent.click(form.getByRole('button', { name: 'Lägg i utkastet' }));
    await form.findByText(/Det är oklart om ändringen lades i utkastet/);
    expect(form.getByRole('button', { name: 'Lägg i utkastet' }).matches(':disabled')).toBe(true);
    expect(form.getByRole('button', { name: 'Avbryt redigeringen' }).matches(':disabled')).toBe(
      true,
    );
    if (outcome === 'changed-duplicate') {
      const existing = before.relationships.find((edge) => edge.id === 'alex-bike');
      if (!existing) throw new Error('Missing saved duplicate');
      await fixture.post('relationship', {
        id: existing.id,
        baseRevision: existing.revision,
        value: { ...existing, targetId: 'garage' },
      });
    }
    await userEvent.click(
      form.getByRole('button', { name: 'Kontrollera om ändringen lades i utkastet' }),
    );
    if (outcome === 'absent') {
      await form.findByText(/Kontrollen visar att ändringen inte lades i utkastet/);
      expect(await fixture.read()).toEqual(before);
      expect((form.getByLabelText('Till objekt') as HTMLSelectElement).value).toBe('garage');
      await userEvent.click(form.getByRole('button', { name: 'Lägg i utkastet' }));
      await waitFor(() =>
        expect(dialog.queryByRole('region', { name: 'Nytt samband' })).toBeNull(),
      );
    } else if (outcome === 'committed') {
      await waitFor(() =>
        expect(dialog.queryByRole('region', { name: 'Nytt samband' })).toBeNull(),
      );
    } else if (outcome === 'duplicate') {
      await form.findByText('Sambandet finns redan');
      expect(await fixture.read()).toEqual(before);
      await userEvent.click(form.getByRole('button', { name: 'Redigera befintligt samband' }));
      const loss = within(await screen.findByRole('dialog', { name: 'Lämna ändrade uppgifter?' }));
      await userEvent.click(loss.getByRole('button', { name: 'Fortsätt redigera' }));
      expect((form.getByLabelText('Till objekt') as HTMLSelectElement).value).toBe('bike');
      expect(await fixture.read()).toEqual(before);
    } else {
      await form.findByText(/Försöket hittade ett befintligt samband, men det har ändrats/);
      expect(form.queryByRole('button', { name: 'Redigera befintligt samband' })).toBeNull();
      expect((form.getByLabelText('Till objekt') as HTMLSelectElement).value).toBe('bike');
      const current = await fixture.read();
      expect(
        current.draft.relationships?.find((edge) => edge.id === 'alex-bike')?.after?.targetId,
      ).toBe('garage');
    }
    const current = await fixture.read();
    expect(current.objects).toEqual(before.objects);
    expect(current.relationships).toEqual(before.relationships);
    expect(current.draft.changes).toEqual(before.draft.changes);
    expect(current.draft.relationships?.find((edge) => edge.id === 'bike-garage')).toEqual(
      before.draft.relationships?.find((edge) => edge.id === 'bike-garage'),
    );
    if (outcome === 'committed' || outcome === 'absent') {
      expect(current.draft.version).toBe(before.draft.version + 1);
      expect(
        current.draft.relationships?.filter(
          (edge) => edge.after?.sourceId === 'alex' && edge.after.targetId === 'garage',
        ),
      ).toHaveLength(1);
    }
  }, 30_000);
}
