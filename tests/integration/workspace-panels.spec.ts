import { expect, type Locator, type Page, test } from '@playwright/test';
import type { MapObject, MapState } from '../../src/shared/map.js';
import {
  activatePanel,
  closePanels,
  createHousehold,
  openWorkspace,
  signIn,
} from '../support/client.js';
import {
  closeConversationText,
  microphoneButton,
  openConversationText,
  startConversationWithText,
  turnMicrophoneOn,
  voiceBox,
} from '../support/conversation-page.js';
import { createInstallation } from '../support/installation.js';
import { liveBrowserFixtureSource } from '../support/live-browser.js';
import { liveProvider } from '../support/live-provider.js';
import { modelMessage, modelTool, textModel } from '../support/text-model.js';

async function bounds(element: Locator) {
  const rectangle = await element.boundingBox();
  if (!rectangle) throw new Error('The panel must be visible.');
  return rectangle;
}

async function dragWindow(page: Page, panel: Locator, handle: Locator, x: number, y: number) {
  const initial = await bounds(panel);
  const grip = await bounds(handle);
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + x - initial.x, start.y + y - initial.y, { steps: 6 });
  await page.mouse.up();
}

test('PANEL-08: limited space switches between full-width work and text while voice continues', async ({
  page,
}) => {
  const live = liveProvider();
  const installation = await createInstallation(undefined, {
    modelFetch: textModel(() => [modelMessage('Hej.')]).provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript({ content: liveBrowserFixtureSource });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    const panel = page.getByRole('region', { name: 'Nytt objekt', exact: true });
    await panel.getByLabel('Objektets namn').fill('Bevarat formulär');
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    const navigation = page.getByRole('region', { name: 'Navigation', exact: true });
    await startConversationWithText(page);
    await turnMicrophoneOn(page);
    const conversation = page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });
    await conversation.getByLabel('Meddelande till Skyttel').fill('Bevarat meddelande');
    await page.setViewportSize({ width: 760, height: 1000 });
    await expect(conversation).toBeVisible();
    await expect(page.locator('.workspace-window:visible')).toHaveCount(0);
    await expect(navigation).not.toBeVisible();
    expect((await bounds(conversation)).width).toBe(400);
    await openWorkspace(page);
    await expect(conversation).not.toBeVisible();
    await page.getByRole('button', { name: 'Fortsätt: Bevarat formulär', exact: true }).click();
    await expect(panel.getByLabel('Objektets namn')).toHaveValue('Bevarat formulär');
    expect((await bounds(panel)).width).toBe(380);
    const formPosition = await bounds(panel);
    await openConversationText(page);
    await expect(conversation.getByLabel('Meddelande till Skyttel')).toHaveValue(
      'Bevarat meddelande',
    );
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    await expect(navigation).toBeVisible();
    await expect(conversation).not.toBeVisible();
    expect((await bounds(navigation)).width).toBe(350);
    await expect(navigation.getByRole('group', { name: 'Navigation', exact: true })).toBeFocused();
    await openConversationText(page);
    await expect(navigation).not.toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(conversation).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(navigation).toBeVisible();
    await expect(conversation.getByLabel('Meddelande till Skyttel')).toBeFocused();
    await expect(microphoneButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(voiceBox(page)).toBeVisible();
    // A later resize keeps the forms if that is where the user last worked.
    await navigation.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
    await panel.getByLabel('Objektets namn').focus();
    await page.setViewportSize({ width: 760, height: 1000 });
    await expect(panel).toBeVisible();
    await expect(conversation).not.toBeVisible();
    await expect(panel.getByLabel('Objektets namn')).toBeFocused();
    await expect.poll(() => bounds(panel)).toEqual(formPosition);
    await openConversationText(page);
    await expect(conversation.getByLabel('Meddelande till Skyttel')).toHaveValue(
      'Bevarat meddelande',
    );
  } finally {
    await installation.close();
  }
});

