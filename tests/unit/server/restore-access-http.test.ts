import { join } from 'node:path';
import { type APIRequestContext, request } from '@playwright/test';
import Database from 'better-sqlite3';
import { afterEach, expect, test } from 'vitest';
import { beginAssistant } from '../../support/assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { alex, createInstallation, robin } from '../../support/installation.js';

let installation: Awaited<ReturnType<typeof createInstallation>>;
const clients: APIRequestContext[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) await client.dispose();
  await installation?.close();
});

test('only the designated provider login can review, including when another login is linked to the restored user', async () => {
  installation = await createInstallation();
  const { origin } = installation;
  const owner = await login();
  const { household } = await (await createHousehold(owner, origin)).json();
  const ownerId = (await (await owner.get(`${origin}/api/bootstrap`)).json()).user.id;
  for (const [step, provider, identity] of [
    ['prove', 'google', alex],
    ['add', 'microsoft', robin],
  ] as const) {
    installation.setIdentity(identity);
    const start = await owner.post(`${origin}/api/login-methods/${step}`, {
      headers: { origin },
      data: { provider },
    });
    expect(start.status()).toBe(200);
    await owner.get((await start.json()).url);
  }
  const backup = join(installation.directory, 'linked.sqlite');
  await installation.saveDatabase(backup);
  await installation.restoreDatabase(backup, {
    generation: '22222222-2222-4222-8222-222222222222',
    restore: {
      fromGeneration: '11111111-1111-4111-8111-111111111111',
      confirmedAt: Date.now(),
      erasureReviewed: true,
      recoveryAdmin: { provider: 'google', subject: alex.subject },
    },
  });
  const linked = await login(robin, 'microsoft');
  expect(await (await linked.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
    status: 'recovery',
    canReview: false,
    user: { id: ownerId },
  });
  const impersonator = await login({ ...alex, subject: 'same-name-and-email' });
  for (const client of [linked, impersonator]) {
    expect((await client.get(`${origin}/api/recovery`)).status()).toBe(403);
    expect(
      (
        await client.post(`${origin}/api/recovery/complete`, { headers: { origin }, data: {} })
      ).status(),
    ).toBe(403);
  }
  const recovery = await login();
  expect(await (await recovery.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
    status: 'recovery',
    canReview: true,
  });
  const review = await (await recovery.get(`${origin}/api/recovery`)).json();
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin: 'https://untrusted.example' },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: review,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(200);
  expect((await linked.get(`${origin}/api/households/${household.id}/map`)).status()).toBe(200);
  const completedCopy = join(installation.directory, 'completed.sqlite');
  await installation.saveDatabase(completedCopy);
  await installation.restoreDatabase(completedCopy, {
    generation: '33333333-3333-4333-8333-333333333333',
    restore: {
      fromGeneration: review.generation,
      confirmedAt: Date.now(),
      erasureReviewed: true,
      recoveryAdmin: { provider: 'google', subject: alex.subject },
    },
  });
  const next = await login();
  expect((await next.get(`${origin}/api/households/${household.id}/map`)).status()).toBe(403);
  expect(
    (
      await next.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(409);
});

test('a recovery administrator absent from the copy must explicitly appoint an administrator and old invitations never revive', async () => {
  installation = await createInstallation();
  const { origin } = installation;
  const owner = await login();
  const { household } = await (await createHousehold(owner, origin)).json();
  const invitee = await login(robin);
  const inviteeId = (await (await invitee.get(`${origin}/api/bootstrap`)).json()).user.id;
  const invitations = `${origin}/api/households/${household.id}/invitations`;
  const invitation = await (
    await owner.post(invitations, {
      headers: { origin },
      data: { userId: inviteeId },
    })
  ).json();
  const backup = join(installation.directory, 'pending-invitation.sqlite');
  await installation.saveDatabase(backup);
  await owner.post(`${invitations}/${invitation.invitation.id}/revoke`, {
    headers: { origin },
    data: {},
  });
  const designated = { ...alex, subject: 'new-recovery-identity' };
  await installation.restoreDatabase(backup, {
    generation: '22222222-2222-4222-8222-222222222222',
    restore: {
      fromGeneration: '11111111-1111-4111-8111-111111111111',
      confirmedAt: Date.now(),
      erasureReviewed: true,
      recoveryAdmin: { provider: 'microsoft', subject: designated.subject },
    },
  });
  const freshOwner = await login();
  expect((await freshOwner.get(`${origin}/api/recovery`)).status()).toBe(403);
  const recovery = await login(designated, 'microsoft');
  const freshInvitee = await login(robin);
  expect(
    (
      await freshInvitee.post(`${origin}/api/invitations/accept`, {
        headers: { origin },
        data: { code: invitation.code },
      })
    ).status(),
  ).toBe(403);
  for (const restart of [false, true]) {
    if (restart) await installation.restart();
    expect((await recovery.get(`${origin}/api/households/${household.id}/map`)).status()).toBe(403);
    expect((await recovery.get(`${origin}/api/assistants/context`)).status()).toBe(403);
    const assistant = await beginAssistant(recovery, origin);
    expect((await assistant.consent(household.id)).status()).toBe(403);
  }
  const review = await (await recovery.get(`${origin}/api/recovery`)).json();
  expect(review.households[0].members).toHaveLength(1);
  review.households[0].members[0].role = 'member';
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(409);
  expect((await freshOwner.get(`${origin}/api/households/${household.id}/map`)).status()).toBe(403);
  review.households[0].members.push({ ...review.actor, role: 'administrator' });
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(200);
  expect(await (await freshOwner.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
    status: 'ready',
    household: { role: 'member' },
  });
  expect(await (await recovery.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
    status: 'ready',
    household: { role: 'administrator' },
  });
  expect(
    (
      await freshInvitee.post(`${origin}/api/invitations/accept`, {
        headers: { origin },
        data: { code: invitation.code },
      })
    ).status(),
  ).toBe(409);
  const freshInvitation = await (
    await recovery.post(invitations, {
      headers: { origin },
      data: { userId: inviteeId },
    })
  ).json();
  expect(
    (
      await freshInvitee.post(`${origin}/api/invitations/accept`, {
        headers: { origin },
        data: { code: freshInvitation.code },
      })
    ).status(),
  ).toBe(200);
});
async function login(identity = alex, provider = 'google') {
  installation.setIdentity(identity);
  const client = await request.newContext();
  clients.push(client);
  await signIn(client, installation.origin, provider);
  return client;
}

test('a large restored membership list can be explicitly confirmed in one action', async () => {
  installation = await createInstallation();
  const { origin } = installation;
  const owner = await login();
  const { household } = await (await createHousehold(owner, origin)).json();
  const backup = join(installation.directory, 'large-list.sqlite');
  await installation.saveDatabase(backup);
  const copy = new Database(backup);
  try {
    copy.transaction(() => {
      for (let index = 0; index < 250; index++) {
        const id = crypto.randomUUID();
        copy
          .prepare(
            `INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            `Person ${index}`,
            `${id}@example.test`,
            new Date().toISOString(),
            new Date().toISOString(),
          );
        copy
          .prepare("INSERT INTO membership (householdId, userId, role) VALUES (?, ?, 'member')")
          .run(household.id, id);
      }
    })();
  } finally {
    copy.close();
  }
  await installation.restoreDatabase(backup, {
    generation: '22222222-2222-4222-8222-222222222222',
    restore: {
      fromGeneration: '11111111-1111-4111-8111-111111111111',
      confirmedAt: Date.now(),
      erasureReviewed: true,
      recoveryAdmin: { provider: 'google', subject: alex.subject },
    },
  });
  const recovery = await login();
  const review = await (await recovery.get(`${origin}/api/recovery`)).json();
  expect(review.households[0].members).toHaveLength(251);
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(200);
  expect((await recovery.get(`${origin}/api/households/${household.id}/map`)).status()).toBe(200);
});

test('the complete review covers every household atomically and grants no automatic membership to its reviewer', async () => {
  installation = await createInstallation();
  const { origin } = installation;
  const owner = await login();
  const { household } = await (await createHousehold(owner, origin)).json();
  const ownerId = (await (await owner.get(`${origin}/api/bootstrap`)).json()).user.id;
  installation.seedMembership(ownerId, 'another-household', 'Andra hushållet', 'administrator');
  const backup = join(installation.directory, 'all-households.sqlite');
  await installation.saveDatabase(backup);
  await installation.restoreDatabase(backup, {
    generation: '22222222-2222-4222-8222-222222222222',
    restore: {
      fromGeneration: '11111111-1111-4111-8111-111111111111',
      confirmedAt: Date.now(),
      erasureReviewed: true,
      recoveryAdmin: { provider: 'google', subject: robin.subject },
    },
  });
  const recovery = await login(robin);
  const review = await (await recovery.get(`${origin}/api/recovery`)).json();
  expect(review.households).toHaveLength(2);
  const complete = (households: unknown) =>
    recovery.post(`${origin}/api/recovery/complete`, {
      headers: { origin },
      data: { ...review, households, confirmed: true },
    });
  expect((await complete(review.households.slice(0, 1))).status()).toBe(400);
  expect((await complete([review.households[0], review.households[0]])).status()).toBe(400);
  expect(
    (
      await complete(review.households.map((item: { id: string }) => ({ ...item, members: [] })))
    ).status(),
  ).toBe(409);
  const freshOwner = await login();
  for (const id of [household.id, 'another-household']) {
    for (const suffix of ['', '/map', '/administration', '/map/history', '/content-owners'])
      expect((await freshOwner.get(`${origin}/api/households/${id}${suffix}`)).status()).toBe(403);
  }
  expect((await complete(review.households)).status()).toBe(200);
  expect(await (await recovery.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
    status: 'forbidden',
  });
  for (const id of [household.id, 'another-household'])
    expect((await freshOwner.get(`${origin}/api/households/${id}/map`)).status()).toBe(200);
});

test('a revoked member stays blocked after fresh sign-in until the restored access list is reviewed', async () => {
  installation = await createInstallation();
  const { origin } = installation;
  const owner = await login();
  const { household } = await (await createHousehold(owner, origin)).json();
  const member = await login(robin);
  const { user } = await (await member.get(`${origin}/api/bootstrap`)).json();
  const invitations = `${origin}/api/households/${household.id}/invitations`;
  const { code } = await (
    await owner.post(invitations, {
      headers: { origin },
      data: { userId: user.id },
    })
  ).json();
  expect(
    (
      await member.post(`${origin}/api/invitations/accept`, {
        headers: { origin },
        data: { code },
      })
    ).status(),
  ).toBe(200);
  const backup = join(installation.directory, 'before-revocation.sqlite');
  await installation.saveDatabase(backup);
  expect(
    (
      await owner.post(`${origin}/api/households/${household.id}/members/${user.id}/revoke`, {
        headers: { origin },
        data: {},
      })
    ).status(),
  ).toBe(200);
  const map = `${origin}/api/households/${household.id}/map`;
  expect((await member.get(map)).status()).toBe(403);
  await installation.restoreDatabase(backup, {
    generation: '22222222-2222-4222-8222-222222222222',
    restore: {
      fromGeneration: '11111111-1111-4111-8111-111111111111',
      confirmedAt: Date.now(),
      erasureReviewed: true,
      recoveryAdmin: { provider: 'google', subject: alex.subject },
    },
  });
  expect((await member.get(map)).status()).toBe(401);
  const freshMember = await login(robin);
  expect((await freshMember.get(map)).status()).toBe(403);
  expect((await freshMember.get(`${origin}/api/recovery`)).status()).toBe(403);
  const recovery = await login();
  expect((await recovery.get(map)).status()).toBe(403);
  const review = await (await recovery.get(`${origin}/api/recovery`)).json();
  expect(review.households[0].members).toHaveLength(2);
  review.households[0].members = review.households[0].members.filter(
    (entry: { userId: string }) => entry.userId !== user.id,
  );
  expect(
    (
      await recovery.post(`${origin}/api/recovery/complete`, {
        headers: { origin },
        data: { ...review, confirmed: true },
      })
    ).status(),
  ).toBe(200);
  expect((await freshMember.get(map)).status()).toBe(403);
  expect((await recovery.get(map)).status()).toBe(200);
  expect((await recovery.get(`${origin}/api/recovery`)).status()).toBe(403);
  await installation.restart();
  expect((await freshMember.get(map)).status()).toBe(403);
  expect((await recovery.get(map)).status()).toBe(200);
});
