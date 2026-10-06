import { expect } from 'vitest';
import { page } from 'vitest/browser';

export async function openTable() {
  await page.getByRole('button', { name: 'Tabell', exact: true }).click();
  await expect
    .element(page.getByRole('region', { name: 'Hushållets tabell', exact: true }))
    .toBeVisible();
}

export async function openMap() {
  await page.getByRole('button', { name: 'Karta', exact: true }).click();
  await expect.element(page.getByRole('region', { name: 'Rymdkarta', exact: true })).toBeVisible();
}

export async function openNewObject() {
  await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nytt objekt', exact: true });
  await expect.element(dialog).toBeVisible();
  return dialog;
}

/** Do not dismiss a loss confirmation or an unresolved request on the caller's behalf. */
export async function closeSupportDialog(dialogName: string, closeButtonName = 'Stäng dialogen') {
  const dialog = page.getByRole('dialog', { name: dialogName, exact: true });
  await dialog.getByRole('button', { name: closeButtonName, exact: true }).click();
  await expect.element(dialog).not.toBeVisible();
}

export async function closeTextView() {
  const close = page.getByRole('button', { name: 'Stäng textvyn', exact: true });
  await close.click();
  await expect.element(close).not.toBeVisible();
}