test('PANEL-07: windows stop at visible conversation areas and retain relocated positions', async ({
  page,
}) => {
  const live = liveProvider();
  const installation = await createInstallation(undefined, {
    modelFetch: textModel(() => [modelMessage('Hej.')]).provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript({ content: liveBrowserFixtureSource });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    const panel = page.getByRole('region', { name: 'Nytt objekt', exact: true });
    const handle = panel.getByRole('button', { name: 'Flytta Nytt objekt', exact: true });
    await panel.getByLabel('Objektets namn').fill('Skyddad oskickad text');
    await dragWindow(page, panel, handle, 112, 20);
    await startConversationWithText(page);
    await turnMicrophoneOn(page);
    await closeConversationText(page);
    const voice = await bounds(voiceBox(page));
    await dragWindow(page, panel, handle, 1440, 20);
    const stopped = await bounds(panel);
    expect(stopped.x + stopped.width).toBeLessThanOrEqual(voice.x);
    expect(stopped.y).toBe(20);
    // The small voice box blocks its own rectangle, not a whole screen column.
    await dragWindow(page, panel, handle, stopped.x, 80);
    await dragWindow(page, panel, handle, 1440, 80);
    const below = await bounds(panel);
    expect(below.x + below.width).toBe(1440);
    expect(below.y).toBe(80);
    await openConversationText(page);
    const conversation = page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });
    await expect
      .poll(async () => {
        const form = await bounds(panel);
        return form.x + form.width;
      })
      .toBe((await bounds(conversation)).x);
    const relocated = await bounds(panel);
    await dragWindow(page, panel, handle, 1440, relocated.y + 40);
    const sliding = await bounds(panel);
    expect(sliding.x).toBe(relocated.x);
    expect(sliding.y).toBe(relocated.y + 40);
    await conversation
      .getByRole('separator', { name: 'Ändra samtalstextens bredd', exact: true })
      .press('ArrowLeft');
    await expect.poll(async () => (await bounds(panel)).x).toBe(relocated.x - 24);
    await handle.click();
    const buttonPosition = await bounds(panel);
    await panel.getByRole('button', { name: 'Höger', exact: true }).click();
    expect((await bounds(panel)).x).toBe(buttonPosition.x);
    await page.keyboard.press('Escape');
    const fitted = await bounds(panel);
    await closeConversationText(page);
    await expect.poll(() => bounds(panel)).toEqual(fitted);
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    const navigation = page.getByRole('region', { name: 'Navigation', exact: true });
    const title = navigation.getByRole('group', { name: 'Navigation', exact: true });
    await dragWindow(page, navigation, title, 112, 20);
    await dragWindow(page, navigation, title, 1440, 20);
    const navigationStop = await bounds(navigation);
    expect(navigationStop.x + navigationStop.width).toBeLessThanOrEqual(voice.x);
    expect(navigationStop.y).toBe(20);
    await openConversationText(page);
    const chat = await bounds(conversation);
    await expect
      .poll(async () => {
        const window = await bounds(navigation);
        return window.x + window.width;
      })
      .toBeLessThanOrEqual(chat.x);
    await title.press('Shift+ArrowRight');
    expect((await bounds(navigation)).x + navigationStop.width).toBeLessThanOrEqual(chat.x);
    await navigation.getByText('Fönstrets placering', { exact: true }).click();
    const navigationButtonPosition = await bounds(navigation);
    await navigation.getByRole('button', { name: 'Flytta fönstret åt höger', exact: true }).click();
    expect((await bounds(navigation)).x).toBe(navigationButtonPosition.x);
    expect((await bounds(navigation)).x + navigationStop.width).toBeLessThanOrEqual(chat.x);
    const kept = await bounds(navigation);
    await closeConversationText(page);
    await expect.poll(() => bounds(navigation)).toEqual(kept);
    await expect(panel.getByLabel('Objektets namn')).toHaveValue('Skyddad oskickad text');
  } finally {
    await installation.close();
  }
});

