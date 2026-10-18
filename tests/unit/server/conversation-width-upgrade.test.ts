import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { openDatabase } from '../../../src/server/database.js';

test('migration 024 retains an existing actor draft choice while adding default widths', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-width-upgrade-'));
  const previous = join(directory, 'migrations');
  mkdirSync(previous);
  for (const name of readdirSync(resolve('migrations')).filter((name) => name < '024'))
    copyFileSync(resolve('migrations', name), join(previous, name));
  const snapshot = join(directory, 'skyttel.sqlite');
  const old = openDatabase(snapshot, { migrationsDirectory: previous });
  try {
    const userId = 'existing-width-owner';
    old
      .prepare(`INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
        VALUES (?, 'Alex', 'width-owner@example.test', 0, ?, ?)`)
      .run(userId, Date.now(), Date.now());
    old
      .prepare('INSERT INTO conversation_preferences(userId, showDraftOnStart) VALUES (?, 1)')
      .run(userId);
    const upgraded = openDatabase(snapshot);
    try {
      expect(
        upgraded.prepare('SELECT * FROM conversation_preferences WHERE userId = ?').get(userId),
      ).toEqual({
        userId,
        showDraftOnStart: 1,
        textWidth: 400,
        draftWidth: 340,
      });
      expect(
        upgraded.prepare('SELECT MAX(version) AS version FROM schema_migration').get(),
      ).toEqual({ version: 35 });
    } finally {
      upgraded.close();
    }
  } finally {
    old.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
