import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';

interface MigrationRecord {
  version: number;
  name: string;
  checksum: string;
}

type DatabaseFailure =
  | 'database_unavailable'
  | 'unsupported_database_format'
  | 'migration_failed'
  | 'migration_files_missing'
  | 'invalid_migration_sequence'
  | 'migration_history_mismatch';

export class DatabaseInitializationError extends Error {
  constructor(readonly reason: DatabaseFailure) {
    super('database_initialization_failed');
  }
}

// Independent of migration history: older household models cannot be upgraded.
const applicationId = 0x534b5954;
const formatVersion = 2;

function checkFormat(database: Database.Database) {
  const application = database.pragma('application_id', { simple: true });
  const version = database.pragma('user_version', { simple: true });
  if (application === applicationId && version === formatVersion) return;
  const empty = !database.prepare('SELECT 1 FROM sqlite_schema LIMIT 1').get();
  if (application === 0 && version === 0 && empty) return;
  throw new DatabaseInitializationError('unsupported_database_format');
}

export function openDatabase(
  path: string,
  { migrationsDirectory = resolve('migrations') }: { migrationsDirectory?: string } = {},
): Database.Database {
  let database: Database.Database | undefined;
  let reason: DatabaseFailure = 'database_unavailable';
  try {
    if (path !== ':memory:' && existsSync(path)) {
      // Inspect before opening a writer, changing permissions or journal mode.
      const reader = new Database(path, { readonly: true, fileMustExist: true });
      try {
        checkFormat(reader);
      } finally {
        reader.close();
      }
    }
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
    database = new Database(path);
    checkFormat(database);
    if (path !== ':memory:') chmodSync(path, 0o600);
    database.pragma('foreign_keys = ON');
    database.pragma('busy_timeout = 5000');
    const journalMode = database.pragma('journal_mode = WAL', { simple: true });
    if (path !== ':memory:' && journalMode !== 'wal') throw new DatabaseInitializationError(reason);
    database.pragma('synchronous = FULL');
    reason = 'migration_failed';
    database.pragma(`application_id = ${applicationId}`);
    database.pragma(`user_version = ${formatVersion}`);
    migrate(database, migrationsDirectory);
    return database;
  } catch (error) {
    database?.close();
    throw error instanceof DatabaseInitializationError
      ? error
      : new DatabaseInitializationError(reason);
  }
}

function migrate(database: Database.Database, directory: string) {
  const files = readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  if (files.length === 0) throw new DatabaseInitializationError('migration_files_missing');
  const migrations = files.map((name, index) => {
    const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(name);
    const version = Number(match?.[1]);
    if (!match || version !== index + 1)
      throw new DatabaseInitializationError('invalid_migration_sequence');
    const sql = readFileSync(join(directory, name), 'utf8');
    return { version, name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });

  database.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    appliedAt TEXT NOT NULL
  )`);
  // SQLite table replacement requires foreign keys disabled before BEGIN.
  // Check the entire resulting graph before committing any schema or data.
  database.pragma('foreign_keys = OFF');
  try {
    database
      .transaction(() => {
        const applied = database
          .prepare('SELECT version, name, checksum FROM schema_migration ORDER BY version')
          .all() as MigrationRecord[];
        for (const [index, record] of applied.entries()) {
          const migration = migrations[index];
          if (
            !migration ||
            record.version !== migration.version ||
            record.name !== migration.name ||
            record.checksum !== migration.checksum
          ) {
            throw new DatabaseInitializationError('migration_history_mismatch');
          }
        }
        const recordMigration = database.prepare(
          'INSERT INTO schema_migration (version, name, checksum, appliedAt) VALUES (?, ?, ?, ?)',
        );
        for (const migration of migrations.slice(applied.length)) {
          database.exec(migration.sql);
          recordMigration.run(
            migration.version,
            migration.name,
            migration.checksum,
            new Date().toISOString(),
          );
        }
        if ((database.pragma('foreign_key_check') as unknown[]).length)
          throw new DatabaseInitializationError('migration_failed');
      })
      .immediate();
  } finally {
    database.pragma('foreign_keys = ON');
  }
}
