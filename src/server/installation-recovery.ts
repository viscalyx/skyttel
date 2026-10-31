import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { RecoveryReview } from '../shared/installation-recovery.js';
import { AdministrationError } from './administration.js';
import type { AuthorityFence } from './config.js';
import { InstallationAuthorityError } from './installation-authority.js';

type Recovery = {
  generation: string;
  provider: string;
  subject: string;
  completedAt: string | null;
};

function recovery(database: Database.Database): Recovery | undefined {
  // Historical migration fixtures intentionally omit this schema.
  if (
    !database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE name = 'installation_recovery' AND type = 'table'",
      )
      .get()
  )
    return undefined;
  return database.prepare('SELECT * FROM installation_recovery WHERE id = 1').get() as
    | Recovery
    | undefined;
}

export function prepareRecovery(
  database: Database.Database,
  fence: AuthorityFence,
  newRestore: boolean,
) {
  if (!fence.restore) return;
  const current = recovery(database);
  const { provider, subject } = fence.restore.recoveryAdmin;
  if (!newRestore && current) {
    if (
      current.generation !== fence.generation ||
      current.provider !== provider ||
      current.subject !== subject
    )
      throw new InstallationAuthorityError('restore_declaration_required');
    return;
  }
  database
    .prepare(`INSERT INTO installation_recovery (id, generation, provider, subject, completedAt)
    VALUES (1, ?, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET generation = excluded.generation,
    provider = excluded.provider, subject = excluded.subject, completedAt = NULL`)
    .run(fence.generation, provider, subject);
  database.exec("UPDATE invitation SET status = 'revoked' WHERE status = 'pending'");
}

export function recoveryPending(database: Database.Database) {
  const current = recovery(database);
  return Boolean(current && current.completedAt === null);
}

export function canReviewRecovery(database: Database.Database, sessionId: string) {
  const current = recovery(database);
  return Boolean(
    current &&
      current.completedAt === null &&
      database
        .prepare(`SELECT 1 FROM session
    WHERE id = ? AND loginProvider = ? AND loginSubject = ?`)
        .get(sessionId, current.provider, current.subject),
  );
}

function requireRecovery(database: Database.Database, sessionId: string) {
  if (!canReviewRecovery(database, sessionId)) throw new AdministrationError('forbidden', 403);
  return recovery(database) as Recovery;
}

export function readRecovery(database: Database.Database, sessionId: string): RecoveryReview {
  const current = requireRecovery(database, sessionId);
  const actor = database
    .prepare(`SELECT u.id AS userId, u.name FROM user u
    JOIN session s ON s.userId = u.id WHERE s.id = ?`)
    .get(sessionId) as RecoveryReview['actor'];
  const households = (
    database.prepare('SELECT id, name FROM household ORDER BY id').all() as {
      id: string;
      name: string;
    }[]
  ).map((household) => ({
    ...household,
    members: database
      .prepare(`SELECT u.id AS userId, u.name, m.role
      FROM membership m JOIN user u ON u.id = m.userId WHERE m.householdId = ? ORDER BY u.id`)
      .all(household.id) as RecoveryReview['households'][number]['members'],
  }));
  const revision = createHash('sha256')
    .update(JSON.stringify([current.generation, households]))
    .digest('hex');
  return { generation: current.generation, revision, actor, households };
}

const completion = z.object({
  generation: z.string(),
  revision: z.string(),
  confirmed: z.literal(true),
  households: z.array(
    z.object({
      id: z.string(),
      members: z.array(
        z.object({
          userId: z.string(),
          role: z.enum(['administrator', 'member']),
        }),
      ),
    }),
  ),
});

export function completeRecovery(database: Database.Database, sessionId: string, input: unknown) {
  return database
    .transaction(() => {
      const current = readRecovery(database, sessionId);
      const parsed = completion.safeParse(input);
      if (!parsed.success) throw new AdministrationError('invalid_request', 400);
      const proposed = parsed.data;
      if (proposed.generation !== current.generation || proposed.revision !== current.revision)
        throw new AdministrationError('review_changed', 409);
      if (
        proposed.households.length !== current.households.length ||
        new Set(proposed.households.map((household) => household.id)).size !==
          proposed.households.length
      )
        throw new AdministrationError('invalid_request', 400);
      for (const household of proposed.households) {
        const original = current.households.find((item) => item.id === household.id);
        if (
          !original ||
          new Set(household.members.map((member) => member.userId)).size !==
            household.members.length ||
          household.members.some(
            (member) =>
              member.userId !== current.actor.userId &&
              !original.members.some((old) => old.userId === member.userId),
          )
        )
          throw new AdministrationError('invalid_request', 400);
        if (!household.members.some((member) => member.role === 'administrator'))
          throw new AdministrationError('last_administrator', 409);
      }
      for (const household of proposed.households) {
        const original = current.households.find((item) => item.id === household.id);
        for (const member of original?.members ?? [])
          if (!household.members.some((retained) => retained.userId === member.userId))
            database
              .prepare('DELETE FROM membership WHERE householdId = ? AND userId = ?')
              .run(household.id, member.userId);
        for (const member of household.members)
          database
            .prepare(`INSERT INTO membership (householdId, userId, role) VALUES (?, ?, ?)
          ON CONFLICT(householdId, userId) DO UPDATE SET role = excluded.role`)
            .run(household.id, member.userId, member.role);
      }
      database
        .prepare('UPDATE installation_recovery SET completedAt = ? WHERE id = 1')
        .run(new Date().toISOString());
      return { ok: true };
    })
    .immediate();
}
