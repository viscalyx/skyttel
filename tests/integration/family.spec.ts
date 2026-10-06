import { expect, type Page, test } from '@playwright/test';
import {
  closeSupportDialog,
  closeTextView,
  createHousehold,
  openDraftReview,
  openNewObject,
  openTable,
  signIn,
} from '../support/client.js';
import { applyProposedConflictChanges } from '../support/conflict-properties.js';
import { saveReviewedConflictDraft } from '../support/conflict-special.js';
import {
  editObjectRelationship,
  editTableObject,
  openObjectRelationships,
  readDraftProposal,
} from '../support/domain-work.js';
import { createInstallation } from '../support/installation.js';
import { stageRelationshipAndClose } from '../support/relationship-dialog.js';

async function chooseRelationshipObject(page: Page, label: string, name: string) {
  const select = page.getByLabel(label, { exact: true });
  const id = await select
    .getByRole('option')
    .filter({ hasText: `${name} ·` })
    .getAttribute('value');
  expect(id).toEqual(expect.any(String));
  await select.selectOption(id ?? '');
}

test('KARTA-07: family objects and directed relationships save together and keep their identities', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async () => (await page.request.get(path)).json();
    const post = async (route: string, data: unknown) =>
      page.request.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
    let state = await read();
    for (const [id, type, name] of [
      ['service', 'Tjänst', 'Molnmusik'],
      ['account', 'Tjänstekonto', 'Familjens konto'],
      ['subscription', 'Abonnemang', 'Familjemusik'],
      ['person', 'Person', 'Lo'],
      ['email', 'E-postadress', 'familj@example.test'],
      ['card', 'Kort', 'Familjekort'],
      ['bank', 'Bankkonto', 'Hushållskonto'],
      ['company', 'Företag', 'Moln AB'],
    ]) {
      const response = await post('draft', {
        version: state.draft.version,
        id,
        baseRevision: null,
        value: {
          typeId: state.types.find((item: { name: string }) => item.name === type).id,
          name,
          description: '',
        },
      });
      expect(response.status()).toBe(200);
      state = await read();
    }
    const typeId = state.relationshipTypes.find(
      (item: { name: string }) => item.name === 'Gäller tjänstekontot',
    ).id;
    const value = { typeId, sourceId: 'subscription', targetId: 'account', knowledge: 'known' };
    let response = await post('relationship', {
      version: state.draft.version,
      id: 'subscription-account',
      baseRevision: null,
      value,
    });
    expect(response.status()).toBe(200);
    state = await read();
    expect(state.objects).toEqual([]);
    expect(state.relationships).toEqual([]);
    expect(state.draft.relationships).toHaveLength(1);
    response = await post('relationship', {
      version: state.draft.version,
      id: 'duplicate',
      baseRevision: null,
      value,
    });
    expect(response.status()).toBe(200);
    state = await read();
    expect(state.draft.relationships).toHaveLength(1);
    response = await post('save', { version: state.draft.version, operationId: 'family-save' });
    expect(response.status()).toBe(200);
    const { receipt } = await response.json();
    expect(receipt.changes).toHaveLength(8);
    expect(receipt.relationships[0].after).toMatchObject({ id: 'subscription-account', ...value });
    await installation.restart();
    state = await read();
    expect(state.objects).toHaveLength(8);
    expect(state.relationships).toEqual([receipt.relationships[0].after]);
    const history = await (await page.request.get(`${path}/history`)).json();
    expect(history.history[0]).toEqual(receipt);
  } finally {
    await installation.close();
  }
});

