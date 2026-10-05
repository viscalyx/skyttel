import { expect, request, test } from '@playwright/test';
import { draftChangeCount } from '../../src/shared/map.js';
import { prepareDraftRemovalFocus, prepareDraftRemovalMeaning } from '../support/draft-removal.js';
import { prepareDraftReview } from '../support/draft-review.js';
import { createInstallation } from '../support/installation.js';

test('UTKAST-46: removal of the final rows focuses the previous control and then the draft heading', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await prepareDraftRemovalFocus(page.request, installation.origin);
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await page.getByRole('button', { name: 'Utkast', exact: true }).click();
    const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
    const controls = draft.getByRole('button', { name: /^Ta bort förslaget:/ });
    await expect(controls).toHaveCount(2);
    await controls.last().click();
    await expect(controls).toHaveCount(1);
    await expect(controls.first()).toBeFocused();
    await controls.first().click();
    await expect(controls).toHaveCount(0);
    await expect(draft.getByRole('heading', { name: 'Utkast', exact: true })).toBeFocused();
    expect(draftChangeCount((await data.read()).draft)).toBe(0);
  } finally {
    await installation.close();
  }
});

for (const preserveLaterFocus of [false, true]) {
  test(`UTKAST-46: delayed removal restores a disappearing draft tool and preserves later focus (${preserveLaterFocus ? 'later control' : 'draft tool'})`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    let release: (() => void) | undefined;
    try {
      const data = await prepareDraftReview(page.request, installation.origin);
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let applied: (() => void) | undefined;
      const changed = new Promise<void>((resolve) => {
        applied = resolve;
      });
      await page.route('**/map/discard-review', async (route) => {
        if (!route.request().postDataJSON().confirmation) return route.continue();
        const response = await route.fetch();
        applied?.();
        await held;
        await route.fulfill({ response });
      });
      await page.goto(`${installation.origin}/households/${data.household.id}`);
      const tools = page.getByRole('navigation', { name: 'Kartans verktyg' });
      await tools.getByRole('button', { name: 'Utkast', exact: true }).click();
      await page.getByRole('button', { name: 'Kasta hela utkastet', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Ta bort hela utkastet?', exact: true });
      await dialog.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }).click();
      await changed;
      await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click();
      await page.getByRole('button', { name: 'Stäng textvyn', exact: true }).click();
      const write = tools.getByRole('button', { name: /^Skriv till Skyttel/ });
      await tools.getByRole('button', { name: 'Utkast', exact: true }).focus();
      if (preserveLaterFocus)
        await tools.getByRole('button', { name: 'Tabell', exact: true }).focus();
      release?.();
      await expect(tools.getByRole('button', { name: 'Utkast', exact: true })).toHaveCount(0);
      await expect(
        preserveLaterFocus ? tools.getByRole('button', { name: 'Tabell', exact: true }) : write,
      ).toBeFocused();
      await expect(page.getByRole('status', { name: 'Utkastets åtgärdsstatus' })).toContainText(
        'Hela ditt utkast har tagits bort',
      );
    } finally {
      release?.();
      await installation.close();
    }
  });
}

