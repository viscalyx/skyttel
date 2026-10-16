// THROWAWAY: actual application, synthetic sign-in, fresh SQLite file per run.

import { householdMap } from '../src/server/map.js';
import { personalView } from '../src/server/personal-view.js';
import { defaultViewSettings } from '../src/shared/personal-view.js';
import { prototypeBackgroundInstallation } from './prototype-background-installation.js';
import { seedDemo } from './seeds/demo.js';

const installation = await prototypeBackgroundInstallation(
  process.argv.includes('--dev'),
  process.argv.includes('--legacy-on')
    ? 5192
    : process.argv.includes('--legacy-off')
      ? 5193
      : process.argv.includes('--dense')
        ? 5191
        : 5190,
);
const { database, config } = installation;
const origin = config.origin;
const household = seedDemo(database, config);
const { userId } = database
  .prepare("SELECT userId FROM membership WHERE householdId = ? AND role = 'administrator'")
  .get(household.id) as { userId: string };
const map = householdMap(database, userId, household.id);
// Remove the seed's pending examples so every comparison starts with the same saved map.
map.discard(map.read().draft.version);
if (process.argv.includes('--dense')) {
  const initial = map.read();
  const service = initial.types.find(({ name }) => name === 'Tjänst');
  const uses = initial.relationshipTypes.find(({ name }) => name === 'Använder');
  const alex = initial.objects.find(({ name }) => name === 'Alex Exempel');
  if (!service || !uses || !alex) throw new Error('Expected synthetic types and person');
  for (let index = 0; index < 64; index++) {
    const id = `background-service-${index}`;
    map.propose({
      version: map.read().draft.version,
      id,
      baseRevision: null,
      value: {
        typeId: service.id,
        name: `Provtjänst ${String(index + 1).padStart(2, '0')}`,
        description: 'Påhittad tjänst för bakgrundsjämförelse.',
      },
    });
    map.proposeRelationship({
      version: map.read().draft.version,
      id: `background-use-${index}`,
      baseRevision: null,
      value: { typeId: uses.id, sourceId: alex.id, targetId: id, knowledge: 'known' },
    });
  }
  map.save({ version: map.read().draft.version, operationId: 'background-dense-fixture' });
}
const view = personalView(database, userId, household.id);
const saved = view.read();
const legacy = process.argv.includes('--legacy-on') || process.argv.includes('--legacy-off');
if (legacy) {
  // Intentionally omit new fields, exactly like a pre-change saved view.
  database
    .prepare(`INSERT INTO personal_view_settings (householdId, userId, version, settings)
    VALUES (?, ?, 1, ?)`)
    .run(
      household.id,
      userId,
      JSON.stringify({
        ...defaultViewSettings,
        stars: process.argv.includes('--legacy-on'),
      }),
    );
} else {
  const { version: _version, ...settings } = saved.settings;
  view.configure({
    contentVersion: saved.contentVersion,
    version: saved.settings.version,
    settings: { ...settings, allLabels: false },
  });
}

console.log(
  `\nTHROWAWAY background prototype: ${process.argv.includes('--dense') ? 'dense (80 objects)' : 'sparse (16 objects)'}`,
);
console.log(`Open ${origin}/`);
console.log(
  'Choose "Öppna testkartan som Alex". No personal credentials, external provider or billable APIs.',
);
console.log(
  'Settings → Rymdkartan → Bakgrund. Seven approved appearances; independent pan and zoom.',
);
console.log('Ctrl+C deletes this scratch installation.');
console.log(
  `Personal view fixture: ${legacy ? (process.argv.includes('--legacy-on') ? 'legacy ON' : 'legacy OFF') : 'NEW'}. Reduced motion: ?reduce=on.`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await installation.close();
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
