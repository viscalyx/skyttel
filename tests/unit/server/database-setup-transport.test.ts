import { join } from 'node:path';
import { request } from '@playwright/test';
import Database from 'better-sqlite3';
import { createHousehold, signIn } from '../../support/client.js';
import { setupDatabase } from '../../support/database-setup-steps.js';
import { expect, test } from '../../support/http-test.js';
import { alex, createInstallation, robin } from '../../support/installation.js';

test('repeated setup clears households, members, invitations, sessions and future fixture tables', {
  tags: ['technical'],
  timeout: 30_000,
}, async () => {
  const installation = await createInstallation();
  const administrator = await request.newContext();
  const recipient = await request.newContext();
  const { origin } = installation;
  const headers = { origin };
  try {
    await signIn(administrator, origin);
    const { household } = await (await createHousehold(administrator, origin)).json();
    installation.setIdentity(robin);
    await signIn(recipient, origin, 'microsoft');
    const { user } = await (await recipient.get(`${origin}/api/bootstrap`)).json();
    const invitation = await administrator.post(
      `${origin}/api/households/${household.id}/invitations`,
      {
        headers,
        data: { userId: user.id },
      },
    );
    expect(invitation.status()).toBe(201);
    const { code } = await invitation.json();
    expect(
      (
        await recipient.post(`${origin}/api/invitations/accept`, { headers, data: { code } })
      ).status(),
    ).toBe(200);

    const database = new Database(join(installation.directory, 'skyttel.db'));
    try {
      database.exec(`CREATE TABLE demo_extension (
        householdId TEXT NOT NULL REFERENCES household(id) ON DELETE RESTRICT
      )`);
      database.prepare('INSERT INTO demo_extension VALUES (?)').run(household.id);
    } finally {
      database.close();
    }

    for (let run = 0; run < 2; run += 1) {
      const setup = await setupDatabase(installation);
      expect(setup.code, setup.output).toBe(0);
      for (const client of [administrator, recipient]) {
        expect(await (await client.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
          status: 'anonymous',
        });
        // The reset removes each server binding. Each actor explicitly confirms
        // its own local reset before a new provider action; no silent retry.
        expect(
          (
            await client.post(`${origin}/api/browser-binding/candidate`, {
              headers,
              data: {},
            })
          ).status(),
        ).toBe(409);
        expect(
          (
            await client.post(`${origin}/api/browser-binding/reset-check`, {
              headers,
              data: {},
            })
          ).status(),
        ).toBe(200);
        await client.clearCookies({ name: 'skyttel_binding' });
      }
      installation.setIdentity(alex);
      await signIn(administrator, origin);
      const state = await (await administrator.get(`${origin}/api/bootstrap`)).json();
      expect(state).toMatchObject({
        status: 'ready',
        household: { name: 'TestHousehold', role: 'administrator' },
      });
      expect((await administrator.get(`${origin}/api/households/${household.id}`)).status()).toBe(
        403,
      );
      const administration = await (
        await administrator.get(`${origin}/api/households/${state.household.id}/administration`)
      ).json();
      expect(administration.members).toEqual([
        expect.objectContaining({ userId: state.user.id, role: 'administrator' }),
      ]);
      expect(administration.invitations).toEqual([]);
      installation.setIdentity(robin);
      await signIn(recipient, origin, 'microsoft');
      expect(await (await recipient.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
        status: 'forbidden',
      });
      expect(
        (
          await recipient.post(`${origin}/api/invitations/accept`, { headers, data: { code } })
        ).status(),
      ).toBe(409);
    }
  } finally {
    await Promise.all([administrator.dispose(), recipient.dispose()]);
    await installation.close();
  }
});

test('setup rejects unsafe or incomplete configuration before touching existing data', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  const installation = await createInstallation();
  try {
    await signIn(request, installation.origin);
    const { household } = await (await createHousehold(request, installation.origin)).json();
    const cases: [NodeJS.ProcessEnv, string][] = [
      [{ NODE_ENV: 'production' }, 'cannot run with NODE_ENV=production'],
      [{ SKYTTEL_FIRST_ADMIN_SUBJECT: '' }, 'SKYTTEL_FIRST_ADMIN_SUBJECT'],
      [
        { SKYTTEL_FIRST_ADMIN_SUBJECT: 'synthetic-first-administrator' },
        'SKYTTEL_FIRST_ADMIN_SUBJECT',
      ],
      [
        { SKYTTEL_DEV_ENV_FILE: join(installation.directory, 'missing.env') },
        'configuration could not be loaded',
      ],
    ];
    for (const [overrides, diagnostic] of cases) {
      const setup = await setupDatabase(installation, undefined, overrides);
      expect(setup.code, setup.output).toBe(1);
      expect(setup.output).toContain(diagnostic);
      expect(
        await (await request.get(`${installation.origin}/api/bootstrap`)).json(),
      ).toMatchObject({
        status: 'ready',
        household,
      });
    }
  } finally {
    await installation.close();
  }
});

test('a failed seed rolls back the reset and keeps existing sessions usable', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  const installation = await createInstallation();
  try {
    await signIn(request, installation.origin);
    const { household } = await (await createHousehold(request, installation.origin)).json();
    const database = new Database(join(installation.directory, 'skyttel.db'));
    try {
      database.exec(`CREATE TRIGGER reject_demo_fixture BEFORE INSERT ON user BEGIN
        SELECT RAISE(ABORT, 'synthetic-private-seed-error');
      END`);
    } finally {
      database.close();
    }
    const setup = await setupDatabase(installation);
    expect(setup.code, setup.output).toBe(1);
    expect(setup.output).toContain('Database setup failed');
    expect(setup.output).not.toContain('synthetic-private-seed-error');
    expect(await (await request.get(`${installation.origin}/api/bootstrap`)).json()).toMatchObject({
      status: 'ready',
      household,
    });
    expect(
      (
        await request.get(`${installation.origin}/api/households/${household.id}/administration`)
      ).status(),
    ).toBe(200);
  } finally {
    await installation.close();
  }
});