test('UTKAST-48: authoritative discard rejects forged or unauthorized requests and recovers an applied removal after a lost reply', async ({
  page,
}) => {
  const installation = await createInstallation();
  const anonymous = await request.newContext();
  try {
    const data = await prepareDraftReview(page.request, installation.origin);
    const before = await data.read();
    const history = await (await page.request.get(`${data.path}/history`)).json();
    const body = {
      kind: 'all',
      version: before.draft.version,
      contentVersion: before.contentVersion,
    };
    const preview = await (
      await page.request.post(`${data.path}/discard-review`, {
        headers: { origin: installation.origin },
        data: body,
      })
    ).json();
    const forged = await page.request.post(`${data.path}/discard-review`, {
      headers: { origin: installation.origin },
      data: { ...body, confirmation: { ...preview.plan, removed: [] } },
    });
    expect(forged.status()).toBe(409);
    const stale = await page.request.post(`${data.path}/discard-review`, {
      headers: { origin: installation.origin },
      data: { ...body, version: before.draft.version - 1, confirmation: preview.plan },
    });
    expect(stale.status()).toBe(409);
    const unauthorized = await anonymous.post(`${data.path}/discard-review`, {
      headers: { origin: installation.origin },
      data: { ...body, confirmation: preview.plan },
    });
    expect(unauthorized.status()).toBe(401);
    expect(await data.read()).toEqual(before);
    await page.route('**/map/discard-review', async (route) => {
      if (!route.request().postDataJSON().confirmation) return route.continue();
      await route.fetch();
      await route.abort();
    });
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await page.getByRole('button', { name: 'Utkast', exact: true }).click();
    const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
    await draft.getByRole('button', { name: 'Kasta hela utkastet', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Ta bort hela utkastet?', exact: true });
    await dialog.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Borttagningen kunde inte bekräftas');
    await expect(
      dialog.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }),
    ).toBeDisabled();
    expect(draftChangeCount((await data.read()).draft)).toBe(0);
    await dialog.getByRole('button', { name: 'Hämta aktuellt utkast', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(draft).toContainText('Utkastet är tomt');
    await expect(draft.getByRole('heading', { name: 'Utkast', exact: true })).toBeFocused();
    const after = await data.read();
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
    expect(await (await page.request.get(`${data.path}/history`)).json()).toEqual(history);
  } finally {
    await anonymous.dispose();
    await installation.close();
  }
});

for (const kind of ['objectType', 'relationshipType'] as const) {
  test(`UTKAST-47: discarding an edited ${kind} retains incompatible values and displays the remaining type conflict`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      const data = await prepareDraftRemovalMeaning(page.request, installation.origin, kind);
      const before = await data.read();
      const history = await (await page.request.get(`${data.path}/history`)).json();
      await page.goto(`${installation.origin}/households/${data.household.id}`);
      await page.getByRole('button', { name: 'Utkast', exact: true }).click();
      const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
      await draft
        .getByRole('button', { name: `Ta bort förslaget: ${data.type.name}`, exact: true })
        .click();
      const dialog = page.getByRole('dialog', {
        name: 'Ta bort förslaget och dess beroenden?',
        exact: true,
      });
      const affected = dialog.getByRole('list', { name: 'Förslag som blir kvar men påverkas' });
      await expect(affected).toContainText('Typens uppgifter skiljer sig');
      await dialog.getByRole('button', { name: 'Ta bort', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const after = await data.read();
      const changes = kind === 'objectType' ? after.draft.changes : after.draft.relationships;
      const change = changes?.find(({ id }) => id === data.proposalId);
      expect(change).toEqual(
        (kind === 'objectType' ? before.draft.changes : before.draft.relationships)?.find(
          ({ id }) => id === data.proposalId,
        ),
      );
      const row = draft.locator('tr').filter({
        has: page.locator(
          `#draft-read-${kind === 'objectType' ? 'object' : 'relationship'}-${data.proposalId}`,
        ),
      });
      await expect(row).toContainText('Typens uppgifter skiljer sig');
      await expect(row.locator('.draft-row-warning')).toBeVisible();
      expect(after.objects).toEqual(before.objects);
      expect(after.relationships).toEqual(before.relationships);
      expect(after.types).toEqual(before.types);
      expect(after.relationshipTypes).toEqual(before.relationshipTypes);
      expect(await (await page.request.get(`${data.path}/history`)).json()).toEqual(history);
    } finally {
      await installation.close();
    }
  });
}

test('UTKAST-48: lost independent removal checks actual draft before offering another removal', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await prepareDraftReview(page.request, installation.origin);
    const before = await data.read();
    await page.route('**/map/discard-review', async (route) => {
      if (!route.request().postDataJSON().confirmation) return route.continue();
      await route.fetch();
      await route.abort();
    });
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await page.getByRole('button', { name: 'Utkast', exact: true }).click();
    const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
    await draft
      .getByRole('button', { name: 'Ta bort förslaget: Olöst fordon', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Ta bort förslaget och dess beroenden?',
      exact: true,
    });
    await expect(dialog.getByRole('alert')).toContainText('Borttagningen kunde inte bekräftas');
    await expect(dialog.getByRole('button', { name: 'Ta bort', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Hämta aktuellt utkast', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      draft.getByRole('button', { name: 'Ta bort förslaget: Olöst fordon', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('status', { name: 'Utkastets åtgärdsstatus' })).toContainText(
      'Förslaget finns inte längre',
    );
    const after = await data.read();
    expect(after.draft).toEqual({
      ...before.draft,
      version: before.draft.version + 1,
      changes: before.draft.changes.filter(({ id }) => id !== 'draft-unresolved'),
    });
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
  } finally {
    await installation.close();
  }
});

test('UTKAST-41: independent removal preserves other proposals and history and focuses the next control', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await prepareDraftReview(page.request, installation.origin);
    const before = await data.read();
    const history = await (await page.request.get(`${data.path}/history`)).json();
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await page.getByRole('button', { name: 'Utkast', exact: true }).click();
    const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
    const remove = draft.getByRole('button', {
      name: 'Ta bort förslaget: Olöst fordon',
      exact: true,
    });
    const nextName = await draft
      .getByRole('button', { name: /^Ta bort förslaget:/ })
      .nth(3)
      .getAttribute('aria-label');
    if (!nextName) throw new Error('Expected the next proposal control');
    await remove.focus();
    await page.keyboard.press('Enter');
    await expect(remove).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(draft.getByRole('button', { name: nextName, exact: true })).toBeFocused();
    const after = await data.read();
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
    expect(after.draft).toEqual({
      ...before.draft,
      version: before.draft.version + 1,
      changes: before.draft.changes.filter(({ id }) => id !== 'draft-unresolved'),
    });
    expect(await (await page.request.get(`${data.path}/history`)).json()).toEqual(history);
    await expect(page.getByRole('status', { name: 'Utkastets åtgärdsstatus' })).toContainText(
      'Förslaget är borttaget',
    );
  } finally {
    await installation.close();
  }
});

