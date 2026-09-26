import { expect, type Locator, test } from '@playwright/test';
import type { MapObject, MapState } from '../../src/shared/map.js';
import { createHousehold, openWorkspace, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';
import { modelMessage, modelTool, textModel } from '../support/text-model.js';

async function bounds(element: Locator) {
  const rectangle = await element.boundingBox();
  if (!rectangle) throw new Error('The panel must be visible.');
  return rectangle;
}

test('PANEL-01: independent object panels preserve unsent work and reuse each object', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
      await page.getByLabel('Objektets namn').fill(name);
      await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    const objects = page.getByRole('list', { name: 'Objekt', exact: true });
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await openWorkspace(page);
      await objects.getByRole('button', { name, exact: true }).click();
      const panel = page.getByRole('region', { name, exact: true });
      await expect(panel.getByRole('heading', { name, exact: true })).toBeFocused();
      await panel.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
      await panel.getByLabel('Beskrivning', { exact: true }).fill(`Oskickat om ${name}`);
    }
    await page
      .getByRole('navigation', { name: 'Kartans verktyg' })
      .getByRole('button', { name: 'Samtal och text', exact: true })
      .click();
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('region', { name: 'Samtal och text', exact: true })).toBeVisible();
    await page.getByLabel(/^Öppna paneler/).selectOption({ label: 'Cykeln' });
    await page.getByRole('button', { name: 'Stäng Cykeln', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Cykeln', exact: true })).not.toBeVisible();
    await openWorkspace(page);
    await objects.getByRole('button', { name: 'Cykeln', exact: true }).click();
    const cycle = page.getByRole('region', { name: 'Cykeln', exact: true });
    await expect(cycle.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Oskickat om Cykeln',
    );
    await openWorkspace(page);
    await objects.getByRole('button', { name: 'Cykeln', exact: true }).click();
    await expect(cycle).toHaveCount(1);
    await expect(
      page
        .getByRole('region', { name: 'Bilen', exact: true })
        .getByLabel('Beskrivning', { exact: true }),
    ).toHaveValue('Oskickat om Bilen');
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await page.getByLabel(/^Öppna paneler/).selectOption({ label: name });
      await page
        .getByRole('region', { name, exact: true })
        .getByRole('button', { name: 'Lägg i mitt utkast', exact: true })
        .click();
    }
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Sparat:' })).toBeVisible();
    await page.reload();
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await openWorkspace(page);
      await objects.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('region', { name, exact: true })).toContainText(
        `Beskrivning: Oskickat om ${name}`,
      );
    }
  } finally {
    await installation.close();
  }
});

