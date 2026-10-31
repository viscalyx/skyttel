import { afterEach, expect, test, vi } from 'vitest';
import { householdMap } from '../../../src/server/map.js';
import { applicationFixture } from './fixture.js';

let fixture: Awaited<ReturnType<typeof applicationFixture>>;
afterEach(() => {
  vi.restoreAllMocks();
  fixture?.close();
});

test.each(['plain', 'deleted', 'conflict', 'both'])(
  '%s map reads do not process unrelated retained receipts',
  async (mode) => {
    fixture = await applicationFixture();
    const owner = fixture.client();
    await owner.signIn();
    const { household } = await (await owner.json('/api/households', { name: 'Linden' })).json();
    const { user } = await (await owner.request('/api/bootstrap')).json();
    fixture.setSubject('reader');
    const reader = fixture.client();
    await reader.signIn();
    const { user: readerUser } = await (await reader.request('/api/bootstrap')).json();
    const { code } = await (
      await owner.json(`/api/households/${household.id}/invitations`, { userId: readerUser.id })
    ).json();
    expect((await reader.json('/api/invitations/accept', { code })).status).toBe(200);
    const writer = householdMap(fixture.database, user.id, household.id);
    const readerMap = householdMap(fixture.database, readerUser.id, household.id);
    const typeId = writer.read().types[0].id;
    let version = 0;
    let serial = 0;
    function save(id: string, name: string | null) {
      const before = writer.read().objects.find((object) => object.id === id);
      const draft = writer.propose({
        version,
        id,
        baseRevision: before?.revision ?? null,
        value: name === null ? null : { typeId, name },
      });
      writer.save({ version: draft.version, operationId: `save-${serial++}` });
      version = draft.version + 1;
    }
    save('target', 'Initial');
    save('removed', 'Removed');
    save('unrelated', 'Unrelated');
    const conflict = mode === 'conflict' || mode === 'both';
    const deleted = mode === 'deleted' || mode === 'both';
    if (conflict)
      readerMap.propose({
        version: 0,
        id: 'target',
        baseRevision: 1,
        value: { typeId, name: 'Private proposal' },
      });
    save('target', 'Saved edit');
    save('removed', deleted ? null : 'Still active');
    async function observe() {
      const queries: string[] = [];
      const prepare = fixture.database.prepare.bind(fixture.database);
      const querySpy = vi.spyOn(fixture.database, 'prepare').mockImplementation((sql) => {
        queries.push(sql);
        return prepare(sql);
      });
      const parse = JSON.parse;
      let receipts = 0;
      let unrelatedChanges = 0;
      const spy = vi.spyOn(JSON, 'parse').mockImplementation((...args) => {
        const value = parse(...args);
        if (value?.operationId && Array.isArray(value.changes)) receipts++;
        if (value?.before?.id === 'unrelated' || value?.after?.id === 'unrelated')
          unrelatedChanges++;
        return value;
      });
      const response = await reader.request(`/api/households/${household.id}/map`);
      const state = await response.json();
      spy.mockRestore();
      querySpy.mockRestore();
      // Processing counts alone cannot rule out a scan hidden inside SQLite.
      for (const sql of queries) {
        expect(sql).not.toMatch(/\b(?:map_history|map_save)\b/);
        if (!sql.includes('map_history_change')) continue;
        const bindings = sql.includes("kind = 'object'")
          ? [household.id, 'removed']
          : [household.id, 'object', 'target'];
        const plan = prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...bindings);
        expect(plan).toEqual([
          expect.objectContaining({
            detail: expect.stringMatching(
              /SEARCH map_history_change USING INDEX .*\(householdId=\? AND kind=\? AND entityId=\?\)/,
            ),
          }),
        ]);
      }
      expect(response.status).toBe(200);
      expect(state.removedObjects?.length ?? 0).toBe(deleted ? 1 : 0);
      expect(state.conflictActors?.['object:target']?.name).toBe(conflict ? 'Alex' : undefined);
      expect(state.conflictPropertyActors?.['object:target']?.name?.name).toBe(
        conflict ? 'Alex' : undefined,
      );
      expect(receipts).toBe(0);
      expect(unrelatedChanges).toBe(0);
      return state;
    }
    const before = await observe();
    for (let index = 0; index < 30; index++) save('unrelated', `Unrelated ${index}`);
    const after = await observe();
    expect(after.removedObjects).toEqual(before.removedObjects);
    expect(after.draft).toEqual(before.draft);
    expect(after.conflictActors).toEqual(before.conflictActors);
    expect(after.conflictPropertyActors).toEqual(before.conflictPropertyActors);
    expect(writer.history().history).toHaveLength(35);
  },
);
