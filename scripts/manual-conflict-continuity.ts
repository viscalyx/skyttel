import { createInterface } from 'node:readline';
import { chromium } from '@playwright/test';
import { conflictBasis } from '../src/shared/conflict-properties.js';
import { draftConflicts } from '../src/shared/draft-conflicts.js';
import type { MapState, ObjectType, RelationshipType } from '../src/shared/map.js';
import {
  downloadConflictArchive,
  importConflictArchive,
  prepareArchiveConflict,
} from '../tests/support/conflict-archive.js';
import {
  prepareConflictContinuity,
  prepareConflictReferenceContinuity,
  prepareConflictTypeContinuity,
  resolveConflictElsewhere,
  saveConflictElsewhere,
  saveNewerConflictType,
} from '../tests/support/conflict-continuity.js';
import type { conflictCollaborators } from '../tests/support/conflict-properties.js';
import {
  prepareOwnRemovalConflict,
  prepareRelationshipSpecialConflict,
  prepareRemovedObjectConflict,
} from '../tests/support/conflict-special.js';

// Only transport delivery is controlled. All data and results use public HTTP and real SQLite.
const browser = await chromium.launch({ headless: process.argv.includes('--headless') });
const page = await browser.newPage();
const other = await browser.newContext();
let app: Awaited<ReturnType<typeof conflictCollaborators>> | undefined;
let historicalDefinition: ObjectType | RelationshipType | undefined;
const preparations = {
  'new-base': () => prepareConflictContinuity(page.request, other.request),
  'new-two': () => prepareConflictContinuity(page.request, other.request),
  'new-type': () => prepareConflictTypeContinuity(page.request, other.request),
  'new-reference': () => prepareConflictReferenceContinuity(page.request, other.request),
  'new-removed-object': () => prepareRemovedObjectConflict(page.request, other.request),
  'new-removed-relationship': () =>
    prepareRelationshipSpecialConflict(page.request, other.request, 'removed'),
  'new-duplicate': () =>
    prepareRelationshipSpecialConflict(page.request, other.request, 'duplicate'),
  'new-missing-endpoint': () =>
    prepareRelationshipSpecialConflict(page.request, other.request, 'missing-endpoint'),
  'new-own-removal': () => prepareOwnRemovalConflict(page.request, other.request),
  'new-connections': () => prepareOwnRemovalConflict(page.request, other.request, true),
  'new-missing-object-type': () =>
    prepareArchiveConflict(other.request, page.request, 'missing-object-type'),
  'new-invalid-datatype': () =>
    prepareArchiveConflict(other.request, page.request, 'invalid-datatype'),
  'new-object-restoration': () =>
    prepareArchiveConflict(other.request, page.request, 'removed-object-definition'),
  'new-relationship-restoration': () =>
    prepareArchiveConflict(other.request, page.request, 'removed-relationship-definition'),
  'new-restoration-two': () =>
    prepareArchiveConflict(other.request, page.request, 'removed-object-definition', {
      administratorDefinitionProposal: true,
    }),
};
let input: ReturnType<typeof createInterface> | undefined;
let hold = false;
let delivery: 'normal' | 'lost' | 'unsent' = 'normal';
let release: (() => void) | undefined;
let kind = 'new-base';
process.once('SIGINT', () => input?.close());
process.once('SIGTERM', () => input?.close());
async function fresh(command: keyof typeof preparations) {
  release?.();
  hold = false;
  delivery = 'normal';
  await page.unroute('**/map');
  await page.goto('about:blank');
  await app?.installation.close();
  kind = command;
  const prepared: Awaited<ReturnType<typeof conflictCollaborators>> & {
    historicalType?: ObjectType | RelationshipType;
  } = await preparations[command]();
  app = prepared;
  historicalDefinition = prepared.historicalType;
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
    `Commands: ${Object.keys(preparations).join(', ')}, newer-name, newer-type, newer-reference, newer-private, newer-definition, reimport-restoration, probe-definition-guards, forge-restoration, try-restoration-save, resolve-elsewhere, save-elsewhere, hold, release, lose-applied, lose-unsent, check-error, network-ok, result, quit`,
  );
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const command of input) {
    if (command === 'quit') break;
    if (Object.hasOwn(preparations, command)) await fresh(command as keyof typeof preparations);
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
    } else if (
      app &&
      historicalDefinition &&
      command === 'forge-restoration' &&
      kind.includes('restoration')
    ) {
      const state = await app.read();
      const response = await app.post(
        page.request,
        kind.includes('relationship') ? 'relationship-type' : 'object-type',
        {
          id: historicalDefinition.id,
          version: state.draft.version,
          contentVersion: state.contentVersion,
          baseRevision: null,
          value: {
            name: 'Förfalskat återställningsförslag',
            description: '',
            fields: [],
            ...('forwardLabel' in historicalDefinition
              ? {
                  forwardLabel: historicalDefinition.forwardLabel,
                  reverseLabel: historicalDefinition.reverseLabel,
                }
              : {}),
          },
          restoration: { contentVersion: state.contentVersion, definition: historicalDefinition },
        },
      );
      console.log(`Ordinary creation response: ${response.status()} ${await response.text()}`);
    } else if (app && command === 'try-restoration-save' && kind.includes('restoration')) {
      const response = await app.save(page.request, 'stale-restoration');
      console.log(`Save response: ${response.status()} ${await response.text()}`);
    } else if (app && command === 'probe-definition-guards' && kind === 'new-restoration-two') {
      const state = await app.read();
      const conflict = draftConflicts(state).find((conflict) => conflict.kind === 'objectType');
      if (!conflict) throw new Error('Missing member definition conflict');
      const review = {
        conflict,
        basis: conflictBasis(state, conflict),
        command: 'definition-choice',
        definitionChoice: 'proposed',
        version: state.draft.version,
        contentVersion: state.contentVersion,
      };
      const incorrect = await app.post(page.request, 'resolve', { ...review, basis: {} });
      const foreign = await app.post(other.request, 'resolve', review);
      console.log(
        `Guard responses: incorrect basis ${incorrect.status()}, other private owner ${foreign.status()}`,
      );
    } else if (
      app &&
      command === 'reimport-restoration' &&
      kind.startsWith('new-') &&
      kind.includes('restoration')
    ) {
      await importConflictArchive(
        app,
        other.request,
        await downloadConflictArchive(app, other.request),
      );
    } else if (app && command === 'newer-definition' && kind === 'new-restoration-two') {
      const state: MapState = await (await other.request.get(app.path)).json();
      const conflict = draftConflicts(state).find((conflict) => conflict.kind === 'objectType');
      if (!conflict) throw new Error('Missing administrator definition conflict');
      const reviewed = await app.post(other.request, 'resolve', {
        conflict,
        basis: conflictBasis(state, conflict),
        command: 'definition-choice',
        definitionChoice: 'proposed',
        version: state.draft.version,
        contentVersion: state.contentVersion,
      });
      if (reviewed.status() !== 200) throw new Error('Administrator definition review failed');
      if ((await app.save(other.request, 'other-restoration')).status() !== 200)
        throw new Error('Administrator restoration save failed');
      const current: MapState = await (await other.request.get(app.path)).json();
      const type = current.types.find((type) => type.id === conflict.id);
      if (!type) throw new Error('Missing current definition');
      const staged = await app.post(other.request, 'object-type', {
        id: type.id,
        version: current.draft.version,
        contentVersion: current.contentVersion,
        baseRevision: type.revision,
        value: {
          name: 'Ny gemensam typbenämning',
          description: type.description,
          fields: type.fields ?? [],
        },
      });
      if (
        staged.status() !== 200 ||
        (await app.save(other.request, 'newer-active-definition')).status() !== 200
      )
        throw new Error('Newer definition save failed');
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
