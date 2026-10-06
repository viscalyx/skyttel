import { expect, type Page } from '@playwright/test';

/** Confirm the whole native form before returning to the originating work. */
export async function stageRelationshipAndClose(page: Page) {
  const dialog = page.getByRole('dialog', { name: /^Samband för / });
  await dialog.getByRole('button', { name: 'Lägg i utkastet', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Lägg i utkastet', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('status')).toContainText('Sambandet lades i ditt utkast');
  await dialog.getByRole('button', { name: 'Stäng samband', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
