import { expect, type Locator, type Page } from '@playwright/test';
import type { Property, PropertyKind } from '../../src/shared/properties.js';

/** Compare values by stable property identity when order is asserted separately. */
export function propertyValues(value: { properties?: Property[] } | null | undefined) {
  return Object.fromEntries(
    (value?.properties ?? []).map((property) => [
      property.id,
      'value' in property ? property.value : undefined,
    ]),
  );
}

/** Find a uniquely labelled free property through the ordinary editor. */
export function propertyRow(form: Locator | Page, label: string) {
  return form.locator('.property-editor-row').filter({
    has: form.locator(`input[value=${JSON.stringify(label)}]`),
  });
}

/** Add or correct one property without changing any other row. */
export async function setProperty(
  form: Locator | Page,
  label: string,
  value: string,
  kind: PropertyKind = 'text',
) {
  const section = form.getByRole('button', { name: 'Fria egenskaper', exact: true });
  if ((await section.count()) && (await section.getAttribute('aria-expanded')) !== 'true')
    await section.click();
  let row = propertyRow(form, label);
  if (!(await row.count())) {
    await form.getByRole('button', { name: 'Lägg till egenskap', exact: true }).click();
    row = form.locator('.property-editor-row').last();
    await row.getByLabel('Etikett', { exact: true }).fill(label);
  }
  await expect(row).toHaveCount(1);
  await row.getByLabel('Datatyp', { exact: true }).selectOption(kind);
  if (kind === 'boolean') await row.getByLabel('Värde', { exact: true }).selectOption(value);
  else await row.getByLabel('Värde', { exact: true }).fill(value);
}
