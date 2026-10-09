import { expect, type Page } from '@playwright/test';
import { closeSupportDialog } from './client.js';
import { readDraftProposal } from './domain-work.js';

/** Read the complete fictional proposal without saving or replacing it. */
export async function readVoiceProposal(
  page: Page,
  name = 'Lo Exempel',
  description = 'Påhittad uppgift',
) {
  const proposal = await readDraftProposal(page, name);
  const proposed = proposal
    .getByRole('heading', { name: 'Föreslagna värden', exact: true })
    .locator('..');
  await expect(proposed).toContainText('Person');
  await expect(
    proposed
      .locator('dt')
      .filter({ hasText: /^Typ(?: · ändrat)?$/ })
      .locator('..')
      .getByRole('definition'),
  ).toHaveText('Person');
  await expect(
    proposed
      .locator('dt')
      .filter({ hasText: /^Namn(?: · ändrat)?$/ })
      .locator('..')
      .getByRole('definition'),
  ).toHaveText(name);
  await expect(
    proposed
      .locator('dt')
      .filter({ hasText: /^Beskrivning(?: · ändrat)?$/ })
      .locator('..')
      .getByRole('definition'),
  ).toHaveText(description);
  await closeSupportDialog(page, name);
}
