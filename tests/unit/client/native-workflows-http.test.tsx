import { type APIRequestContext, request } from '@playwright/test';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import { authenticatedHttpFetch } from '../../support/authenticated-http-fetch.js';
import { createHousehold, signIn } from '../../support/client.js';
import { createInstallation } from '../../support/installation.js';
import {
  openDraftReview,
  openNewObjectForm,
  openObjectRelationships,
  readDraftProposal,
  renderHouseholdWork,
  saveHouseholdDraft,
} from '../../support/native-household-unit.js';

let installation: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
let householdId: string;
let path: string;
const read = async (): Promise<MapState> => (await client.get(path)).json();

beforeEach(async () => {
  installation = await createInstallation();
  client = await request.newContext();
  await signIn(client, installation.origin);
  vi.stubGlobal('fetch', authenticatedHttpFetch(client, installation.origin));
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await client?.dispose();
  await installation?.close();
});

test('complete native objects and a relationship remain private until their single atomic save', async () => {
  const { household } = await (await createHousehold(client, installation.origin)).json();
  householdId = household.id;
  path = `${installation.origin}/api/households/${householdId}/map`;
  const before = await read();
  renderHouseholdWork(householdId);
  for (const [name, description] of [
    ['Alex', 'Personen som använder cykeln'],
    ['Blå cykeln', 'Cykeln står i garaget'],
  ]) {
    const form = await openNewObjectForm();
    await userEvent.type(form.getByLabelText('Namn'), name);
    await userEvent.type(form.getByLabelText('Beskrivning'), description);
    await userEvent.click(form.getByRole('button', { name: 'Lägg i utkastet och stäng' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nytt objekt' })).toBeNull());
  }
  const proposed = await read();
  expect(proposed.objects).toEqual(before.objects);
  expect(proposed.draft.changes).toHaveLength(2);
  const relationships = await openObjectRelationships('Alex');
  await userEvent.click(relationships.getByRole('button', { name: 'Nytt samband' }));
  const type = proposed.relationshipTypes.find((definition) => definition.name === 'Använder');
  const bicycle = proposed.draft.changes.find((change) => change.after?.name === 'Blå cykeln');
  if (!type || !bicycle)
    throw new Error('The actual household definitions and objects are required');
  await userEvent.selectOptions(relationships.getByLabelText('Sambandstyp'), type.id);
  await userEvent.selectOptions(relationships.getByLabelText('Till objekt'), bicycle.id);
  await userEvent.click(relationships.getByRole('button', { name: 'Lägg i utkastet' }));
  await waitFor(async () => expect((await read()).draft.relationships).toHaveLength(1));
  await userEvent.click(relationships.getByRole('button', { name: 'Stäng samband' }));
  const details = await readDraftProposal('Blå cykeln');
  expect(details.getByText('Cykeln står i garaget')).toBeTruthy();
  await userEvent.click(details.getByRole('button', { name: 'Stäng dialogen' }));
  expect((await read()).relationships).toEqual(before.relationships);
  await openDraftReview();
  await saveHouseholdDraft();
  const saved = await read();
  expect(saved.draft.changes).toEqual([]);
  expect(saved.draft.relationships ?? []).toEqual([]);
  expect(saved.objects.map((object) => object.name).sort()).toEqual(['Alex', 'Blå cykeln']);
  expect(saved.relationships).toHaveLength(1);
  expect(saved.relationships[0]).toMatchObject({ typeId: type.id, targetId: bicycle.id });
  const history = await (await client.get(`${path}/history`)).json();
  expect(history.history).toHaveLength(1);
  expect(history.history[0].changes).toHaveLength(2);
  expect(history.history[0].relationships).toHaveLength(1);
});
