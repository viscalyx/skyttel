// Throwaway research model. This is NOT Skyttel's auth implementation.
import { createHash, randomBytes } from 'node:crypto';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import Database from 'better-sqlite3';

export const key = () => randomBytes(32).toString('hex');
const revision = (token) => createHash('sha256').update(token).digest('hex');
export function connect(file) {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  return db;
}
export function schema(db) {
  db.exec(`
    CREATE TABLE binding (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE attempt (
      id TEXT PRIMARY KEY, binding TEXT NOT NULL REFERENCES binding(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL, kind TEXT NOT NULL, owner TEXT, authority TEXT,
      consumed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE session (
      token TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL,
      binding TEXT UNIQUE NOT NULL REFERENCES binding(id) ON DELETE CASCADE,
      owner TEXT NOT NULL, expires INTEGER NOT NULL, remembered INTEGER NOT NULL
    );
    CREATE TABLE linked (provider_subject TEXT PRIMARY KEY, owner TEXT NOT NULL);
    CREATE TABLE result (id TEXT PRIMARY KEY, owner TEXT NOT NULL,
      action TEXT NOT NULL, expires INTEGER NOT NULL);
  `);
}
export function model(db, clock = () => Date.now()) {
  const tx = (fn) => db.transaction(fn).immediate();
  const binding = (id) => db.prepare('SELECT * FROM binding WHERE id = ? AND expires > ?')
    .get(id ?? '', clock());
  const token = (value) => db.prepare('SELECT * FROM session WHERE token = ? AND expires > ?')
    .get(value ?? '', clock());
  const authorize = (value, marker) => {
    const current = token(value);
    return current && current.binding === marker && binding(marker) ? current : null;
  };
  const remove = (id) => db.prepare('DELETE FROM binding WHERE id = ?').run(id);
  return {
    binding, token, authorize,
    candidate() {
      const id = key();
      db.prepare('INSERT INTO binding VALUES (?, ?)').run(id, clock() + 600_000);
      return id;
    },
    register(marker, expected, kind = 'login', authToken) {
      return tx(() => {
        if (marker !== expected || !binding(marker)) return null;
        const occupied = db.prepare('SELECT * FROM session WHERE binding = ? AND expires > ?')
          .get(marker, clock());
        const owner = authorize(authToken, marker);
        if ((kind === 'link' || occupied) && !owner) return null;
        const id = key();
        db.prepare('INSERT INTO attempt (id, binding, expires, kind, owner, authority) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, marker, clock() + 600_000, kind, owner?.owner ?? null, owner ? revision(owner.token) : null);
        db.prepare('UPDATE binding SET expires = MAX(expires, ?) WHERE id = ?')
          .run(clock() + 600_000, marker);
        return id;
      });
    },
    consume(id) {
      return tx(() => db.prepare('UPDATE attempt SET consumed = 1 WHERE id = ? AND consumed = 0 AND expires > ?')
        .run(id, clock()).changes === 1);
    },
    complete(id, verifiedIdentity, { requestBinding, success = true, fail = false, remembered = false } = {}) {
      // The caller supplies a SYNTHETIC verified provider result, never client JSON.
      return tx(() => {
        const a = db.prepare('SELECT * FROM attempt WHERE id = ? AND expires > ? AND consumed = 1')
          .get(id, clock());
        if (!a || requestBinding !== a.binding || !binding(a.binding)) return null;
        if (!success) {
          db.prepare('DELETE FROM attempt WHERE id = ?').run(id);
          return null;
        }
        const live = db.prepare('SELECT * FROM session WHERE binding = ? AND expires > ?')
          .get(a.binding, clock());
        if (a.authority && (!live || live.owner !== a.owner || revision(live.token) !== a.authority)) return null;
        if (!a.authority && live) return null;
        if (a.kind === 'link') {
          const current = db.prepare('SELECT * FROM session WHERE binding = ? AND expires > ?')
            .get(a.binding, clock());
          if (!current || current.owner !== a.owner || revision(current.token) !== a.authority) return null;
          const existing = db.prepare('SELECT owner FROM linked WHERE provider_subject = ?').get(verifiedIdentity);
          if (existing && existing.owner !== a.owner) return null;
          db.prepare('INSERT OR IGNORE INTO linked VALUES (?, ?)').run(verifiedIdentity, a.owner);
          db.prepare('DELETE FROM attempt WHERE id = ?').run(id);
          if (fail) throw new Error('injected-rollback');
          return { linked: true };
        }
        const issued = { token: key(), id: key(), binding: a.binding, owner: verifiedIdentity,
          expires: clock() + (remembered ? 7 * 86_400_000 : 8 * 3_600_000), remembered: Number(remembered) };
        db.prepare('DELETE FROM session WHERE binding = ?').run(a.binding);
        db.prepare('DELETE FROM attempt WHERE binding = ?').run(a.binding);
        db.prepare('INSERT INTO session VALUES (@token, @id, @binding, @owner, @expires, @remembered)').run(issued);
        db.prepare('UPDATE binding SET expires = ? WHERE id = ?').run(issued.expires, a.binding);
        if (fail) throw new Error('injected-rollback');
        return issued;
      });
    },
    change(authToken, marker, action, actionId = key()) {
      return tx(() => {
        const current = authorize(authToken, marker);
        if (!current) return null;
        const previous = db.prepare('SELECT * FROM result WHERE id = ?').get(actionId);
        if (previous) return previous.owner === current.owner ? { duplicate: true } : null;
        db.prepare('INSERT INTO result VALUES (?, ?, ?, ?)')
          .run(actionId, current.owner, action, clock() + 86_400_000);
        remove(current.binding);
        if (action === 'logout') return { ended: true };
        const next = { ...current, token: key(), binding: key(), remembered: 0,
          expires: Math.min(current.expires, clock() + 8 * 3_600_000) };
        db.prepare('INSERT INTO binding VALUES (?, ?)').run(next.binding, next.expires);
        db.prepare('INSERT INTO session VALUES (@token, @id, @binding, @owner, @expires, @remembered)').run(next);
        return next;
      });
    },
    recoverWithValidToken(authToken) {
      // An explicit same-origin recovery request, guarded like a mutation.
      // Binding possession cannot select which session to invalidate.
      return tx(() => {
        const current = token(authToken);
        if (!current) return false;
        remove(current.binding);
        return true;
      });
    },
    readResult(authToken, marker, id) {
      const current = authorize(authToken, marker);
      return current ? db.prepare('SELECT action FROM result WHERE id = ? AND owner = ? AND expires > ?')
        .get(id, current.owner, clock()) : null;
    },
    cleanup() {
      return tx(() => {
        db.prepare('DELETE FROM attempt WHERE expires <= ?').run(clock());
        db.prepare('DELETE FROM session WHERE expires <= ?').run(clock());
        db.prepare('DELETE FROM binding WHERE expires <= ?').run(clock());
        db.prepare('DELETE FROM result WHERE expires <= ?').run(clock());
      });
    },
  };
}

if (!isMainThread) {
  const db = connect(workerData.file);
  const api = model(db);
  const gate = new Int32Array(workerData.gate);
  parentPort.postMessage('ready');
  Atomics.wait(gate, 0, 0, 5000);
  try {
    const result = workerData.operation === 'change'
      ? api.change(workerData.token, workerData.binding, workerData.action)
      : api.complete(workerData.attempt, workerData.owner, { requestBinding: workerData.binding });
    parentPort.postMessage({ won: !!result, owner: result?.owner, ended: result?.ended });
  } catch (error) {
    parentPort.postMessage({ error: String(error) });
  } finally {
    db.close();
  }
}