for (const width of [1280, 320]) {
  test(`UTKAST-42: dependent object removal shows its actual edge proposals and cancellation changes nothing at ${width}px`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      const data = await prepareDraftReview(page.request, installation.origin);
      const before = await data.read();
      const history = await (await page.request.get(`${data.path}/history`)).json();
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${installation.origin}/households/${data.household.id}`);
      await page.getByRole('button', { name: 'Utkast', exact: true }).click();
      const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
      const remove = draft.getByRole('button', {
        name: 'Ta bort förslaget: Ospecificerat fordon',
        exact: true,
      });
      await remove.click();
      const dialog = page.getByRole('dialog', {
        name: 'Ta bort förslaget och dess beroenden?',
        exact: true,
      });
      await expect(dialog.getByRole('button', { name: 'Avbryt', exact: true })).toBeFocused();
      await expect(dialog.getByRole('listitem')).toHaveCount(4);
      await expect(dialog).toContainText('Ospecificerat fordon');
      await expect(dialog.getByRole('listitem').filter({ hasText: 'Samband' })).toHaveCount(3);
      await expect(dialog).not.toContainText('Olöst fordon');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(remove).toBeFocused();
      expect(await data.read()).toEqual(before);
      await remove.click();
      await dialog.getByRole('button', { name: 'Ta bort', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(remove).toHaveCount(0);
      await expect(
        draft.getByRole('button', { name: 'Ta bort förslaget: Olöst fordon', exact: true }),
      ).toBeFocused();
      const after = await data.read();
      expect(after.draft.changes.map(({ id }) => id)).toEqual(['draft-bike', 'draft-unresolved']);
      expect(after.draft.relationships?.map(({ id }) => id)).toEqual(['draft-edge-unknown']);
      expect(after.draft.relationships).toEqual(
        before.draft.relationships?.filter(({ id }) => id === 'draft-edge-unknown'),
      );
      expect(after.draft.objectTypes).toEqual(before.draft.objectTypes);
      expect(after.draft.relationshipTypes).toEqual(before.draft.relationshipTypes);
      expect(after.objects).toEqual(before.objects);
      expect(after.relationships).toEqual(before.relationships);
      expect(await (await page.request.get(`${data.path}/history`)).json()).toEqual(history);
      await expect(page.getByRole('status', { name: 'Utkastets åtgärdsstatus' })).toContainText(
        'Förslagen är borttagna',
      );
    } finally {
      await installation.close();
    }
  });
}

for (const width of [1280, 320]) {
  test(`UTKAST-44: whole draft discard requires confirmation and preserves unsent conversation and shared history at ${width}px`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      const data = await prepareDraftReview(page.request, installation.origin);
      const before = await data.read();
      const history = await (await page.request.get(`${data.path}/history`)).json();
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${installation.origin}/households/${data.household.id}`);
      await page.getByRole('button', { name: 'Utkast', exact: true }).click();
      const message = page.getByLabel('Meddelande till Skyttel', { exact: true });
      await message.fill('Min oskickade fråga ska finnas kvar');
      const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
      const discard = draft.getByRole('button', { name: 'Kasta hela utkastet', exact: true });
      await discard.click();
      const dialog = page.getByRole('dialog', { name: 'Ta bort hela utkastet?', exact: true });
      await expect(dialog.getByRole('button', { name: 'Avbryt', exact: true })).toBeFocused();
      await expect(dialog.getByRole('listitem')).toHaveCount(draftChangeCount(before.draft));
      await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click();
      await expect(discard).toBeFocused();
      expect(await data.read()).toEqual(before);
      await discard.click();
      await dialog.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(draft.getByRole('heading', { name: 'Utkast', exact: true })).toBeFocused();
      await expect(draft).toContainText('Utkastet är tomt');
      await expect(
        page
          .getByRole('navigation', { name: 'Kartans verktyg' })
          .getByRole('button', { name: 'Utkast', exact: true }),
      ).toHaveCount(0);
      await expect(message).toHaveValue('Min oskickade fråga ska finnas kvar');
      const after = await data.read();
      expect(draftChangeCount(after.draft)).toBe(0);
      expect(after.objects).toEqual(before.objects);
      expect(after.relationships).toEqual(before.relationships);
      expect(after.types).toEqual(before.types);
      expect(after.relationshipTypes).toEqual(before.relationshipTypes);
      expect(await (await page.request.get(`${data.path}/history`)).json()).toEqual(history);
      await expect(page.getByRole('status', { name: 'Utkastets åtgärdsstatus' })).toContainText(
        'Hela ditt utkast har tagits bort',
      );
    } finally {
      await installation.close();
    }
  });
}

