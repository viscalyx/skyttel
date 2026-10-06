import { isDeepStrictEqual } from 'node:util';
import type Database from 'better-sqlite3';
import type { RelationshipFormOutcome } from '../shared/relationship-form.js';
import { MapError } from './map-error.js';

/** Call only inside the map's authorized immediate transaction. */
export function relationshipFormAttempts(
  database: Database.Database,
  householdId: string,
  userId: string,
  contentVersion: number,
) {
  function read(stagingId: unknown) {
    if (
      typeof stagingId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(stagingId)
    )
      throw new MapError('invalid_request', 400);
    return database
      .prepare(
        'SELECT submission, outcome FROM relationship_form_attempt WHERE householdId = ? AND userId = ? AND contentVersion = ? AND stagingId = ?',
      )
      .get(householdId, userId, contentVersion, stagingId) as
      | { submission: string; outcome: string }
      | undefined;
  }
  return {
    outcome(stagingId: unknown): RelationshipFormOutcome | null {
      const stored = read(stagingId);
      return stored ? JSON.parse(stored.outcome) : null;
    },
    previous(submission: Record<string, unknown>): RelationshipFormOutcome | null {
      const stored = read(submission.stagingId);
      if (!stored) return null;
      if (!isDeepStrictEqual(JSON.parse(stored.submission), submission))
        throw new MapError('operation_reused');
      return JSON.parse(stored.outcome);
    },
    record(submission: Record<string, unknown>, outcome: RelationshipFormOutcome) {
      database
        .prepare('INSERT INTO relationship_form_attempt VALUES (?, ?, ?, ?, ?, ?)')
        .run(
          householdId,
          userId,
          contentVersion,
          outcome.stagingId,
          JSON.stringify(submission),
          JSON.stringify(outcome),
        );
    },
  };
}