test('PANEL-02: mobile panel choice retains conversation, object text and desktop positions', async ({
  page,
}) => {
  const installation = await createInstallation(undefined, {
    modelFetch: async () => Response.json({ output: [] }),
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
    await page.getByLabel('Objektets namn').fill('Cykeln');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await page.getByRole('button', { name: 'Stäng status', exact: true }).click();
    await page
      .getByRole('list', { name: 'Objekt', exact: true })
      .getByRole('button', { name: 'Cykeln', exact: true })
      .click();
    const panel = page.getByRole('region', { name: 'Cykeln', exact: true });
    await panel.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await panel.getByLabel('Beskrivning', { exact: true }).fill('Oskickad cykeltext');
    const handle = panel.getByRole('button', { name: 'Flytta Cykeln', exact: true });
    await handle.focus();
    await page.keyboard.press('ArrowLeft');
    const keyboardPosition = await bounds(panel);
    await handle.click();
    await panel.getByRole('button', { name: 'Vänster', exact: true }).click();
    const clickPosition = await bounds(panel);
    expect(clickPosition.x).toBeLessThan(keyboardPosition.x);
    await page.keyboard.press('Escape');
    await expect(handle).toBeFocused();
    const grip = await bounds(handle);
    await page.mouse.move(grip.x + 30, grip.y + 20);
    await page.mouse.down();
    await page.mouse.move(grip.x - 30, grip.y + 20, { steps: 5 });
    await page.mouse.up();
    const position = await bounds(panel);
    expect(position.x).toBeLessThan(clickPosition.x);
    await page
      .getByRole('navigation', { name: 'Kartans verktyg' })
      .getByRole('button', { name: 'Samtal och text', exact: true })
      .click();
    const conversation = page.getByRole('region', { name: 'Samtal och text', exact: true });
    await conversation.getByLabel(/Jag tillåter att OpenAI/).check();
    await conversation.getByLabel(/Jag tillåter förslag och sparande/).check();
    await conversation.getByRole('button', { name: 'Starta textassistenten', exact: true }).click();
    await conversation.getByLabel('Meddelande till textassistenten').fill('Oskickad samtalstext');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const chooser = page.getByLabel(/^Öppna paneler/);
      await expect(chooser).toBeVisible();
      await expect(chooser.locator('option')).toHaveText([
        'Lista och utkast',
        'Samtal och text',
        'Cykeln',
      ]);
      for (const name of ['Cykeln', 'Lista och utkast', 'Samtal och text']) {
        await chooser.selectOption({ label: name });
        const chosen = page.getByRole('region', { name, exact: true });
        await expect(chosen.getByRole('heading', { name, exact: true })).toBeFocused();
        await expect(page.locator('.workspace-window:visible')).toHaveCount(1);
        expect(
          await chosen.evaluate((element) => {
            const selector = document.querySelector('.workspace-window-selector');
            return Boolean(
              selector &&
                selector.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
            );
          }),
        ).toBe(true);
      }
      await expect(conversation.getByLabel('Meddelande till textassistenten')).toHaveValue(
        'Oskickad samtalstext',
      );
      await page.getByRole('button', { name: 'Stäng Samtal och text', exact: true }).click();
      await expect(chooser).toBeFocused();
      await page
        .getByRole('navigation', { name: 'Kartans verktyg' })
        .getByRole('button', { name: 'Samtal och text', exact: true })
        .click();
      await expect(conversation.getByLabel('Meddelande till textassistenten')).toHaveValue(
        'Oskickad samtalstext',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel(/^Öppna paneler/).selectOption({ label: 'Cykeln' });
    await expect(panel.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Oskickad cykeltext',
    );
    const returned = await bounds(panel);
    expect(returned.x).toBe(position.x);
    expect(returned.y).toBe(position.y);
  } finally {
    await installation.close();
  }
});

test('PANEL-03: an intervening proposal for the same object preserves text and blocks stale staging', async ({
  page,
}) => {
  let source: MapObject;
  let version = 0;
  let turn = 0;
  const model = textModel(() =>
    turn++ === 0
      ? [
          modelTool('propose_object', {
            id: source.id,
            baseRevision: source.revision,
            version,
            contentVersion: 1,
            value: {
              typeId: source.typeId,
              name: source.name,
              description: 'Assistentens nyare förslag',
            },
          }),
        ]
      : [modelMessage('Det nya förslaget finns i ditt utkast.')],
  );
  const installation = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
    await page.getByLabel('Objektets namn').fill('Cykeln');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Sparat:' })).toBeVisible();
    const state: MapState = await (
      await page.request.get(`${installation.origin}/api/households/${household.id}/map`)
    ).json();
    source = state.objects[0];
    version = state.draft.version;
    await page
      .getByRole('list', { name: 'Objekt', exact: true })
      .getByRole('button', { name: 'Cykeln', exact: true })
      .click();
    const object = page.getByRole('region', { name: 'Cykeln', exact: true });
    await object.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await object.getByLabel('Beskrivning', { exact: true }).fill('Min oskickade text');
    await page
      .getByRole('navigation', { name: 'Kartans verktyg' })
      .getByRole('button', { name: 'Samtal och text', exact: true })
      .click();
    const conversation = page.getByRole('region', { name: 'Samtal och text', exact: true });
    await conversation.getByLabel(/Jag tillåter att OpenAI/).check();
    await conversation.getByLabel(/Jag tillåter förslag och sparande/).check();
    await conversation.getByRole('button', { name: 'Starta textassistenten', exact: true }).click();
    await conversation
      .getByLabel('Meddelande till textassistenten')
      .fill('Föreslå en ny beskrivning för cykeln.');
    await conversation.getByRole('button', { name: 'Skicka', exact: true }).click();
    await expect(conversation).toContainText('Det nya förslaget finns i ditt utkast.');
    await page.getByLabel(/^Öppna paneler/).selectOption({ label: 'Cykeln' });
    await expect(object.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Min oskickade text',
    );
    await expect(object.getByRole('alert')).toContainText('äldre utkast');
    await expect(
      object.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }),
    ).toBeDisabled();
    await object.getByRole('button', { name: 'Stäng utan att skicka texten' }).click();
    await page
      .getByRole('list', { name: 'Objekt', exact: true })
      .getByRole('button', { name: 'Cykeln', exact: true })
      .click();
    await object.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await expect(object.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Assistentens nyare förslag',
    );
  } finally {
    await installation.close();
  }
});
