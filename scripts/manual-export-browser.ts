import { createInterface } from 'node:readline';
import { chromium, expect } from '@playwright/test';
import { createHousehold, signIn } from '../tests/support/client.js';
import { holdBrowserExport, seedLargeExport } from '../tests/support/export-browser-stream.js';
import { createInstallation, robin } from '../tests/support/installation.js';

const emit = (event: string, values = {}) => console.log(JSON.stringify({ event, ...values }));
const app = await createInstallation();
const browser = await chromium
  .launch({
    channel: process.argv.includes('--chrome') ? 'chrome' : undefined,
    headless: process.argv.includes('--headless'),
  })
  .catch(async (error) => {
    await app.close();
    throw error;
  });
const alex = await browser.newContext();
const recipient = await browser.newContext();
const input = createInterface({ input: process.stdin });
const stop = () => input.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
let transfer: Awaited<ReturnType<typeof holdBrowserExport>> | undefined;
let release: (() => void) | undefined;
try {
  await signIn(alex.request, app.origin);
  const { household } = await (await createHousehold(alex.request, app.origin)).json();
  const path = `${app.origin}/api/households/${household.id}`;
  const headers = { origin: app.origin };
  app.setIdentity(robin);
  await signIn(recipient.request, app.origin, 'microsoft');
  const { user } = await (await recipient.request.get(`${app.origin}/api/bootstrap`)).json();
  const { code } = await (
    await alex.request.post(`${path}/invitations`, { headers, data: { userId: user.id } })
  ).json();
  await recipient.request.post(`${app.origin}/api/invitations/accept`, { headers, data: { code } });
  await alex.request.post(`${path}/members/${user.id}/role`, {
    headers,
    data: { role: 'administrator' },
  });
  await seedLargeExport(app.directory, household.id, user.id);
  const administrator = await alex.newPage();
  const page = await recipient.newPage();
  await administrator.goto(`${app.origin}/households/${household.id}/administration`);
  await page.goto(`${app.origin}/households/${household.id}/settings/export`);
  emit('ready', {
    origin: app.origin,
    directory: app.directory,
    browser: browser.version(),
    commands: ['arm-stream', 'arm-ready', 'arm-response', 'release', 'quit'],
  });
  let heldResponse = Promise.resolve();
  let deliveredResponse = Promise.resolve();
  async function control(command: string) {
    if (command === 'arm-stream') {
      const current = await holdBrowserExport(page, app.directory, path);
      transfer = current;
      void current.paused.then(() => emit('paused', current.inspect()));
      void current.completed.then(() => emit('completed', current.inspect()));
      emit('armed', { mode: 'active-stream' });
    } else if (command === 'arm-ready' || command === 'arm-response') {
      if (release) throw new Error('Release the previous response first.');
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markHeld = () => {};
      let markDelivered = () => {};
      heldResponse = new Promise<void>((resolve) => {
        markHeld = resolve;
      });
      deliveredResponse = new Promise<void>((resolve) => {
        markDelivered = resolve;
      });
      await page.route(
        command === 'arm-ready' ? `${path}/exports` : `${path}/exports/*`,
        async (route) => {
          const response = await route.fetch();
          emit('held', { status: response.status(), mode: command });
          markHeld();
          await held;
          await route.fulfill({ response });
          emit('delivered');
          markDelivered();
        },
        { times: 1 },
      );
      emit('armed', { mode: command });
    } else if (command === 'release') {
      transfer?.release();
      release?.();
      release = undefined;
    } else emit('error', { message: 'Use arm-stream, arm-ready, arm-response, release or quit.' });
  }
  if (process.argv.includes('--smoke')) {
    // Exercise the documented seeded installation and the exact launcher
    // controls, without claiming human/device observation.
    let downloads = 0;
    page.on('download', () => {
      downloads++;
    });
    const exportPage = `${app.origin}/households/${household.id}/settings/export`;
    const section = page.getByRole('region', { name: 'Fullständig export' });
    await control('arm-ready');
    await section.getByRole('button', { name: 'Förbered fullständig export' }).click();
    await heldResponse;
    await expect(section.getByRole('status')).toHaveText('Förbereder exporten…');
    await section.getByRole('button', { name: 'Avbryt export' }).click();
    await control('release');
    await deliveredResponse;
    await expect(section.getByRole('status')).toContainText('Förberedelsen har avbrutits');
    await section.getByRole('button', { name: 'Förbered fullständig export' }).click();
    await expect(section.getByRole('button', { name: 'Hämta ZIP-fil' })).toBeVisible();
    await control('arm-response');
    await section.getByRole('button', { name: 'Hämta ZIP-fil' }).click();
    await heldResponse;
    await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
    await control('release');
    await deliveredResponse;
    expect(downloads).toBe(0);
    await page.goto(exportPage);
    await section.getByRole('button', { name: 'Förbered fullständig export' }).click();
    await expect(section.getByRole('button', { name: 'Hämta ZIP-fil' })).toBeVisible();
    await control('arm-stream');
    await section.getByRole('button', { name: 'Hämta ZIP-fil' }).click();
    if (!transfer) throw new Error('Stream control required');
    await transfer.paused;
    await administrator
      .getByRole('list', { name: 'Medlemmar' })
      .getByRole('listitem')
      .filter({ hasText: robin.name })
      .getByRole('button', { name: 'Gör till medlem', exact: true })
      .click();
    await control('release');
    await transfer.completed;
    expect(transfer.inspect().interrupted).toBe(true);
    expect(transfer.inspect().beforeExpiry).toBe(true);
    expect(transfer.inspect().receivedBytes).toBeLessThan(transfer.inspect().archiveBytes);
    await expect(section.getByRole('alert')).toContainText('Kontrollera anslutningen');
    expect(downloads).toBe(0);
    emit('smoke-passed', { modes: ['arm-ready', 'arm-response', 'arm-stream'] });
  } else {
    for await (const line of input) {
      const command = line.trim();
      if (command === 'quit') break;
      await control(command);
    }
  }
} finally {
  transfer?.close();
  release?.();
  input.close();
  if (recipient.pages().length) await recipient.pages()[0].unrouteAll({ behavior: 'wait' });
  await browser.close();
  await app.close();
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  emit('closed', { removedDirectory: app.directory });
}
