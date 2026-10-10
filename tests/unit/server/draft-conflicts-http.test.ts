import { request } from '@playwright/test';
import { expect, test } from 'vitest';
import { draftConflicts } from '../../../src/shared/draft-conflicts.js';
import { restartWithSession, signIn } from '../../support/client.js';
import { collaborators } from '../../support/draft-conflict-http.js';
import { alex, createInstallation, robin } from '../../support/installation.js';
import { typeChangeHousehold } from '../../support/type-change-http.js';

test('invalid values and concurrent definitions block whole saves until fresh choices and preserve later private fields', async () => {
  const installation = await createInstallation();
  let client = await request.newContext();
  const other = await request.newContext();
  try {
    const { path, read, post, object, save } = await typeChangeHousehold(
      client,
      installation.origin,
    );
    installation.setIdentity(robin);
    await signIn(other, installation.origin);
    const { user } = await (await other.get(`${installation.origin}/api/bootstrap`)).json();
    const { code } = await (
      await client.post(`${path.replace('/map', '')}/invitations`, {
        headers: { origin: installation.origin },
        data: { userId: user.id },
      })
    ).json();
    await other.post(`${installation.origin}/api/invitations/accept`, {
      headers: { origin: installation.origin },
      data: { code },
    });
    await object('garage', { name: 'Eget namn' });
    const before = await read();
    expect(
      (await object('bike', { typeId: 'vehicle', customValues: { serial: 'fel' } })).status(),
    ).toBe(400);
    expect(await read()).toEqual(before);
    expect(
      (
        await object('bike', { typeId: 'vehicle', customValues: { serial: 42, insured: false } })
      ).status(),
    ).toBe(200);
    const target = (await read(other)).types.find((type) => type.id === 'vehicle');
    expect(
      (
        await post(
          'object-type',
          {
            version: 0,
            id: 'vehicle',
            baseRevision: target?.revision,
            value: { ...target, description: 'Uppdaterad definition' },
          },
          other,
        )
      ).status(),
    ).toBe(200);
    await save('definition', other);
    const stale = await read();
    expect(
      (await post('save', { version: stale.draft.version, operationId: 'blocked' })).status(),
    ).toBe(409);
    expect(await read()).toEqual(stale);
    expect(stale.objects.find((item) => item.id === 'garage')?.name).toBe('Garaget');
    const conflict = draftConflicts(stale)[0];
    expect(
      (
        await post('resolve', { version: stale.draft.version, conflict, choice: 'proposed' })
      ).status(),
    ).toBe(200);
    expect(
      (await post('save', { version: stale.draft.version, operationId: 'old-approval' })).status(),
    ).toBe(409);
    const selected = await save('change-type');
    await object('bike', { customValues: { serial: 43, insured: false } });
    const own = await read();
    client = await restartWithSession(client, () => installation.restart());
    expect((await read(client)).draft).toEqual(own.draft);
    expect((await read(client)).objects.find((item) => item.id === 'bike')).toMatchObject({
      typeId: 'vehicle',
      customValues: { serial: 42, insured: false },
    });
    expect((await (await client.get(`${path}/history`)).json()).history).toContainEqual(selected);
  } finally {
    await other.dispose();
    await client.dispose();
    await installation.close();
  }
});

test('HTTP clients reject stale conflict choices and enforce private drafts and revoked membership', async () => {
  const client = await request.newContext();
  const other = await request.newContext();
  const sameUser = await request.newContext();
  const app = await collaborators(client, other);
  try {
    let state = await app.read();
    const value = { typeId: state.types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(client, 'draft', 'lo', value);
    expect((await app.read(other)).draft.changes).toEqual([]);
    app.installation.setIdentity(alex);
    await signIn(sameUser, app.installation.origin);
    expect((await app.read(sameUser)).draft).toEqual((await app.read()).draft);
    await app.propose(other, 'draft', 'lo', { ...value, name: 'Lo Berg' });
    expect((await app.save(other, 'first-conflict')).status()).toBe(200);
    state = await app.read();
    const resolution = {
      version: state.draft.version,
      conflict: {
        kind: 'object',
        id: 'lo',
        current: state.objects.find((object) => object.id === 'lo'),
      },
      choice: 'proposed',
    };
    await app.propose(other, 'draft', 'lo', { ...value, name: 'Lo Ek' });
    expect((await app.save(other, 'second-conflict')).status()).toBe(200);
    expect((await app.post(client, 'resolve', resolution)).status()).toBe(409);
    expect((await app.read()).draft).toEqual(state.draft);
    state = await app.read();
    const currentResolution = {
      ...resolution,
      conflict: {
        ...resolution.conflict,
        current: state.objects.find((object) => object.id === 'lo'),
      },
    };
    expect(
      (await app.post(client, 'resolve', { ...currentResolution, choice: 'anything' })).status(),
    ).toBe(400);
    expect((await app.post(sameUser, 'resolve', currentResolution)).status()).toBe(200);
    const resolved = (await app.read()).draft;
    for (const [route, body] of [
      ['resolve', currentResolution],
      ['discard', { version: state.draft.version }],
      ['draft', { version: state.draft.version, id: 'lo', baseRevision: 1, value }],
      ['save', { version: state.draft.version, operationId: 'old-approval' }],
    ] as const) {
      expect((await app.post(client, route, body)).status()).toBe(409);
      expect((await app.read()).draft).toEqual(resolved);
    }
    const { user: owner } = await (
      await client.get(`${app.installation.origin}/api/bootstrap`)
    ).json();
    const privateRead = await (await other.get(`${app.path}?userId=${owner.id}`)).json();
    expect(privateRead.draft.changes).toEqual([]);
    expect(
      (await app.post(other, 'resolve', { ...currentResolution, userId: owner.id })).status(),
    ).toBe(409);
    expect((await app.read()).draft).toEqual(resolved);
    expect((await app.save(client, 'fresh-approval')).status()).toBe(200);
    await app.propose(other, 'draft', 'lo', { ...value, name: 'Robin privat' });
    expect(
      (
        await client.post(`${app.path.replace('/map', '')}/members/${app.userId}/revoke`, {
          headers: { origin: app.installation.origin },
          data: {},
        })
      ).status(),
    ).toBe(200);
    for (const route of ['draft', 'relationship', 'resolve', 'save', 'discard'])
      expect(
        (await app.post(other, route, { ...currentResolution, operationId: 'revoked' })).status(),
      ).toBe(403);
    expect((await other.get(app.path)).status()).toBe(403);
    expect((await other.get(`${app.path}/history`)).status()).toBe(403);
  } finally {
    await sameUser.dispose();
    await client.dispose();
    await other.dispose();
    await app.installation.close();
  }
});
