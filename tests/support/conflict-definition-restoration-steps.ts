import type { Page } from '@playwright/test';
import type { MapState } from '../../src/shared/map.js';
import { saveReviewedConflictDraft } from './conflict-special.js';
import { expectSavedConflictObject, refreshConflictReader } from './current-conflict-reading.js';
import { readSavedHistoricalDefinition } from './historical-conflict-reading.js';
import { expect } from './test.js';

export async function stageNativeRestoration(page: Page, expected: Record<string, unknown>) {
  await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
  await dialog.getByRole('button', { name: /^Typdefinition: Ditt förslag/ }).click();
  const response = page.waitForResponse(
    (response) => response.url().endsWith('/map/resolve') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
  const resolved = await response;
  expect(resolved.request().postDataJSON()).toEqual(expected);
  expect(resolved.status()).toBe(200);
  await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
  await page.keyboard.press('Escape');
}

export async function saveNativeRestoration(
  page: Page,
  state: MapState,
  readHistory?: () => Promise<{ history: { operationId: string }[] }>,
) {
  const response = page.waitForResponse(
    (response) => response.url().endsWith('/map/save') && response.request().method() === 'POST',
  );
  await saveReviewedConflictDraft(page);
  const saved = await response;
  const requested = saved.request().postDataJSON();
  expect(requested).toEqual({
    version: state.draft.version,
    contentVersion: state.contentVersion,
    operationId: expect.any(String),
  });
  expect(requested.operationId).not.toBe('');
  expect(saved.status()).toBe(200);
  const { receipt } = await saved.json();
  expect(receipt.operationId).toBe(requested.operationId);
  const { history } = readHistory
    ? await readHistory()
    : await (await page.request.get(saved.url().replace(/\/save$/, '/history'))).json();
  expect(
    history.find((entry: { operationId: string }) => entry.operationId === requested.operationId),
  ).toEqual(receipt);
  return receipt;
}

export async function readRestoredHousehold(page: Page, origin: string, relationship: boolean) {
  await refreshConflictReader(page, origin);
  await expectSavedConflictObject(page, 'Oberoende förslag');
  await readSavedHistoricalDefinition(
    page,
    relationship,
    'Min privata typbenämning',
    'Min tidigare definition',
    relationship ? undefined : 'text',
  );
}