test('UTKAST-45: a stale discard confirmation preserves newer proposals and refreshes its actual plan', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const data = await prepareDraftReview(page.request, installation.origin);
    await page.goto(`${installation.origin}/households/${data.household.id}`);
    await page.getByRole('button', { name: 'Utkast', exact: true }).click();
    const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
    await draft
      .getByRole('button', { name: 'Ta bort förslaget: Ospecificerat fordon', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Ta bort förslaget och dess beroenden?',
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await data.post('object-type', {
      id: 'newer-independent-type',
      baseRevision: null,
      value: { name: 'Nyare oberoende typ', description: '', fields: [] },
    });
    const newer = await data.read();
    await dialog.getByRole('button', { name: 'Ta bort', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Borttagningen kunde inte bekräftas');
    expect(await data.read()).toEqual(newer);
    await expect(dialog.getByRole('button', { name: 'Ta bort', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Hämta aktuellt utkast', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog.getByRole('listitem')).toHaveCount(4);
    await expect(dialog).not.toContainText('Nyare oberoende typ');
    await dialog.getByRole('button', { name: 'Ta bort', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(draft).toContainText('Nyare oberoende typ');
    const result = await data.read();
    expect(result.draft.objectTypes?.find(({ id }) => id === 'newer-independent-type')).toEqual(
      newer.draft.objectTypes?.find(({ id }) => id === 'newer-independent-type'),
    );
    expect(result.objects).toEqual(newer.objects);
  } finally {
    await installation.close();
  }
});

for (const kind of ['objectType', 'relationshipType'] as const) {
  test(`UTKAST-43: removing a new ${kind} preserves dependent proposals with a truthful type warning`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      const data = await prepareDraftReview(page.request, installation.origin);
      await data.post(kind === 'objectType' ? 'object-type' : 'relationship-type', {
        id: 'discard-type',
        baseRevision: null,
        value: {
          name: 'Tillfällig typ',
          description: '',
          fields: [],
          ...(kind === 'relationshipType'
            ? { forwardLabel: 'granskar', reverseLabel: 'granskas av' }
            : {}),
        },
      });
      await data.post(kind === 'objectType' ? 'draft' : 'relationship', {
        id: 'typed-proposal',
        baseRevision: null,
        value:
          kind === 'objectType'
            ? { name: 'Tillfälligt föremål', description: '', typeId: 'discard-type' }
            : {
                sourceId: 'draft-bike',
                targetId: null,
                typeId: 'discard-type',
                knowledge: 'unknown',
              },
      });
      const before = await data.read();
      const history = await (await page.request.get(`${data.path}/history`)).json();
      await page.goto(`${installation.origin}/households/${data.household.id}`);
      await page.getByRole('button', { name: 'Utkast', exact: true }).click();
      const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
      await draft
        .getByRole('button', { name: 'Ta bort förslaget: Tillfällig typ', exact: true })
        .click();
      const dialog = page.getByRole('dialog', {
        name: 'Ta bort förslaget och dess beroenden?',
        exact: true,
      });
      await expect(dialog.getByRole('button', { name: 'Avbryt', exact: true })).toBeFocused();
      await expect(
        dialog.getByRole('heading', { name: 'Förslag som blir kvar men påverkas' }),
      ).toBeVisible();
      const affected = dialog.getByRole('list', { name: 'Förslag som blir kvar men påverkas' });
      await expect(affected.getByRole('listitem')).toHaveCount(1);
      await expect(affected).toContainText(
        kind === 'objectType' ? 'Tillfälligt föremål' : 'granskar',
      );
      await expect(affected).toContainText(
        kind === 'objectType' ? 'Objekttypen saknas' : 'Sambandstypen saknas',
      );
      await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click();
      expect(await data.read()).toEqual(before);
      await draft
        .getByRole('button', { name: 'Ta bort förslaget: Tillfällig typ', exact: true })
        .click();
      await dialog.getByRole('button', { name: 'Ta bort', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const after = await data.read();
      const changes = kind === 'objectType' ? after.draft.changes : after.draft.relationships;
      expect(changes?.find(({ id }) => id === 'typed-proposal')?.after?.typeId).toBe(
        'discard-type',
      );
      expect(after.objects).toEqual(before.objects);
      expect(after.relationships).toEqual(before.relationships);
      await expect(draft).toContainText(
        kind === 'objectType' ? 'Objekttypen saknas' : 'Sambandstypen saknas',
      );
      expect(await (await page.request.get(`${data.path}/history`)).json()).toEqual(history);
    } finally {
      await installation.close();
    }
  });
}