test('KARTA-05: manual forms preserve incomplete meanings and block an unanswered identity question', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openTable(page);
    for (const [name, type, identity] of [
      ['Familjemusik', 'Abonnemang', 'identified'],
      ['Betalkonto', 'Bankkonto', 'unspecified'],
    ]) {
      await openNewObject(page);
      await page.getByLabel('Namn', { exact: true }).fill(name);
      await page.getByLabel('Objekttyp', { exact: true }).selectOption({ label: type });
      await page.getByLabel('Identitet').selectOption(identity);
      await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    }
    await openObjectRelationships(page, 'Familjemusik');
    await page.getByRole('button', { name: 'Nytt samband', exact: true }).click();
    await chooseRelationshipObject(page, 'Från objekt', 'Familjemusik');
    await page.getByLabel('Sambandstyp', { exact: true }).selectOption({ label: 'Betalas med' });
    await page.getByLabel('Uppgiftens säkerhet', { exact: true }).selectOption('unresolved');
    await stageRelationshipAndClose(page);
    await page.reload();
    await openTable(page);
    const unresolvedDraft = await openDraftReview(page);
    await expect(unresolvedDraft).toContainText('Olöst identitet');
    await expect(unresolvedDraft).toContainText(
      'Målet är oklart. Rätta sambandet i det ordinarie flödet.',
    );
    await expect(page.getByRole('button', { name: 'Spara hela utkastet' })).toBeDisabled();
    await closeTextView(page);
    await editObjectRelationship(
      page,
      'Familjemusik',
      'Familjemusik → Betalas med → Obesvarad identitetsfråga',
    );
    await page.getByLabel('Uppgiftens säkerhet', { exact: true }).selectOption('uncertain');
    await chooseRelationshipObject(page, 'Till objekt', 'Betalkonto');
    await stageRelationshipAndClose(page);
    await saveReviewedConflictDraft(page);
    await closeTextView(page);
    await page.reload();
    await openTable(page);
    const relationship = await openObjectRelationships(page, 'Familjemusik');
    await expect(relationship).toContainText('Osäkert uppgivet');
    await closeSupportDialog(page, 'Samband för Familjemusik');
    await editTableObject(page, 'Betalkonto');
    await expect(page.getByLabel('Identitet')).toHaveValue('unspecified');
    await page
      .getByRole('dialog', { name: 'Redigera Betalkonto', exact: true })
      .getByRole('button', { name: 'Avbryt', exact: true })
      .click();
    await openTable(page);
    let relationshipName = 'Familjemusik → Betalas med → Betalkonto (Osäkert uppgivet)';
    for (const knowledge of ['unknown', 'none']) {
      await editObjectRelationship(page, 'Familjemusik', relationshipName);
      await page.getByLabel('Uppgiftens säkerhet', { exact: true }).selectOption(knowledge);
      await stageRelationshipAndClose(page);
      await saveReviewedConflictDraft(page);
      await closeTextView(page);
      await page.reload();
      const meanings = await openObjectRelationships(page, 'Familjemusik');
      await expect(meanings).toContainText(
        knowledge === 'unknown' ? 'Okänt' : 'Uttryckligen inget',
      );
      relationshipName = await meanings.getByRole('heading', { level: 4 }).innerText();
      await closeSupportDialog(page, 'Samband för Familjemusik');
    }
  } finally {
    await installation.close();
  }
});

test('UTKAST-01: demo seed resumes a conflict and preserves independent proposals without granting access to map people', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const household = installation.seedDemo();
    await signIn(page.request, installation.origin);
    await page.goto(installation.origin);
    await openTable(page);
    await expect(page.getByRole('table')).toContainText('Familjens Molnmusik');
    const subscriptionRelationships = await openObjectRelationships(page, 'Familjens musikkort');
    await expect(subscriptionRelationships).toContainText('Kortfakturan betalas från');
    await closeSupportDialog(page, 'Samband för Familjens musikkort');
    const review = page.getByRole('region', { name: 'Utkastet', exact: true });
    const lo = await readDraftProposal(page, 'Lo Lind');
    await expect(lo).toContainText('Lo Exempel');
    await expect(lo).toContainText('Lo Lind');
    await closeSupportDialog(page, 'Lo Lind');
    await closeTextView(page);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Granska konflikter' })
        .getByRole('region', { name: 'Sparat i kartan nu' }),
    ).toContainText('Lo Berg');
    await page.keyboard.press('Escape');
    await openDraftReview(page);
    const sharedBefore = await page.request.get(
      `${installation.origin}/api/households/${household.id}/map`,
    );
    const beforeRejected = await sharedBefore.json();
    const historyBefore = await (
      await page.request.get(`${installation.origin}/api/households/${household.id}/map/history`)
    ).json();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    const saveDialog = page.getByRole('dialog', { name: 'Spara utkastet', exact: true });
    await expect(saveDialog).toContainText('Utkastet kunde inte sparas');
    expect(
      await (
        await page.request.get(`${installation.origin}/api/households/${household.id}/map`)
      ).json(),
    ).toEqual(beforeRejected);
    expect(
      await (
        await page.request.get(`${installation.origin}/api/households/${household.id}/map/history`)
      ).json(),
    ).toEqual(historyBefore);
    await closeSupportDialog(page, 'Spara utkastet');
    await closeTextView(page);
    await installation.restart();
    await page.reload();
    await openTable(page);
    await applyProposedConflictChanges(page, 'Lo Berg');
    const reviewedLo = await readDraftProposal(page, 'Lo Lind');
    await expect(reviewedLo).toContainText('Spelar piano i musikföreningen.');
    await closeSupportDialog(page, 'Lo Lind');
    const emailProposalName = 'Familjens musikkonto → Inloggningsadress → musik@example.test';
    const emailProposal = await readDraftProposal(page, emailProposalName);
    await expect(emailProposal).toContainText('familjen@example.test');
    await expect(emailProposal).toContainText('musik@example.test');
    await closeSupportDialog(page, emailProposalName);
    await closeTextView(page);
    await editTableObject(page, 'Familjens musikkonto');
    await page.getByLabel('Namn', { exact: true }).fill('Familjens rättade konto');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    const renamedProposalName = 'Familjens rättade konto → Inloggningsadress → musik@example.test';
    const relationshipReview = await readDraftProposal(page, renamedProposalName);
    await expect(relationshipReview).toContainText('Familjens musikkonto');
    await expect(relationshipReview).toContainText('familjen@example.test');
    await expect(relationshipReview).toContainText('Familjens rättade konto');
    await expect(relationshipReview).toContainText('musik@example.test');
    await closeSupportDialog(page, renamedProposalName);

    await saveReviewedConflictDraft(page);
    await closeTextView(page);
    await page.reload();
    await openTable(page);
    await openDraftReview(page);
    await expect(review).toContainText('Utkastet är tomt.');
    await closeTextView(page);
    await expect(await openObjectRelationships(page, 'Familjens rättade konto')).toContainText(
      'Familjens rättade konto → Inloggningsadress → musik@example.test',
    );
  } finally {
    await installation.close();
  }
});

