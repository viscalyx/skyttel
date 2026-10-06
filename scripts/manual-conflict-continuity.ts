import { createInterface } from 'node:readline';
import { chromium } from '@playwright/test';
import {
  prepareConflictContinuity,
  prepareConflictReferenceContinuity,
  prepareConflictTypeContinuity,
  resolveConflictElsewhere,
  saveConflictElsewhere,
  saveNewerConflictType,
} from '../tests/support/conflict-continuity.js';
import { prepareRemovedObjectConflict } from '../tests/support/conflict-special.js';

// Only transport delivery is controlled. All data and results use public HTTP and real SQLite.
const browser = await chromium.launch({ headless: process.argv.includes('--headless') });
const page = await browser.newPage();
const other = await browser.newContext();
let app:
  | Awaited<ReturnType<typeof prepareConflictContinuity>>
  | Awaited<ReturnType<typeof prepareConflictTypeContinuity>>
  | Awaited<ReturnType<typeof prepareConflictReferenceContinuity>>
  | Awaited<ReturnType<typeof prepareRemovedObjectConflict>>
  | undefined;
let input: ReturnType<typeof createInterface> | undefined;
let hold = false;
let delivery: 'normal' | 'lost' | 'unsent' = 'normal';
let release: (() => void) | undefined;
let kind = 'new-base';
process.once('SIGINT', () => input?.close());
process.once('SIGTERM', () => input?.close());
async function fresh(command: string) {
  release?.();
  hold = false;
  delivery = 'normal';
  await page.unroute('**/map');
  await page.goto('about:blank');
  await app?.installation.close();
  kind = command;
  app =
    command === 'new-removed-object'
      ? await prepareRemovedObjectConflict(page.request, other.request)
      : command === 'new-type'
        ? await prepareConflictTypeContinuity(page.request, other.request)
        : command === 'new-reference'
          ? await prepareConflictReferenceContinuity(page.request, other.request)
          : await prepareConflictContinuity(page.request, other.request);
  if (command === 'new-two') {
    const state = await app.read();
    const value = { typeId: state.types[0].id, name: 'Min musiktjänst', description: 'Min tjänst' };
    await app.propose(page.request, 'draft', 'service', value);
    await app.propose(other.request, 'draft', 'service', {
      ...value,
      name: 'Vår musiktjänst',
      description: 'Robins tjänst',
    });
    await app.save(other.request, 'second-conflict');
  }
  await page.goto(app.installation.origin);
  console.log(`Ready: ${command}, ${app.installation.origin}`);
}
try {
  await page.route('**/map/resolve', async (route) => {
    if (hold) {
      console.log('Request held before delivery. Use release.');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      release = undefined;
    }
    if (delivery === 'unsent') return route.abort();
    const response = await route.fetch();
    if (delivery === 'lost') await route.abort();
    else await route.fulfill({ response });
  });
  await fresh('new-base');
  console.log(
    'Commands: new-base, new-two, new-type, new-reference, new-removed-object, newer-name, newer-type, newer-reference, newer-private, resolve-elsewhere, save-elsewhere, hold, release, lose-applied, lose-unsent, check-error, network-ok, result, quit',
  );
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const command of input) {
    if (command === 'quit') break;
    if (
      ['new-base', 'new-two', 'new-type', 'new-reference', 'new-removed-object'].includes(command)
    )
      await fresh(command);
    else if (command === 'hold') hold = true;
    else if (command === 'release') {
      hold = false;
      release?.();
    } else if (command === 'lose-applied') delivery = 'lost';
    else if (command === 'lose-unsent') delivery = 'unsent';
    else if (command === 'check-error') await page.route('**/map', (route) => route.abort());
    else if (command === 'network-ok') {
      delivery = 'normal';
      await page.unroute('**/map');
    } else if (app && command === 'newer-name') {
      const saved = (await app.read()).objects.find(({ id }) => id === 'lo');
      if (!saved) throw new Error('Missing fixture object');
      await app.propose(other.request, 'draft', 'lo', { ...saved, name: 'Lo Ås' });
      await app.save(other.request, 'newer-name');
    } else if (app && command === 'newer-type' && kind === 'new-type') {
      await saveNewerConflictType(app, other.request);
    } else if (app && command === 'newer-reference' && kind === 'new-reference') {
      const saved = (await app.read()).objects.find(({ id }) => id === 'service');
      if (!saved) throw new Error('Missing fixture reference');
      await app.propose(other.request, 'draft', 'service', { ...saved, name: 'Ny musiktjänst' });
      await app.save(other.request, 'newer-reference');
    } else if (app && command === 'newer-private') {
      const state = await app.read();
      await app.propose(page.request, 'draft', 'independent', {
        typeId: state.types[0].id,
        name: 'Privat stol',
        description: '',
      });
    } else if (app && command === 'resolve-elsewhere' && kind === 'new-base') {
      await resolveConflictElsewhere(app, page.request);
    } else if (app && command === 'save-elsewhere' && kind === 'new-base') {
      await saveConflictElsewhere(app, page.request);
    } else if (app && command === 'result') {
      console.log(
        JSON.stringify(
          {
            map: await app.read(),
            history: await (await page.request.get(`${app.path}/history`)).json(),
          },
          null,
          2,
        ),
      );
    } else console.log('Unknown command or incompatible fixture.');
  }
} finally {
  release?.();
  input?.close();
  await browser.close();
  await app?.installation.close();
}
