import { expect, type Page } from '@playwright/test';
import type { PersonalPosition } from '../../src/shared/personal-view.js';
import { openMap, openTable } from './client.js';

/** Observe the rendered object projection independently of canvas size. */
export async function readPersonalProjection(page: Page, id: string) {
  return page
    .locator(`.spatial-surface line[data-object-id="${id}"]`)
    .evaluate((line: SVGLineElement) => {
      const canvas = line.ownerSVGElement?.parentElement?.querySelector('canvas');
      if (!canvas?.clientWidth || !canvas.clientHeight)
        throw new Error('The actual map canvas must be rendered');
      return {
        x: (line.x1.baseVal.value - canvas.clientWidth / 2) / canvas.clientHeight,
        y: (line.y1.baseVal.value - canvas.clientHeight / 2) / canvas.clientHeight,
      };
    });
}

/** The native move reads the restored scene coordinates, rather than an API fixture. */
export async function verifyRestoredPersonalMove(
  page: Page,
  name: string,
  saved: PersonalPosition,
  contentVersion: number,
) {
  await openTable(page);
  await page
    .getByRole('region', { name: 'Hushållets tabell', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
  await openMap(page);
  const navigation = page.getByRole('region', { name: 'Navigation', exact: true });
  if (!(await navigation.isVisible()))
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
  const before = await readPersonalProjection(page, saved.id);
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith('/map/view/position') && response.request().method() === 'POST',
  );
  const move = navigation.getByRole('button', { name: `Flytta ${name}: uppåt`, exact: true });
  await move.focus();
  await move.press('Enter');
  const applied = await response;
  expect(applied.status()).toBe(200);
  expect(applied.request().postDataJSON()).toEqual({
    contentVersion,
    id: saved.id,
    version: saved.version,
    position: { x: saved.x, y: saved.y + 1, z: saved.z },
  });
  await expect.poll(() => readPersonalProjection(page, saved.id)).not.toEqual(before);
  await expect(move).toBeEnabled();
  await expect(move).toBeFocused();
}
