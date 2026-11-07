import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import type { MapState, RelationshipType } from '../../../src/shared/map.js';
import { applicationFixture } from './fixture.js';

test('upgrade pins legacy saved and retained draft wording without changing household definitions', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-legacy-verbs-'));
  const migrations = join(directory, 'migrations');
  mkdirSync(migrations);
  for (const file of readdirSync(resolve('migrations')).filter(
    (name) => Number(name.slice(0, 3)) < 48,
  ))
    copyFileSync(resolve('migrations', file), join(migrations, file));
  let old: Awaited<ReturnType<typeof applicationFixture>> | undefined;
  let upgraded: Awaited<ReturnType<typeof applicationFixture>> | undefined;
  try {
    old = await applicationFixture({ migrationsDirectory: migrations });
    const client = old.client();
    await client.signIn();
    const { household } = await (await client.json('/api/households', { name: 'Linden' })).json();
    const type = old.database
      .prepare("SELECT * FROM relationship_type WHERE householdId = ? AND name = 'Använder'")
      .get(household.id) as RelationshipType;
    old.database
      .prepare('UPDATE relationship_type SET description = ? WHERE id = ?')
      .run('Hushållets egna förklaring', type.id);
    old.database
      .prepare('INSERT INTO relationship_type_labels VALUES (?, ?, ?)')
      .run(type.id, 'driver', 'drivs av');
    const objectType = old.database
      .prepare('SELECT id FROM object_type WHERE householdId = ? LIMIT 1')
      .get(household.id) as { id: string };
    for (const id of ['source', 'target'])
      old.database
        .prepare(
          'INSERT INTO map_object (id, householdId, typeId, revision, name) VALUES (?, ?, ?, 1, ?)',
        )
        .run(id, household.id, objectType.id, id);
    old.database
      .prepare(
        'INSERT INTO map_relationship (id, householdId, typeId, revision, sourceId, targetId) VALUES (?, ?, ?, 1, ?, ?)',
      )
      .run('legacy-edge', household.id, type.id, 'source', 'target');
    const { user } = await (await client.request('/api/bootstrap')).json();
    const owner = old.database
      .prepare('SELECT id FROM content_identity WHERE householdId = ? AND userId = ?')
      .get(household.id, user.id) as { id: string };
    const before = {
      id: 'legacy-edge',
      householdId: household.id,
      revision: 1,
      typeId: type.id,
      sourceId: 'source',
      targetId: 'target',
    };
    const change = {
      id: 'legacy-edge',
      before,
      after: { ...before, lifecycle: 'ended' },
      type: {
        ...type,
        description: 'Hushållets egna förklaring',
        forwardLabel: 'driver',
        reverseLabel: 'drivs av',
      },
    };
    old.database
      .prepare(
        'INSERT INTO map_draft (householdId, userId, version, changes, relationships) VALUES (?, ?, 1, ?, ?)',
      )
      .run(household.id, owner.id, '[]', JSON.stringify([change]));
    const snapshot = join(directory, 'snapshot.sqlite');
    await old.database.backup(snapshot);
    old.close();
    old = undefined;
    upgraded = await applicationFixture({ databaseSnapshot: snapshot });
    const currentClient = upgraded.client();
    await currentClient.signIn();
    const state: MapState = await (
      await currentClient.request(`/api/households/${household.id}/map`)
    ).json();
    expect(state.relationships[0]).toMatchObject({ verb: 'driver', reverseVerb: 'drivs av' });
    expect(state.draft.relationships?.[0].after).toMatchObject({
      verb: 'driver',
      reverseVerb: 'drivs av',
      lifecycle: 'ended',
    });
    expect(state.relationshipTypes.find((item) => item.id === type.id)?.description).toBe(
      'Hushållets egna förklaring',
    );
    expect(state.draft.relationships?.[0].before?.revision).toBe(1);
  } finally {
    old?.close();
    upgraded?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
