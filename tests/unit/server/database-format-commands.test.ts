import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, expect, test } from 'vitest';
import { configurationEnvironment } from './fixture.js';

let directory: string;
afterEach(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});

test.each([
  ['src/server/index.ts'],
  ['scripts/setup-database.ts'],
  ['scripts/migrate-development-database.ts'],
  ['src/server/upgrade-legacy-login.ts', '--confirm-legacy-upgrade', '--confirm-service-stopped'],
])('older database remains byte-for-byte intact when running %s', (...command) => {
  directory = mkdtempSync(join(tmpdir(), 'skyttel-format-command-'));
  const path = join(directory, 'skyttel.sqlite');
  const database = new Database(path);
  database.exec("CREATE TABLE household (name TEXT); INSERT INTO household VALUES ('Linden');");
  database.close();
  const envFile = join(directory, '.env');
  writeFileSync(envFile, '');
  const before = readFileSync(path);
  const mode = statSync(path).mode;
  const files = readdirSync(directory);
  const result = spawnSync(process.execPath, ['--import', 'tsx', ...command], {
    env: {
      PATH: process.env.PATH,
      ...configurationEnvironment(path),
      NODE_ENV: 'development',
      SKYTTEL_DEV_ENV_FILE: envFile,
    },
    encoding: 'utf8',
    timeout: 10_000,
  });
  expect(result.status, result.stderr).toBe(1);
  expect(result.stderr).toContain('unsupported_database_format');
  expect(readFileSync(path)).toEqual(before);
  expect(statSync(path).mode).toBe(mode);
  expect(readdirSync(directory)).toEqual(files);
});
