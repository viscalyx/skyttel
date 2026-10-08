import { expect, type Page } from '@playwright/test';
import { closeSupportDialog, closeTextView, openDraftReview } from './client.js';
import { expectConflictDraftValues, expectConflictReadValue } from './current-conflict-reading.js';
import { openTypeDefinitions, readDraftProposal } from './domain-work.js';

export async function readIndependentHistoricalProposal(page: Page) {
  await expectConflictDraftValues(page, 'Oberoende förslag', {
    Namn: 'Oberoende förslag',
    Beskrivning: 'Ej uppgivet',
  });
  await closeTextView(page);
}

export async function readHistoricalDefinitionProposal(
  page: Page,
  relationship: boolean,
  name = 'Min privata typbenämning',
  description = 'Min tidigare definition',
  side: 'Sparade värden' | 'Föreslagna värden' = 'Föreslagna värden',
) {
  const proposal = await readDraftProposal(page, name);
  const values = proposal.getByRole('heading', { name: side, exact: true }).locator('..');
  await expectConflictReadValue(values, 'Namn', name);
  await expectConflictReadValue(values, 'Beskrivning', description);
  await expectConflictReadValue(values, 'Avsnitt', 'Egna fält');
  if (relationship) {
    await expectConflictReadValue(values, 'Framåtriktning', 'förvaras i');
    await expectConflictReadValue(values, 'Omvänd riktning', 'förvarar');
  } else await expectConflictReadValue(values, 'Eget fält: Installationsår', 'Text · Egna fält');
  await closeSupportDialog(page, name);
  await closeTextView(page);
}

export async function readSavedHistoricalDefinition(
  page: Page,
  relationship: boolean,
  name: string,
  description: string,
  fieldKind?: 'text' | 'number',
) {
  await openTypeDefinitions(page);
  await page
    .getByText(relationship ? 'Sambandstyper och riktning' : 'Objekttyper och egna fält', {
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {
      name: `${relationship ? 'Ändra sambandstyp' : 'Ändra typ'}: ${name}`,
      exact: true,
    })
    .click();
  const definition = page.getByRole('group', {
    name: relationship ? 'Sambandstypens definition' : 'Objekttypens definition',
    exact: true,
  });
  await expect(
    definition.getByLabel(relationship ? 'Sambandstypens namn' : 'Typens namn', { exact: true }),
  ).toHaveValue(name);
  await expect(
    definition.getByLabel(relationship ? 'Sambandstypens beskrivning' : 'Typens beskrivning', {
      exact: true,
    }),
  ).toHaveValue(description);
  if (relationship) {
    await expect(definition.getByLabel('Benämning från startobjektet')).toHaveValue('förvaras i');
    await expect(definition.getByLabel('Benämning från målobjektet')).toHaveValue('förvarar');
  }
  if (fieldKind) {
    await expect(definition.getByLabel('Fältets namn', { exact: true })).toHaveValue(
      'Installationsår',
    );
    await expect(definition.getByLabel('Värdeslag', { exact: true })).toHaveValue(fieldKind);
  } else await expect(definition.getByLabel('Fältets namn', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', {
      name: relationship
        ? 'Stäng sambandstypen utan att skicka'
        : 'Stäng typformuläret utan att skicka',
      exact: true,
    })
    .click();
  await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
}

export async function expectHistoricalProposalAbsent(page: Page, name: string) {
  const draft = await openDraftReview(page);
  await expect(
    draft.getByRole('button', { name: `Visa förslaget: ${name}`, exact: true }),
  ).toHaveCount(0);
  await closeTextView(page);
}
