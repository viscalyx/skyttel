import { expect, test } from '@playwright/test';
import { contrast } from '../support/accessibility.js';

// Test infrastructure: these checks exercise the measurement, not an application workflow.
for (const color of ['rgb(0, 0, 0)', 'color(srgb 0 0 0)', 'oklch(0% 0 0)']) {
  test(`contrast measures black on white expressed as ${color}`, { tag: '@technical' }, async ({
    page,
  }) => {
    await page.setContent(`<p style="color:${color};background:white">Measured text</p>`);
    expect(await contrast(page.locator('p'))).toBeCloseTo(21, 5);
  });
}

test('contrast measures an opaque color mix through a transparent descendant', {
  tag: '@technical',
}, async ({ page }) => {
  await page.setContent(
    '<p style="color:black;background:color-mix(in srgb, black 50%, white)">' +
      '<span style="background:color(srgb 1 0 0 / 0)">Measured text</span></p>',
  );
  expect(await contrast(page.locator('span'))).toBeCloseTo(5.317, 2);
});

test('contrast rejects translucent colors instead of reporting an opaque contrast', {
  tag: '@technical',
}, async ({ page }) => {
  await page.setContent('<p style="color:black;background:rgb(255 255 255 / 50%)">Text</p>');
  await expect(contrast(page.locator('p'))).rejects.toThrow('Expected an opaque color');
});

test('contrast rejects text without an opaque surface', { tag: '@technical' }, async ({ page }) => {
  await page.setContent('<p>Text</p>');
  await expect(contrast(page.locator('p'))).rejects.toThrow('The text has no surface behind it');
});
