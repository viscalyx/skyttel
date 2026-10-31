import type { Page } from '@playwright/test';
import { openSettings } from '../support/client.js';
import { alex, robin } from '../support/installation.js';
import { prepareInstallationRecovery } from '../support/installation-recovery.js';
import { createPreparedContext, expect, test } from '../support/test.js';

async function login(page: Page, origin: string) {
  await page.goto(origin);
  await page.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
  await page.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
}
const confirm = 'Bekräfta hela listan och öppna åtkomsten';

test('RESTORE-01: review excludes revoked membership before reopening access', async ({
  page,
  browser,
}) => {
  const { installation, household } = await prepareInstallationRecovery();
  const otherContext = await createPreparedContext(browser);
  try {
    const { origin } = installation;
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, origin);
    await expect(
      page.getByRole('heading', { name: 'Bekräfta åtkomst efter återställning' }),
    ).toBeFocused();
    const other = await otherContext.newPage();
    installation.setIdentity(robin);
    await login(other, origin);
    await expect(
      other.getByText('Kontakta installationsansvarig.', { exact: false }),
    ).toBeVisible();
    await expect(other.getByRole('button', { name: confirm })).toHaveCount(0);
    const role = page.getByRole('combobox', { name: 'Robin Exempel – roll' });
    await role.focus();
    await page.keyboard.press('End');
    await expect(role).toHaveValue('revoked');
    const completion = page.getByRole('button', { name: confirm });
    // Membership order follows stable user IDs, not the fixture's random ID order.
    for (let step = 0; step < 2 && !(await completion.evaluate((element) => element === document.activeElement)); step++)
      await page.keyboard.press('Tab');
    await expect(completion).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: household.name, exact: true })).toBeVisible();
    await other.reload();
    await expect(
      other.getByRole('heading', { name: 'Du har inte tillgång till hushållet' }),
    ).toBeVisible();
    await installation.restart();
    await page.reload();
    await expect(page.getByRole('heading', { name: household.name, exact: true })).toBeVisible();
    await other.reload();
    await expect(
      other.getByRole('heading', { name: 'Du har inte tillgång till hushållet' }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
    await installation.close();
  }
});

test('RESTORE-02: an unchanged current list can be confirmed without individual approvals', async ({
  page,
  browser,
}) => {
  const { installation, household } = await prepareInstallationRecovery();
  const otherContext = await createPreparedContext(browser);
  try {
    await login(page, installation.origin);
    await expect(page.getByRole('combobox', { name: 'Alex Exempel – roll' })).toHaveValue(
      'administrator',
    );
    await expect(page.getByRole('combobox', { name: 'Robin Exempel – roll' })).toHaveValue(
      'member',
    );
    await page.getByRole('button', { name: confirm }).click();
    await expect(page.getByRole('heading', { name: household.name, exact: true })).toBeVisible();
    installation.setIdentity(robin);
    const other = await otherContext.newPage();
    await login(other, installation.origin);
    await expect(other.getByRole('heading', { name: household.name, exact: true })).toBeVisible();
  } finally {
    await otherContext.close();
    await installation.close();
  }
});

test('RESTORE-03: a designated new person explicitly appoints an administrator before completing review', async ({
  page,
  browser,
}) => {
  const { installation, household } = await prepareInstallationRecovery(true);
  const otherContext = await createPreparedContext(browser);
  try {
    await login(page, installation.origin);
    await page.getByRole('combobox', { name: 'Alex Exempel – roll' }).selectOption('member');
    await page.getByRole('button', { name: confirm }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Varje hushåll måste ha minst en administratör',
    );
    await expect(
      page.getByRole('heading', { name: 'Bekräfta åtkomst efter återställning' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: `Utse mig till administratör i ${household.name}` })
      .click();
    await expect(page.getByRole('combobox', { name: 'Lo Exempel – roll' })).toHaveValue(
      'administrator',
    );
    await expect(page.getByRole('combobox', { name: 'Lo Exempel – roll' })).toBeFocused();
    await page.getByRole('button', { name: confirm }).click();
    await expect(page.getByRole('heading', { name: household.name, exact: true })).toBeVisible();
    installation.setIdentity(alex);
    await openSettings(page);
    await page.getByRole('link', { name: 'Administrera tillgång', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Administrera tillgång', exact: true })).toBeVisible();
    const administrationAddress = page.url();
    const other = await otherContext.newPage();
    await login(other, installation.origin);
    await expect(other.getByRole('heading', { name: household.name, exact: true })).toBeVisible();
    await other.goto(administrationAddress);
    await expect(other.getByRole('heading', { name: 'Du kan inte administrera hushållet' })).toBeVisible();
  } finally {
    await otherContext.close();
    await installation.close();
  }
});
