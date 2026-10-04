import { type APIRequestContext, expect, type Page, request } from '@playwright/test';
import { textViewButtonAccessibleName } from './conversation.js';

// These HTTP-only clients use default context options. Keep their authenticated
// session across a deliberate server restart, but retire the old socket pool.
export async function restartWithSession(
  client: APIRequestContext,
  restart: () => Promise<unknown>,
) {
  const storageState = await client.storageState();
  await client.dispose();
  await restart();
  return request.newContext({ storageState });
}

export async function openWorkspace(page: Page) {
  await page
    .getByRole('navigation', { name: 'Kartans verktyg' })
    .getByRole('button', { name: 'Lista', exact: true })
    .click();
}

export async function activatePanel(page: Page, title: string) {
  await openWorkspace(page);
  if (title === 'Nytt objekt') await page.getByRole('button', { name: /^Fortsätt:/ }).click();
  else if (title !== 'Lista och utkast')
    await page.getByRole('button', { name: `Uppgifter för ${title}`, exact: true }).click();
  await expect(page.getByRole('region', { name: title, exact: true })).toBeVisible();
}

export async function closePanels(page: Page) {
  // On a narrow screen the text view fills the screen. Closing it ends no conversation.
  const textView = page.getByRole('button', { name: 'Stäng textvyn', exact: true });
  if ((page.viewportSize()?.width ?? 1280) <= 700 && (await textView.isVisible()))
    await textView.click();
  const close = page.locator(
    '.workspace-window[data-active="true"]:visible .workspace-window-close',
  );
  while ((await close.count()) > 0) await close.first().click();
}

export async function openMap(page: Page) {
  await closePanels(page);
  await expect(page.getByRole('region', { name: 'Rymdkarta', exact: true })).toBeVisible();
}

export async function openProfile(page: Page) {
  const button = await utilityButton(page, 'Din profil');
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}

export async function openSettings(page: Page) {
  const button = await utilityButton(page, 'Inställningar');
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}

export async function utilityButton(page: Page, name: string) {
  const tools = page.getByRole('navigation', { name: 'Kartans verktyg' });
  await expect(tools).toBeVisible();
  const button = tools.getByRole('button', {
    name: name === 'Skriv till Skyttel' ? textViewButtonAccessibleName : name,
    exact: true,
  });
  if (!(await button.isVisible()))
    await tools.getByRole('button', { name: 'Visa verktygens namn', exact: true }).click();
  return button;
}

export async function signIn(client: APIRequestContext, origin: string, provider = 'google') {
  const response = await client.post(`${origin}/api/auth/sign-in/social`, {
    headers: { origin },
    data: { provider, callbackURL: '/', errorCallbackURL: '/?authError=1' },
  });
  expect(response.status()).toBe(200);
  const { url } = await response.json();
  return client.get(url);
}

export async function createHousehold(
  client: APIRequestContext,
  origin: string,
  name = 'Hushållet Linden',
) {
  return client.post(`${origin}/api/households`, { headers: { origin }, data: { name } });
}
