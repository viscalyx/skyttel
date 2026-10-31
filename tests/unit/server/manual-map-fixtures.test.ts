import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { request } from '@playwright/test';
import { expect, test } from 'vitest';
import { createHousehold, signIn } from '../../support/client.js';
import { createInstallation, robin } from '../../support/installation.js';

const execute = promisify(execFile);

test('the scroll preparation publishes a bounded table fixture and removes it on quit', async () => {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/manual-household-table.ts', '--scroll'],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  const closed = once(child, 'close');
  let output = '';
  let diagnostics = '';
  child.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    diagnostics += String(chunk);
  });
  const client = await request.newContext();
  try {
    await expect.poll(() => output.includes('"event":"ready"'), { timeout: 10_000 }).toBe(true);
    const ready = JSON.parse(
      output.split('\n').find((line) => line.includes('"event":"ready"')) ?? '',
    );
    await signIn(client, ready.origin);
    const { household } = await (await client.get(`${ready.origin}/api/bootstrap`)).json();
    const state = await (
      await client.get(`${ready.origin}/api/households/${household.id}/map`)
    ).json();
    expect(state.objects).toHaveLength(46);
    expect(state.objects).toContainEqual(expect.objectContaining({ name: 'Provobjekt 045' }));
    expect(state.relationships).toEqual([]);
    expect(state.draft.changes).toEqual([]);
    child.stdin.write('quit\n');
    expect(await closed, diagnostics).toEqual([0, null]);
    await expect(stat(ready.directory)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await client.dispose();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await closed;
  }
}, 15_000);

test('the second-household manual fixture uses an existing verified login without granting access to Linden', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-manual-map-'));
  const source = await createInstallation();
  const alex = await request.newContext();
  const member = await request.newContext();
  let prepared: Awaited<ReturnType<typeof createInstallation>> | undefined;
  try {
    await signIn(alex, source.origin);
    const { household } = await (await createHousehold(alex, source.origin)).json();
    source.setIdentity(robin);
    await signIn(member, source.origin, 'microsoft');
    const { user } = await (await member.get(`${source.origin}/api/bootstrap`)).json();
    await source.saveDatabase(join(directory, 'verified.sqlite'));
    await execute(process.execPath, [
      '--import',
      'tsx',
      'scripts/prepare-manual-map.ts',
      'second-household',
      directory,
      user.id,
    ]);
    prepared = await createInstallation(undefined, {
      databasePath: join(directory, 'verified.sqlite'),
    });
    prepared.setIdentity(robin);
    await signIn(member, prepared.origin, 'microsoft');
    const bootstrap = await (await member.get(`${prepared.origin}/api/bootstrap`)).json();
    expect(bootstrap.household).toMatchObject({ id: 'manual-other-household', name: 'Eken' });
    expect(
      (
        await member.get(`${prepared.origin}/api/households/manual-other-household/map/view`)
      ).status(),
    ).toBe(200);
    const path = `${prepared.origin}/api/households/${household.id}/map/view`;
    expect((await member.get(path)).status()).toBe(403);
    for (const suffix of ['position', 'settings'])
      expect(
        (
          await member.post(`${path}/${suffix}`, {
            headers: { origin: prepared.origin },
            data: {},
          })
        ).status(),
      ).toBe(403);
    await expect(
      execute(process.execPath, [
        '--import',
        'tsx',
        'scripts/prepare-manual-map.ts',
        'second-household',
        directory,
        'unverified',
      ]),
    ).rejects.toThrow();
  } finally {
    await alex.dispose();
    await member.dispose();
    await prepared?.close();
    await source.close();
    await rm(directory, { recursive: true, force: true });
  }
});