test('PANEL-06: draggable forms can cover the legend and reach the screen edges', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    await page.getByLabel('Objektets namn').fill('Cykeln');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Teckenförklaring i kartan' })).toBeVisible();
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    const panel = page.getByRole('region', { name: 'Nytt objekt', exact: true });
    await panel.getByLabel('Objektets namn').fill('Oskickat över legenden');
    const handle = panel.getByRole('button', { name: 'Flytta Nytt objekt', exact: true });
    const initial = await bounds(panel);
    const grip = await bounds(handle);
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      grip.x + grip.width / 2 - initial.x + 20,
      grip.y + grip.height / 2 - initial.y + 20,
      { steps: 6 },
    );
    await page.mouse.up();
    await expect.poll(async () => (await bounds(panel)).x).toBe(20);
    await expect.poll(async () => (await bounds(panel)).y).toBe(20);
    await expect
      .poll(() =>
        panel.evaluate((element) => {
          const legend = document.querySelector('.map-legend')?.getBoundingClientRect();
          if (!legend) return false;
          const hit = document.elementFromPoint(
            legend.left + legend.width / 2,
            legend.top + legend.height / 2,
          );
          return Boolean(hit && element.contains(hit));
        }),
      )
      .toBe(true);
    expect(
      await panel.evaluate((element) => element.contains(document.elementFromPoint(40, 100))),
    ).toBe(true);
    await handle.focus();
    for (let step = 0; step < 40; step++) await handle.press('Shift+ArrowRight');
    for (let step = 0; step < 30; step++) await handle.press('Shift+ArrowDown');
    const corner = await bounds(panel);
    expect(corner.x + corner.width).toBe(1440);
    expect(corner.y + corner.height).toBe(1000);
    await handle.click();
    await panel.getByRole('button', { name: 'Höger', exact: true }).click();
    await panel.getByRole('button', { name: 'Nedåt', exact: true }).click();
    const buttonCorner = await bounds(panel);
    expect(buttonCorner.x + buttonCorner.width).toBe(1440);
    expect(buttonCorner.y + buttonCorner.height).toBe(1000);
    await expect(panel.getByLabel('Objektets namn')).toHaveValue('Oskickat över legenden');
  } finally {
    await installation.close();
  }
});

