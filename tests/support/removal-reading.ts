import { expect, type Locator, type Page } from '@playwright/test';
import type { MapState } from '../../src/shared/map.js';
import { closeTextView, openTable, utilityButton } from './client.js';
import { readTableObject } from './domain-work.js';

const meanings: Record<string, string> = {
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
  uncertain: 'Osäkert uppgivet',
  unresolved: 'Obesvarad fråga',
  ended: 'Manuellt upphört',
  active: 'Gäller fortfarande',
};

async function readValues(side: Locator, value: object) {
  const data = value as Record<string, unknown>;
  if ('typeId' in data && !data.lifecycle) await expect(side).toContainText('Följ slutdatum');
  if ('description' in data && !data.description) {
    const description = side
      .locator('dt')
      .filter({ hasText: /^Beskrivning/ })
      .locator('..');
    await expect(description).toContainText('Ej uppgivet');
  }
  for (const key of ['name', 'description', 'forwardLabel', 'reverseLabel']) {
    if (typeof data[key] === 'string' && data[key]) await expect(side).toContainText(data[key]);
  }
  for (const [key, raw] of Object.entries(data)) {
    if (key === 'customValues' && raw && typeof raw === 'object') {
      for (const answer of Object.values(raw))
        await expect(side).toContainText(
          answer === true ? 'Ja' : answer === false ? 'Nej' : String(answer),
        );
    }
    if (key === 'fields' && Array.isArray(raw)) {
      for (const field of raw) {
        await expect(side).toContainText(field.name);
        if (field.description) await expect(side).toContainText(field.description);
        if (field.sectionId === '') await expect(side).toContainText('Dold');
      }
    }
    if (key === 'knowledge' && typeof raw === 'string')
      await expect(side).toContainText(raw === 'known' ? 'Bekräftat' : meanings[raw]);
    if (key === 'lifecycle' && typeof raw === 'string')
      await expect(side).toContainText(meanings[raw]);
    if (key === 'endDate' || key === 'financialFacts') {
      const facts = key === 'endDate' ? [raw] : Object.values(raw as object);
      for (const fact of facts as { value?: string; knowledge: string; reportedOn?: string }[]) {
        await expect(side).toContainText(fact.value ?? meanings[fact.knowledge]);
        if (fact.knowledge === 'uncertain') await expect(side).toContainText('Osäkert uppgivet');
        if (fact.reportedOn) await expect(side).toContainText(fact.reportedOn);
      }
    }
  }
}

/** Read every complete before/after value through the actual proposal control. */
export async function readRemovalProposals(page: Page, state: MapState) {
  const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
  for (const [kind, changes] of [
    ['object', state.draft.changes],
    ['relationship', state.draft.relationships ?? []],
    ['objectType', state.draft.objectTypes ?? []],
    ['relationshipType', state.draft.relationshipTypes ?? []],
  ] as const) {
    for (const change of changes) {
      const prefix =
        kind === 'objectType' ? 'Objekttyp' : kind === 'relationshipType' ? 'Sambandstyp' : kind;
      const opener = draft.locator(`[id="draft-read-${prefix}-${change.id}"]`);
      await opener.click();
      const dialog = page.getByRole('dialog');
      for (const [heading, value] of [
        ['Sparade värden', change.before],
        ['Föreslagna värden', change.after],
      ] as const) {
        if (!value) continue;
        const side = dialog
          .locator('section')
          .filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
        await expect(side).toBeVisible();
        await readValues(side, value);
        if ('type' in change) {
          const type =
            heading === 'Sparade värden' ? (change.beforeType ?? change.type) : change.type;
          await expect(side).toContainText(type.name);
        }
        if (kind === 'object') {
          await expect(side.locator('dt').filter({ hasText: /^Identitet/ })).toBeVisible();
          const object = value as { identity?: string };
          await expect(side).toContainText(
            object.identity === 'unspecified'
              ? 'Ospecificerat objekt'
              : object.identity === 'unresolved'
                ? 'Identiteten behöver redas ut'
                : 'Identifierat objekt',
          );
        }
        if (kind === 'relationship') {
          const edge = value as { sourceId: string; targetId: string | null };
          for (const id of [edge.sourceId, edge.targetId]) {
            if (!id) continue;
            const proposal = state.draft.changes.find((item) => item.id === id);
            const object = heading === 'Föreslagna värden' ? proposal?.after : proposal?.before;
            const name = object?.name ?? state.objects.find((item) => item.id === id)?.name;
            if (!name) throw new Error(`Missing readable endpoint ${id}`);
            await expect(side).toContainText(name);
          }
        }
      }
      await page.keyboard.press('Escape');
      await expect(opener).toBeFocused();
    }
  }
}

/** Browser readback supplements, rather than replaces, exact history/purity guards. */
export async function readRemovalHistory(page: Page) {
  if (await page.getByRole('button', { name: 'Stäng textvyn', exact: true }).isVisible())
    await closeTextView(page);
  await (await utilityButton(page, 'Rapporter')).click();
  const history = page.getByRole('region', { name: 'Ändringshistorik', exact: true });
  await expect(history.getByRole('article')).toHaveCount(1);
  const card = history.getByRole('article');
  await card.getByText('Visa ändringarna', { exact: true }).click();
  for (const value of [
    'Blå cykel',
    'Hela den sparade beskrivningen',
    'SPARAT-17',
    'Utkastfordon',
    'Ramnummer',
    'Granskar',
  ])
    await expect(card).toContainText(value);
  await page
    .getByRole('region', { name: 'Rapporter', exact: true })
    .getByRole('button', { name: 'Tillbaka till arbetet', exact: true })
    .click();
  await openTable(page);
  const tableName = (await page
    .getByRole('button', { name: 'Alex blå cykel', exact: true })
    .count())
    ? 'Alex blå cykel'
    : 'Blå cykel';
  const details = await readTableObject(page, tableName);
  await expect(details).toContainText('SPARAT-17');
  await expect(details).toContainText('Hela den sparade beskrivningen');
  if (tableName === 'Alex blå cykel') {
    await expect(details).toContainText('FÖRESLAGET-42');
    await expect(details).toContainText('Fullständig föreslagen beskrivning');
  }
}
