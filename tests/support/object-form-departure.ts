import { expect, type Page } from '@playwright/test';

/** Exercise both explicit loss decisions before leaving the ordinary object form. */
export async function verifyObjectDepartureAndDiscard(page: Page, values: Record<string, string>) {
  const labels = Object.keys(values);
  const focus = page.getByLabel(labels[labels.length - 1], { exact: true });
  await focus.focus();
  await page.keyboard.press('Escape');
  const leave = page.getByRole('dialog', { name: 'Lämna ändrade uppgifter?', exact: true });
  await leave.getByRole('button', { name: 'Fortsätt redigera', exact: true }).click();
  for (const [label, value] of Object.entries(values))
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(focus).toBeFocused();
  await page.keyboard.press('Escape');
  await leave.getByRole('button', { name: 'Kasta ändringarna och fortsätt', exact: true }).click();
  await expect(leave).not.toBeVisible();
  await expect(focus).toHaveCount(0);
}
