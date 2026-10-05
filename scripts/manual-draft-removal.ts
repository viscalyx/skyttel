import { createInterface } from 'node:readline';
import { chromium } from '@playwright/test';
import {
  prepareDraftRemovalFocus,
  prepareDraftRemovalMeaning,
} from '../tests/support/draft-removal.js';
import { prepareDraftReview } from '../tests/support/draft-review.js';
import { createInstallation } from '../tests/support/installation.js';

// Only delivery is controlled; every proposal and discard uses public HTTP and real SQLite.
let app = await createInstallation();
const browser = await chromium
  .launch({ headless: process.argv.includes('--headless') })
  .catch(async (failure) => {
    await app.close();
    throw failure;
  });
const page = await browser.newPage();
let input: ReturnType<typeof createInterface> | undefined;
let data!: Awaited<ReturnType<typeof prepareDraftReview>>;
let hold = false;
let lostResponse = false;
let release: (() => void) | undefined;
let prepared = false;
process.once('SIGINT', () => input?.close());
process.once('SIGTERM', () => input?.close());
async function fresh(kind: string) {
  release?.();
  hold = lostResponse = false;
  if (prepared) {
    await page.goto('about:blank');
    await app.close();
    app = await createInstallation();
  }
  prepared = true;
  data =
    kind === 'new-focus'
      ? await prepareDraftRemovalFocus(page.request, app.origin)
      : kind === 'new-object-meaning' || kind === 'new-relationship-meaning'
        ? await prepareDraftRemovalMeaning(
            page.request,
            app.origin,
            kind === 'new-object-meaning' ? 'objectType' : 'relationshipType',
          )
        : await prepareDraftReview(page.request, app.origin);
  await page.goto(`${app.origin}/households/${data.household.id}`);
}
try {
  await page.route('**/map/discard-review', async (route) => {
    if (!route.request().postDataJSON().confirmation) return route.continue();
    const response = await route.fetch();
    if (hold) {
      console.log('Removal applied; reply held. Use release.');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      release = undefined;
    }
    if (lostResponse) await route.abort();
    else await route.fulfill({ response });
  });
  await fresh('new-base');
  console.log(
    'Commands: new-base, new-focus, new-object-meaning, new-relationship-meaning, newer-type, hold, release, lost-response, network-ok, result, screen, quit',
  );
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const command of input) {
    if (command === 'quit') break;
    if (
      ['new-base', 'new-focus', 'new-object-meaning', 'new-relationship-meaning'].includes(command)
    )
      await fresh(command);
    else if (command === 'newer-type')
      await data.post('object-type', {
        id: 'newer-independent-type',
        baseRevision: null,
        value: { name: 'Nyare oberoende typ', description: '', fields: [] },
      });
    else if (command === 'hold') hold = true;
    else if (command === 'release') {
      hold = false;
      release?.();
    } else if (command === 'lost-response') lostResponse = true;
    else if (command === 'network-ok') lostResponse = false;
    else if (command === 'result')
      console.log(
        JSON.stringify(
          {
            map: await data.read(),
            history: await (await page.request.get(`${data.path}/history`)).json(),
          },
          null,
          2,
        ),
      );
    else if (command === 'screen')
      await page.screenshot({ path: '/tmp/skyttel-draft-removal.png', fullPage: true });
    else console.log('Unknown command.');
  }
} finally {
  release?.();
  input?.close();
  await browser.close();
  await app.close();
}
