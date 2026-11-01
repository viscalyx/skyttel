import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import type { RelationshipFormOutcome } from '../shared/relationship-form.js';
import { MapError } from './map-error.js';

export const relationshipConfirmationLimits = {
  lifetime: 7 * 24 * 60 * 60_000,
  ticketLifetime: 60 * 60_000,
  memberCount: 1_000,
  memberBytes: 8 * 1024 * 1024,
  installationCount: 10_000,
  installationBytes: 64 * 1024 * 1024,
  installationMetadataBytes: 4096,
};

// JSON object key order is immaterial to exact replay. Arrays remain ordered.
function fingerprint(submission: Record<string, unknown>) {
  const canonical = JSON.stringify(submission, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, value[key]]),
        )
      : value,
  );
  return createHash('sha256').update(canonical).digest('hex');
}

/** Call only inside the map's authorized immediate transaction. */
export function relationshipFormAttempts(
  database: Database.Database,
  householdId: string,
  userId: string,
  contentVersion: number,
  now = Date.now(),
) {
  const unavailable = () => new MapError('relationship_confirmation_unavailable');
  function signature(value: string) {
    const { secret } = database
      .prepare('SELECT secret FROM relationship_form_signing WHERE id = 1')
      .get() as { secret: string };
    return createHmac('sha256', secret)
      .update(JSON.stringify([householdId, userId, contentVersion, value]))
      .digest('hex');
  }
  function assertFresh(stagingId: string) {
    const match = /^(\d{13})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(stagingId);
    if (
      !match ||
      !timingSafeEqual(
        Buffer.from(match[3], 'hex'),
        Buffer.from(signature(`${match[1]}.${match[2]}`), 'hex'),
      )
    )
      throw unavailable();
    const issuedAt = Number(match[1]);
    if (issuedAt > now || now >= issuedAt + relationshipConfirmationLimits.ticketLifetime)
      throw unavailable();
  }
  function read(stagingId: unknown) {
    if (typeof stagingId !== 'string' || stagingId.length > 160)
      throw new MapError('invalid_request', 400);
    const stored = database
      .prepare(
        'SELECT submission, fingerprint, outcome, expiresAt FROM relationship_form_attempt WHERE householdId = ? AND userId = ? AND contentVersion = ? AND stagingId = ?',
      )
      .get(householdId, userId, contentVersion, stagingId) as
      | { submission: string; fingerprint: string | null; outcome: string; expiresAt: number }
      | undefined;
    if (stored) {
      if (now >= stored.expiresAt) throw unavailable();
    } else assertFresh(stagingId);
    return stored;
  }
  return {
    issue() {
      const value = `${now}.${randomUUID()}`;
      return { stagingId: `${value}.${signature(value)}` };
    },
    outcome(stagingId: unknown): RelationshipFormOutcome | null {
      const stored = read(stagingId);
      return stored ? JSON.parse(stored.outcome) : null;
    },
    previous(submission: Record<string, unknown>): RelationshipFormOutcome | null {
      const stored = read(submission.stagingId);
      if (!stored) return null;
      const same = stored.fingerprint
        ? stored.fingerprint === fingerprint(submission)
        : isDeepStrictEqual(JSON.parse(stored.submission), submission);
      if (!same) throw new MapError('operation_reused');
      return JSON.parse(stored.outcome);
    },
    record(submission: Record<string, unknown>, outcome: RelationshipFormOutcome) {
      const digest = fingerprint(submission);
      const encoded = JSON.stringify(outcome);
      // Charge variable-width evidence and identifiers plus a fixed allowance for
      // integers, row headers and index entries. Count also bounds index growth.
      const bytes =
        512 +
        [householdId, userId, outcome.stagingId, encoded, digest].reduce(
          (total, value) => total + Buffer.byteLength(value, 'utf8'),
          0,
        );
      for (const [scope, parameters, countLimit, byteLimit] of [
        [
          '',
          [],
          relationshipConfirmationLimits.installationCount,
          relationshipConfirmationLimits.installationBytes,
        ],
        [
          'WHERE householdId = ? AND userId = ?',
          [householdId, userId],
          relationshipConfirmationLimits.memberCount,
          relationshipConfirmationLimits.memberBytes,
        ],
      ] as const) {
        const usage = database
          .prepare(
            `SELECT count(*) AS count, coalesce(sum(accountedBytes), 0) AS bytes FROM relationship_form_attempt ${scope}`,
          )
          .get(...parameters) as { count: number; bytes: number };
        const metadata = scope ? 0 : relationshipConfirmationLimits.installationMetadataBytes;
        if (usage.count >= countLimit || usage.bytes + bytes + metadata > byteLimit)
          throw new MapError('relationship_confirmation_capacity');
      }
      database
        .prepare(`INSERT INTO relationship_form_attempt
        (householdId, userId, contentVersion, stagingId, submission, outcome, expiresAt, fingerprint, accountedBytes)
        VALUES (?, ?, ?, ?, '', ?, ?, ?, ?)`)
        .run(
          householdId,
          userId,
          contentVersion,
          outcome.stagingId,
          encoded,
          now + relationshipConfirmationLimits.lifetime,
          digest,
          bytes,
        );
    },
  };
}

/** Bounded lifecycle work, independent of form traffic; failures retry next minute. */
export function relationshipConfirmationCleanup(database: Database.Database, now: () => number) {
  if (
    !database.prepare("SELECT 1 FROM sqlite_master WHERE name = 'relationship_form_signing'").get()
  )
    return () => {};
  let stopped = false;
  let continuation: NodeJS.Immediate | undefined;
  function sweep() {
    continuation = undefined;
    if (stopped || !database.open || database.inTransaction) return;
    try {
      const more = database
        .transaction(() => {
          const removed = database
            .prepare(`DELETE FROM relationship_form_attempt WHERE rowid IN
          (SELECT rowid FROM relationship_form_attempt WHERE expiresAt <= ? ORDER BY expiresAt LIMIT 100)`)
            .run(now()).changes;
          // Compact legacy requests without changing their grace deadline or outcomes.
          const legacy = database
            .prepare(`SELECT rowid, submission FROM relationship_form_attempt
          WHERE fingerprint IS NULL LIMIT ?`)
            .all(100 - removed) as { rowid: number; submission: string }[];
          for (const row of legacy) {
            const digest = fingerprint(JSON.parse(row.submission));
            database
              .prepare(
                `UPDATE relationship_form_attempt
                SET fingerprint = ?, submission = '',
                  accountedBytes = accountedBytes - length(cast(submission AS blob)) + length(?)
                WHERE rowid = ?`,
              )
              .run(digest, digest, row.rowid);
          }
          return removed + legacy.length === 100;
        })
        .immediate();
      if (more) {
        continuation = setImmediate(sweep);
        continuation.unref();
      }
    } catch {
      console.error(JSON.stringify({ event: 'relationship_confirmation_cleanup_failed' }));
    }
  }
  sweep();
  const timer = setInterval(() => {
    if (!continuation) sweep();
  }, 60_000);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
    if (continuation) clearImmediate(continuation);
  };
}