test('KARTA-07: a concurrent duplicate refreshes the saved relationship and allows explicit editing', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const other = await browser.newContext();
  try {
    const household = installation.seedDemo();
    await signIn(page.request, installation.origin);
    const path = `${installation.origin}/api/households/${household.id}/map`;
    let state = await (await page.request.get(path)).json();
    await page.request.post(`${path}/discard`, {
      headers: { origin: installation.origin },
      data: { version: state.draft.version },
    });
    await page.goto(installation.origin);
    await openObjectRelationships(page, 'Kim Exempel');
    await page.getByRole('button', { name: 'Nytt samband', exact: true }).click();
    await page
      .getByLabel('Från objekt')
      .selectOption(
        state.objects.find((object: { name: string }) => object.name === 'Kim Exempel').id,
      );
    await page.getByLabel('Sambandstyp', { exact: true }).selectOption({ label: 'Använder' });
    await page
      .getByLabel('Till objekt')
      .selectOption(
        state.objects.find((object: { name: string }) => object.name === 'Molnmusik').id,
      );
    installation.setIdentity({
      subject: 'second-user',
      name: 'Robin',
      email: 'robin@example.test',
    });
    await signIn(other.request, installation.origin);
    const { user } = await (await other.request.get(`${installation.origin}/api/bootstrap`)).json();
    const { code } = await (
      await page.request.post(`${installation.origin}/api/households/${household.id}/invitations`, {
        headers: { origin: installation.origin },
        data: { userId: user.id },
      })
    ).json();
    await other.request.post(`${installation.origin}/api/invitations/accept`, {
      headers: { origin: installation.origin },
      data: { code },
    });
    state = await (await other.request.get(path)).json();
    const draft = await (
      await other.request.post(`${path}/relationship`, {
        headers: { origin: installation.origin },
        data: {
          version: state.draft.version,
          id: 'concurrent-edge',
          baseRevision: null,
          value: {
            typeId: state.relationshipTypes.find(
              (value: { name: string }) => value.name === 'Använder',
            ).id,
            sourceId: state.objects.find((value: { name: string }) => value.name === 'Kim Exempel')
              .id,
            targetId: state.objects.find((value: { name: string }) => value.name === 'Molnmusik')
              .id,
            knowledge: 'known',
          },
        },
      })
    ).json();
    await other.request.post(`${path}/save`, {
      headers: { origin: installation.origin },
      data: { version: draft.version, operationId: 'concurrent-save' },
    });
    await page
      .getByRole('dialog', { name: 'Samband för Kim Exempel', exact: true })
      .getByRole('button', { name: 'Lägg i utkastet', exact: true })
      .click();
    const form = page.getByRole('dialog', { name: 'Samband för Kim Exempel', exact: true });
    await expect(form.getByRole('alert')).toContainText('Sambandet finns redan');
    await expect(
      form.getByRole('region', { name: 'Sambandet före inskickning', exact: true }),
    ).toContainText('Kim Exempel använder Molnmusik');
    await expect(
      form.getByRole('heading', { name: 'Kim Exempel → Använder → Molnmusik', exact: true }),
    ).toBeVisible();
    const current = await (await page.request.get(path)).json();
    expect(
      current.relationships.filter((edge: { id: string }) => edge.id === 'concurrent-edge'),
    ).toHaveLength(1);
    expect(current.draft.relationships ?? []).toEqual([]);
    await form.getByRole('button', { name: 'Redigera befintligt samband', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Lämna ändrade uppgifter?', exact: true })
      .getByRole('button', { name: 'Kasta ändringarna och fortsätt', exact: true })
      .click();
    await expect(
      form.getByRole('heading', { name: 'Redigera samband', exact: true }),
    ).toBeVisible();
    expect(await (await page.request.get(path)).json()).toEqual(current);
  } finally {
    await other.close();
    await installation.close();
  }
});