test('PANEL-05: a delayed object proposal preserves a newer search focus and the normal return target', async ({
  page,
}) => {
  const installation = await createInstallation();
  let releaseResponse = () => {};
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    const newObject = page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true });
    for (const name of ['Cykeln', 'Bilen']) {
      await newObject.click();
      await page.getByLabel('Objektets namn').fill(name);
      await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
      await expect(newObject).toBeFocused();
    }
    const search = page.getByLabel('Sök objekt', { exact: true });
    await search.fill('Cykeln');
    await page
      .getByRole('list', { name: 'Objekt', exact: true })
      .getByRole('button', { name: 'Uppgifter för Cykeln', exact: true })
      .click();
    const cycle = page.getByRole('region', { name: 'Cykeln', exact: true });
    await cycle.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await cycle.getByLabel('Beskrivning').fill('Skickad beskrivning');
    let responseReady = () => {};
    const ready = new Promise<void>((resolve) => {
      responseReady = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await page.route('**/map/draft', async (route) => {
      const response = await route.fetch();
      responseReady();
      await released;
      await route.fulfill({ response });
    });
    await cycle.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await ready;
    await openWorkspace(page);
    await search.fill('Bi');
    releaseResponse();
    await expect(cycle).not.toBeVisible();
    await expect(search).toBeFocused();
    await page.keyboard.type('len');
    await expect(search).toHaveValue('Bilen');
    await expect(
      page.getByRole('list', { name: 'Objekt', exact: true }).getByRole('button', {
        name: 'Uppgifter för Bilen',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Skickad beskrivning',
    );
  } finally {
    releaseResponse();
    await installation.close();
  }
});

test('PANEL-01: independent object panels preserve unsent work and reuse each object', async ({
  page,
}) => {
  const installation = await createInstallation(undefined, {
    modelFetch: textModel(() => [modelMessage('Hej.')]).provider,
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await page
        .getByRole('region', { name: 'Lista och utkast', exact: true })
        .getByRole('button', { name: 'Nytt objekt', exact: true })
        .click();
      await page
        .getByRole('region', { name: 'Nytt objekt', exact: true })
        .getByLabel('Objektets namn')
        .fill(name);
      await page.getByRole('button', { name: 'Stäng Nytt objekt', exact: true }).click();
    }
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await page.getByRole('button', { name: `Fortsätt: ${name}`, exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Nytt objekt', exact: true }).getByLabel('Objektets namn'),
      ).toHaveValue(name);
      await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    const objects = page.getByRole('list', { name: 'Objekt', exact: true });
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await openWorkspace(page);
      await objects.getByRole('button', { name: `Uppgifter för ${name}`, exact: true }).click();
      const panel = page.getByRole('region', { name, exact: true });
      await expect(panel.getByRole('heading', { name, exact: true })).toBeFocused();
      await panel.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
      await panel.getByLabel('Beskrivning', { exact: true }).fill(`Oskickat om ${name}`);
    }
    await startConversationWithText(page);
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole('region', { name: 'Skriv till Skyttel', exact: true }),
    ).toBeVisible();
    await activatePanel(page, 'Cykeln');
    await page.getByRole('button', { name: 'Stäng Cykeln', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Cykeln', exact: true })).not.toBeVisible();
    await openWorkspace(page);
    await objects.getByRole('button', { name: 'Uppgifter för Cykeln', exact: true }).click();
    const cycle = page.getByRole('region', { name: 'Cykeln', exact: true });
    await expect(cycle.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Oskickat om Cykeln',
    );
    await openWorkspace(page);
    await objects.getByRole('button', { name: 'Uppgifter för Cykeln', exact: true }).click();
    await expect(cycle).toHaveCount(1);
    await expect(cycle.getByRole('heading', { name: 'Cykeln', exact: true })).toBeFocused();
    await expect(
      page
        .getByRole('region', { name: 'Bilen', exact: true })
        .getByLabel('Beskrivning', { exact: true }),
    ).toHaveValue('Oskickat om Bilen');
    for (const name of ['Cykeln', 'Bilen', 'Garaget']) {
      await activatePanel(page, name);
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
      await objects.getByRole('button', { name: `Uppgifter för ${name}`, exact: true }).click();
      await expect(page.getByRole('region', { name, exact: true })).toContainText(
        `Beskrivning: Oskickat om ${name}`,
      );
    }
  } finally {
    await installation.close();
  }
});

test('PANEL-02: mobile panel navigation retains conversation, object text and desktop positions', async ({
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
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    await page.getByLabel('Objektets namn').fill('Cykeln');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Kartans status' })).toContainText(
      'Utkastet är sparat',
    );
    await page
      .getByRole('list', { name: 'Objekt', exact: true })
      .getByRole('button', { name: 'Uppgifter för Cykeln', exact: true })
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
    await page.setViewportSize({ width: 900, height: 1000 });
    await expect
      .poll(async () => {
        const fitted = await bounds(panel);
        return fitted.x + fitted.width;
      })
      .toBeLessThanOrEqual(900);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect.poll(async () => (await bounds(panel)).x).toBe(position.x);
    await startConversationWithText(page);
    const conversation = page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });
    await conversation.getByLabel('Meddelande till Skyttel').fill('Oskickad samtalstext');
    await expect(page.getByLabel(/^Öppna paneler/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Stäng arbetsytan', exact: true })).toHaveCount(
      0,
    );
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      // On a narrow screen the text view fills the screen, and the panels wait behind it.
      await expect(conversation).toBeVisible();
      await closeConversationText(page);
      await expect(page.getByLabel(/^Öppna paneler/)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Stäng arbetsytan', exact: true })).toHaveCount(
        0,
      );
      for (const name of ['Cykeln', 'Lista och utkast']) {
        await activatePanel(page, name);
        const chosen = page.getByRole('region', { name, exact: true });
        const focusTarget =
          name === 'Lista och utkast'
            ? chosen.getByRole('button', { name: 'Uppgifter för Cykeln', exact: true })
            : chosen.getByRole('heading', { name, exact: true });
        await expect(focusTarget).toBeFocused();
        await expect
          .poll(() =>
            focusTarget.evaluate((element) => {
              const box = element.getBoundingClientRect();
              const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
              return (
                element === document.activeElement &&
                box.width > 0 &&
                box.height > 0 &&
                box.left >= 0 &&
                box.right <= innerWidth &&
                box.top >= 0 &&
                box.bottom <= innerHeight &&
                Boolean(hit && (hit === element || element.contains(hit)))
              );
            }),
          )
          .toBe(true);
        await expect(page.locator('.workspace-window:visible')).toHaveCount(1);
      }
      await openWorkspace(page);
      await page
        .getByRole('list', { name: 'Objekt', exact: true })
        .getByRole('button', { name: 'Uppgifter för Cykeln', exact: true })
        .click();
      await expect(panel.getByRole('heading', { name: 'Cykeln', exact: true })).toBeFocused();
      await openConversationText(page);
      await expect(conversation.getByLabel('Meddelande till Skyttel')).toHaveValue(
        'Oskickad samtalstext',
      );
      await expect(page.locator('.workspace-window:visible')).toHaveCount(0);
      // The panel that waited behind the text view comes back with the focus.
      await conversation.getByRole('button', { name: 'Stäng textvyn', exact: true }).click();
      await expect(panel.getByRole('heading', { name: 'Cykeln', exact: true })).toBeFocused();
      await openConversationText(page);
      await expect(conversation.getByLabel('Meddelande till Skyttel')).toHaveValue(
        'Oskickad samtalstext',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await activatePanel(page, 'Cykeln');
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
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
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
      .getByRole('button', { name: 'Uppgifter för Cykeln', exact: true })
      .click();
    const object = page.getByRole('region', { name: 'Cykeln', exact: true });
    await object.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await object.getByLabel('Beskrivning', { exact: true }).fill('Min oskickade text');
    await expect(object.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Min oskickade text',
    );
    await expect(object.getByLabel('Objektets namn', { exact: true })).toHaveValue('Cykeln');
    await startConversationWithText(page);
    const conversation = page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });
    await conversation
      .getByLabel('Meddelande till Skyttel')
      .fill('Föreslå en ny beskrivning för cykeln.');
    await conversation.getByRole('button', { name: 'Skicka', exact: true }).click();
    await expect(conversation).toContainText('Det nya förslaget finns i ditt utkast.');
    await activatePanel(page, 'Cykeln');
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
      .getByRole('button', { name: 'Uppgifter för Cykeln', exact: true })
      .click();
    await object.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await expect(object.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Assistentens nyare förslag',
    );
  } finally {
    await installation.close();
  }
});

