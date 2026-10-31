import { join } from 'node:path';
import { request } from '@playwright/test';
import { createHousehold, signIn } from './client.js';
import { alex, createInstallation, robin } from './installation.js';

export const recoveryIdentity = {
  subject: 'recovery-google',
  name: 'Lo Exempel',
  email: 'lo@example.test',
};

/** Disposable restore preparation; assertions use the application's public UI/API. */
export async function prepareInstallationRecovery(newAdministrator = false) {
  const installation = await createInstallation();
  const { origin } = installation;
  const owner = await request.newContext();
  const member = await request.newContext();
  try {
    await signIn(owner, origin);
    const { household } = await (await createHousehold(owner, origin)).json();
    installation.setIdentity(robin);
    await signIn(member, origin);
    const { user } = await (await member.get(`${origin}/api/bootstrap`)).json();
    const { code } = await (
      await owner.post(`${origin}/api/households/${household.id}/invitations`, {
        headers: { origin },
        data: { userId: user.id },
      })
    ).json();
    const accepted = await member.post(`${origin}/api/invitations/accept`, {
      headers: { origin },
      data: { code },
    });
    if (!accepted.ok()) throw new Error('recovery_preparation_failed');
    const backup = join(installation.directory, 'before-revocation.sqlite');
    await installation.saveDatabase(backup);
    const revoked = await owner.post(
      `${origin}/api/households/${household.id}/members/${user.id}/revoke`,
      {
        headers: { origin },
        data: {},
      },
    );
    if (!revoked.ok()) throw new Error('recovery_preparation_failed');
    await installation.restoreDatabase(backup, {
      generation: '22222222-2222-4222-8222-222222222222',
      restore: {
        fromGeneration: '11111111-1111-4111-8111-111111111111',
        confirmedAt: Date.now(),
        erasureReviewed: true,
        recoveryAdmin: {
          provider: 'google',
          subject: newAdministrator ? recoveryIdentity.subject : alex.subject,
        },
      },
    });
    installation.setIdentity(newAdministrator ? recoveryIdentity : alex);
    return { installation, household };
  } catch (error) {
    await installation.close();
    throw error;
  } finally {
    await owner.dispose();
    await member.dispose();
  }
}
