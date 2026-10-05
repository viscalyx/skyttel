import type { APIRequestContext, Page } from '@playwright/test';
import { prepareHouseholdTable } from './household-table.js';

/** Same public-HTTP Unicode preparation for manual and automated searches. */
export async function prepareObjectSearch(client: APIRequestContext, origin: string) {
  const prepared = await prepareHouseholdTable(client, origin);
  await prepared.post('draft', {
    id: 'unicode-object',
    baseRevision: null,
    value: {
      name: 'Övrigt Élan',
      typeId: 'table-type-2',
      description: 'Åker äpple',
      customValues: { note: 'Hemlig anteckning' },
    },
  });
  await prepared.post('relationship-type', {
    id: 'search-relationship-type',
    baseRevision: null,
    value: {
      name: 'Endast i sambandet',
      description: '',
      forwardLabel: 'går till',
      reverseLabel: 'kommer från',
      fields: [],
    },
  });
  await prepared.post('relationship', {
    id: 'search-relationship',
    baseRevision: null,
    value: {
      sourceId: 'table-0',
      targetId: 'unicode-object',
      typeId: 'search-relationship-type',
      knowledge: 'known',
    },
  });
  return prepared;
}

/** Existing large-list cases deliberately include the fixture's ended objects. */
export async function includeEndedInMap(page: Page) {
  const tools = page.getByRole('navigation', { name: 'Kartans verktyg', exact: true });
  await tools.waitFor({ state: 'visible' });
  const expand = tools.getByRole('button', { name: 'Visa verktygens namn', exact: true });
  const collapse = tools.getByRole('button', { name: 'Dölj verktygens namn', exact: true });
  const wasExpanded = await collapse.isVisible();
  if (await expand.isVisible()) await expand.click();
  await tools.getByRole('button', { name: 'Sök i kartan', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Kartans sökning och filter' });
  await panel.getByLabel('Ta med upphörda').check();
  await panel.getByRole('button', { name: 'Stäng', exact: true }).click();
  if (wasExpanded && (await expand.isVisible())) await expand.click();
  else if (!wasExpanded && (await collapse.isVisible())) await collapse.click();
}
