import { createInterface } from 'node:readline';
import { chromium } from '@playwright/test';
import type { MapState } from '../src/shared/map.js';
import { createHousehold, signIn } from '../tests/support/client.js';
import { prepareDraftSave } from '../tests/support/draft-save.js';
import { createInstallation } from '../tests/support/installation.js';

// Disposable real HTTP/SQLite installation; only delivery of network responses
// is controlled. The headed browser remains available for human interaction.
const app = await createInstallation();
const browser = await chromium
  .launch({ headless: process.argv.includes('--headless') })
  .catch(async (failure) => {
    await app.close();
    throw failure;
  });
const page = await browser.newPage();
let input: ReturnType<typeof createInterface> | undefined;
process.once('SIGINT', () => input?.close());
process.once('SIGTERM', () => input?.close());
let path = '';
let hold = false;
let lostResponse = false;
let refreshFailure = false;
let recoveryFailure = false;
let release: (() => void) | undefined;
async function fresh(empty: boolean) {
  release?.();
  hold = lostResponse = refreshFailure = recoveryFailure = false;
  if (empty) {
    await signIn(page.request, app.origin);
    const { household } = await (await createHousehold(page.request, app.origin)).json();
    path = `${app.origin}/api/households/${household.id}/map`;
    await page.goto(`${app.origin}/households/${household.id}`);
  } else {
    const data = await prepareDraftSave(page.request, app.origin);
    path = data.path;
    await page.goto(`${app.origin}/households/${data.household.id}`);
  }
}
try {
  await page.route('**/map/save', async (route) => {
    if (hold) {
      console.log('Save request held. Use release.');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      release = undefined;
    }
    const response = await route.fetch();
    if (lostResponse) await route.abort();
    else await route.fulfill({ response });
  });
  await page.route(/\/map(?:\?.*)?$/, (route) =>
    refreshFailure && route.request().method() === 'GET' ? route.abort() : route.continue(),
  );
  await page.route('**/text-assistant/recover', (route) =>
    recoveryFailure ? route.abort() : route.continue(),
  );
  await fresh(false);
  console.log(
    'Commands: new-draft, new-empty, hold, release, lost-response, refresh-failure, network-ok, pending-attempt, result, quit',
  );
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const command of input) {
    if (command === 'quit') break;
    if (command === 'new-draft' || command === 'new-empty') await fresh(command === 'new-empty');
    else if (command === 'hold') hold = true;
    else if (command === 'release') {
      hold = false;
      release?.();
    } else if (command === 'lost-response') lostResponse = true;
    else if (command === 'refresh-failure') refreshFailure = true;
    else if (command === 'network-ok') {
      lostResponse = refreshFailure = recoveryFailure = false;
    } else if (command === 'pending-attempt') {
      const state: MapState = await (await page.request.get(path)).json();
      const response = await page.request.post(`${path}/operations`, {
        headers: { origin: app.origin },
        data: {
          operationId: crypto.randomUUID(),
          version: state.draft.version,
          contentVersion: state.contentVersion,
        },
      });
      console.log(await response.json());
      recoveryFailure = true;
      await page.reload();
    } else if (command === 'result') {
      console.log(
        JSON.stringify(
          {
            map: await (await page.request.get(path)).json(),
            operations: await (await page.request.get(`${path}/operations`)).json(),
            history: await (await page.request.get(`${path}/history`)).json(),
          },
          null,
          2,
        ),
      );
    } else console.log('Unknown command.');
  }
} finally {
  release?.();
  input?.close();
  await browser.close();
  await app.close();
}
