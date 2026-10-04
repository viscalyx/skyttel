import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import Database from 'better-sqlite3';
import { createHousehold, openProfile, openWorkspace, signIn } from '../support/client.js';
import {
  consentBox,
  giveConversationConsent,
  microphoneButton,
  voiceBox,
} from '../support/conversation-page.js';
import { createInstallation } from '../support/installation.js';
import { liveBrowserFixtureSource } from '../support/live-browser.js';
import { liveProvider } from '../support/live-provider.js';
import { modelMessage, textModel } from '../support/text-model.js';

test('ACCESS-14: external sign-in explains the return and can be cancelled before leaving', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Fortsätt med Google' }).click();
    const next = page.getByRole('button', { name: 'Fortsätt till Google' });
    await expect(next).toBeFocused();
    await expect(
      page.getByText('Efter inloggningen kommer du tillbaka till Skyttel.', { exact: false }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
    await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Fortsätt med Google' })).toBeFocused();
    await expect(page.getByRole('status')).toContainText('Inloggningen avbröts');
    await page.getByRole('button', { name: 'Fortsätt med Microsoft' }).click();
    await page.getByRole('button', { name: 'Fortsätt till Microsoft' }).click();
    await expect(
      page.getByRole('heading', { name: 'Du har inte tillgång till hushållet' }),
    ).toBeFocused();
    await expect(page.getByLabel('Inbjudningskod', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Hushållets namn')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await installation.close();
  }
});

test('ACCESS-16: expired provider verification returns to login and a fresh attempt succeeds', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await page.goto(installation.origin);
    await page.route('**/api/auth/callback/google?*', async (route) => {
      // Arrange elapsed OAuth lifetime without changing production time or sessions.
      const database = new Database(join(installation.directory, 'skyttel.db'));
      database
        .prepare(
          "UPDATE verification SET value = json_set(value, '$.expiresAt', 0) WHERE identifier = ?",
        )
        .run(new URL(route.request().url()).searchParams.get('state'));
      database.close();
      await route.continue();
    });
    await page.getByRole('button', { name: 'Fortsätt med Google' }).click();
    await page.getByRole('button', { name: 'Fortsätt till Google' }).click();
    await expect(page.getByRole('alert')).toContainText('har gått ut eller kan inte verifieras');
    await expect(page.getByLabel('Hushållets namn')).toHaveCount(0);
    expect(
      await (await page.request.get(`${installation.origin}/api/bootstrap`)).json(),
    ).toMatchObject({ status: 'anonymous' });
    await page.unroute('**/api/auth/callback/google?*');
    await page.getByRole('button', { name: 'Fortsätt med Google' }).click();
    await page.getByRole('button', { name: 'Fortsätt till Google' }).click();
    await expect(page.getByRole('heading', { name: 'Skapa ditt hushåll' })).toBeVisible();
  } finally {
    await installation.close();
  }
});

test('ACCESS-17: revoked access retires protected work while the operator can open costs', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    const { user } = await (await page.request.get(`${installation.origin}/api/bootstrap`)).json();
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
    await page.getByLabel('Objektets namn').fill('Privat oskickat arbete');
    installation.revokeMembership(user.id);
    await expect(
      page.getByRole('heading', { name: 'Du har inte tillgång till hushållet' }),
    ).toBeFocused({ timeout: 10_000 });
    await expect(page.getByRole('region', { name: 'Rymdkarta', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Objektets namn')).toHaveCount(0);
    await expect(page.getByText(/Att logga in igen återställer inte/)).toBeVisible();
    await page.getByRole('link', { name: 'Månadskostnad' }).click();
    await expect(page.getByRole('heading', { name: 'Månadskostnad', exact: true })).toBeVisible();
  } finally {
    await installation.close();
  }
});

test('ACCESS-15: first visits use toolbar entries and optional help without start prompts', async ({
  page,
}) => {
  const live = liveProvider();
  const model = textModel(() => [modelMessage('Hej.')]);
  const installation = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.addInitScript({ content: liveBrowserFixtureSource });
    for (const [width, action] of [
      [1280, 'Prata med Skyttel'],
      [390, 'Skriv till Skyttel'],
      [320, 'Lista'],
    ] as const) {
      await page.setViewportSize({ width, height: 568 });
      await page.goto(installation.origin);
      const tools = page.getByRole('navigation', { name: 'Kartans verktyg' });
      await expect(page.getByText('Hushållets karta hämtas…', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('complementary', { name: 'Kom igång med kartan' })).toHaveCount(
        0,
      );
      await expect(
        page.getByText(/Vad vill du börja med|Vad hör ihop hemma hos er|Din karta börjar här/),
      ).toHaveCount(0);
      const help = tools.getByRole('button', { name: 'Information och hjälp', exact: true });
      await expect(help).toBeVisible();
      await expect(tools.getByRole('button', { name: 'Visa verktygens namn' })).toBeVisible();
      const requestsBeforeHelp = [
        model.requests.length,
        live.requests.length,
        await page.evaluate(() => window.skyttelVoiceFixture.stats().microphoneRequests),
      ];
      await help.click();
      await expect(
        page.getByRole('heading', { name: 'Information och hjälp', exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole('region', { name: 'Information och hjälp', exact: true }),
      ).toContainText('Kartans formulär finns kvar som alternativ till samtalet');
      await expect(consentBox(page)).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(help).toBeFocused();
      expect([
        model.requests.length,
        live.requests.length,
        await page.evaluate(() => window.skyttelVoiceFixture.stats().microphoneRequests),
      ]).toEqual(requestsBeforeHelp);
      await tools.getByRole('button', { name: action, exact: true }).click();
      if (action === 'Lista')
        await expect(page.getByRole('button', { name: 'Nytt objekt', exact: true })).toBeVisible();
      else {
        await expect(consentBox(page)).toBeVisible();
        await giveConversationConsent(page);
        if (action === 'Prata med Skyttel') {
          await expect(voiceBox(page)).toHaveText('Lyssnar');
          await expect(microphoneButton(page)).toHaveAttribute('aria-pressed', 'true');
          await expect(
            page.getByRole('region', { name: 'Skriv till Skyttel', exact: true }),
          ).toHaveCount(0);
        } else {
          await expect(
            page.getByRole('region', { name: 'Skriv till Skyttel', exact: true }),
          ).toBeVisible();
          await expect(microphoneButton(page)).toHaveAttribute('aria-pressed', 'false');
          await expect(voiceBox(page)).toHaveCount(0);
        }
      }
    }
  } finally {
    await installation.close();
  }
});

test('ACCESS-18: the chosen map theme also applies when returning to login', async ({ page }) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await page.getByRole('button', { name: /Tema: .*Byt tema/ }).click();
    await page.getByRole('radio', { name: 'Mörkt', exact: true }).click();
    await openProfile(page);
    await page.getByRole('button', { name: 'Logga ut' }).click();
    await expect(page.getByRole('heading', { name: 'Välkommen till Skyttel' })).toHaveCSS(
      'color',
      'rgb(237, 242, 249)',
    );
    for (const path of ['/costs', '/login-methods']) {
      await page.goto(`${installation.origin}${path}`);
      await expect(page.getByRole('heading', { name: 'Välkommen till Skyttel' })).toHaveCSS(
        'color',
        'rgb(237, 242, 249)',
      );
      await page.getByRole('button', { name: 'Fortsätt med Google' }).click();
      await expect(page.getByRole('button', { name: 'Fortsätt till Google' })).toBeFocused();
    }
  } finally {
    await installation.close();
  }
});