test('PANEL-04: map selection preserves unsent relationship and type forms', async ({ page }) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const headers = { origin: installation.origin };
    const initial: MapState = await (await page.request.get(path)).json();
    for (const [version, id, name] of [
      [0, 'bike', 'Cykeln'],
      [1, 'garage', 'Garaget'],
    ] as const) {
      expect(
        (
          await page.request.post(`${path}/draft`, {
            headers,
            data: {
              version,
              contentVersion: initial.contentVersion,
              id,
              baseRevision: null,
              value: { typeId: initial.types[0].id, name, description: '' },
            },
          })
        ).ok(),
      ).toBe(true);
    }
    expect(
      (
        await page.request.post(`${path}/relationship`, {
          headers,
          data: {
            version: 2,
            contentVersion: initial.contentVersion,
            id: 'edge',
            baseRevision: null,
            value: {
              typeId: initial.relationshipTypes[0].id,
              sourceId: 'bike',
              targetId: 'garage',
              knowledge: 'known',
            },
          },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.post(`${path}/save`, {
          headers,
          data: { version: 3, contentVersion: initial.contentVersion, operationId: 'setup' },
        })
      ).ok(),
    ).toBe(true);
    await page.goto(installation.origin);
    await page.getByLabel('Alla etiketter', { exact: true }).check();
    await openWorkspace(page);
    for (const [button, label, value, close] of [
      ['Nytt samband', 'Från objekt', 'bike', 'Stäng sambandet utan att skicka'],
      ['Ny objekttyp', 'Typens namn', 'Oskickad typ', 'Stäng typformuläret utan att skicka'],
      [
        'Ny sambandstyp',
        'Sambandstypens namn',
        'Oskickad riktning',
        'Stäng sambandstypen utan att skicka',
      ],
    ]) {
      await page.getByRole('button', { name: button, exact: true }).click();
      if (button === 'Nytt samband')
        await page.getByLabel(label, { exact: true }).selectOption(value);
      else await page.getByLabel(label, { exact: true }).fill(value);
      await closePanels(page);
      const edge = page.locator('.spatial-labels').getByRole('button', { name: /^Välj samband:/ });
      await edge.focus();
      await page.keyboard.press('Enter');
      await openWorkspace(page);
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
      await page.getByRole('button', { name: close, exact: true }).click();
    }
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Inga förslag',
    );
  } finally {
    await installation.close();
  }
});
