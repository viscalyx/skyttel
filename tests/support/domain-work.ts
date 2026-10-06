import { expect, type Page } from '@playwright/test';
import { openTable } from './client.js';

/** Read a complete object through its actual expanded table row. */
export async function readTableObject(page: Page, name: string) {
  await openTable(page);
  const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
  const expansion = table.getByRole('button', { name, exact: true });
  if ((await expansion.getAttribute('aria-expanded')) !== 'true') await expansion.click();
  await table.getByRole('button', { name: `Läs alla uppgifter för ${name}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Uppgifter för ${name}`, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Open the ordinary full object form from the table's named edit action. */
export async function editTableObject(page: Page, name: string) {
  await openTable(page);
  await page
    .getByRole('region', { name: 'Hushållets tabell', exact: true })
    .getByRole('button', { name: `Redigera ${name}`, exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: `Redigera ${name}`, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
