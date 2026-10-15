import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { betterAuth } from 'better-auth';
import { makeSignature } from 'better-auth/crypto';
import Database from 'better-sqlite3';
import { chromium } from '@playwright/test';
import { openDatabase } from '../src/server/database.ts';

// Research only: fake provider, in-memory auth, loopback transport, no secrets.
const origin = 'http://localhost:8199';
const secret = 'research-only-secret-not-for-production-432';
const db = openDatabase(':memory:');
const auth = betterAuth({ baseURL: origin, database: db, secret,
  telemetry: { enabled: false }, logger: { disabled: true },
  trustedOrigins: [origin], session: { cookieCache: { enabled: false }, disableSessionRefresh: true },
  socialProviders: { google: { clientId: 'fake', clientSecret: 'fake' } },
});
const ctx = await auth.$context;
let subject = 'alice';
let providerWait: Promise<void> | undefined;
let reachedProvider: (() => void) | undefined;
ctx.socialProviders = [{ id: 'google', name: 'fake', options: {},
  accountSubject: ({ profile }) => profile.sub,
  createAuthorizationURL: async ({ state }) => new URL(`https://provider.invalid/?state=${state}`),
  validateAuthorizationCode: async () => {
    reachedProvider?.();
    if (providerWait) await providerWait;
    return { accessToken: 'fake-provider-token', scopes: ['openid'] };
  },
  getUserInfo: async () => ({ user: { id: subject, email: `${subject}@research.invalid`,
    emailVerified: true, name: subject }, data: { sub: subject } }),
}];
const call = (path: string, options = {}) => auth.handler(new Request(origin + '/api/auth' + path, options));
const cookies = (r: Response) => r.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
const sessionHeader = (r: Response) => r.headers.getSetCookie().find(v => v.startsWith('better-auth.session_token='))!;
const sessionCookie = (r: Response) => sessionHeader(r).split(';')[0];
const headers = (cookie: string) => ({ Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' });
async function start(cookie = '') {
  const r = await call('/sign-in/social', { method: 'POST', headers: headers(cookie),
    body: JSON.stringify({ provider: 'google', callbackURL: '/' }) });
  assert.equal(r.status, 200);
  return { r, state: new URL((await r.json()).url).searchParams.get('state')! };
}
async function callback(attempt: Awaited<ReturnType<typeof start>>, cookie = '') {
  return call(`/callback/google?state=${attempt.state}&code=fake`, { headers: headers(cookies(attempt.r) + '; ' + cookie) });
}
async function login(name: string) { subject = name; return callback(await start()); }
const alice = await login('alice');
const oldCookie = sessionCookie(alice);
const before = await auth.api.getSession({ headers: new Headers(headers(oldCookie)) });
assert.ok(before);
const independent = await login('alice');
const independentCookie = sessionCookie(independent);

// Singleton state cookies do not remember all overlapping starts.
const first = await start(oldCookie);
const second = await start(oldCookie);
const mismatch = await call(`/callback/google?state=${first.state}&code=fake`, { headers: headers(cookies(second.r)) });
assert.match(mismatch.headers.get('location')!, /state_mismatch/);
assert.ok(db.prepare('SELECT 1 FROM verification WHERE identifier = ?').get(`auth-state:${first.state}`));
console.log(JSON.stringify({ probe: 'overlap', oldStateOverwritten: true, olderVerificationStillExists: true }));

// Callback has consumed state and is waiting at provider. Stock logout does
// not cancel it, so it can create a different user's session after logout.
let release!: () => void;
providerWait = new Promise<void>(resolve => { release = resolve; });
const arrived = new Promise<void>(resolve => { reachedProvider = resolve; });
const outstanding = await start(oldCookie);
subject = 'bob';
const pending = callback(outstanding, oldCookie);
await arrived;
assert.equal(await ctx.internalAdapter.findVerificationValue(`auth-state:${outstanding.state}`), null);
const logout = await call('/sign-out', { method: 'POST', headers: headers(oldCookie), body: '{}' });
assert.equal(logout.status, 200);
release();
const late = await pending;
providerWait = undefined; reachedProvider = undefined;
const lateCookie = sessionCookie(late);
assert.equal((await auth.api.getSession({ headers: new Headers(headers(lateCookie)) }))?.user.name, 'bob');
console.log(JSON.stringify({ probe: 'stock-logout-inflight-callback', stateConsumedBeforeLogout: true,
  callbackCreatedValidDifferentUserAfterLogout: true }));

// Rotation proof: direct token UPDATE is a probe, not the complete contract.
const freshAlice = await login('alice');
const previous = sessionCookie(freshAlice);
const s = await auth.api.getSession({ headers: new Headers(headers(previous)) });
assert.ok(s);
const rotatedToken = 'research-fake-rotated-token-432';
db.prepare('UPDATE session SET token = ? WHERE id = ?').run(rotatedToken, s.session.id);
const rotatedCookie = `better-auth.session_token=${encodeURIComponent(rotatedToken + '.' + await makeSignature(rotatedToken, secret))}`;
const rotated = await auth.api.getSession({ headers: new Headers(headers(rotatedCookie)) });
assert.equal(rotated?.session.id, s.session.id);
assert.equal(rotated?.session.expiresAt.getTime(), s.session.expiresAt.getTime());
assert.equal(await auth.api.getSession({ headers: new Headers(headers(previous)) }), null);
assert.equal(await ctx.internalAdapter.findSession(s.session.token), null);
for (const [path, method, body] of [
  ['/list-sessions', 'GET', undefined],
  ['/link-social', 'POST', JSON.stringify({ provider: 'google', callbackURL: '/' })],
  ['/get-access-token', 'POST', JSON.stringify({ accountId: 'fake-account' })],
] as const) {
  const r = await call(path, { method, headers: headers(previous), body });
  assert.equal(r.status, 401, path);
}
for (const method of ['listSessions', 'linkSocialAccount', 'getAccessToken'] as const) {
  await assert.rejects(async () => auth.api[method]({ headers: new Headers(headers(previous)),
    body: method === 'getAccessToken' ? { accountId: 'fake-account' } : { provider: 'google', callbackURL: '/' } } as never),
  (e: any) => e.statusCode === 401);
}
// Stock logout with a rotated-out token says success but misses current key.
assert.equal((await call('/sign-out', { method: 'POST', headers: headers(previous), body: '{}' })).status, 200);
assert.ok(await auth.api.getSession({ headers: new Headers(headers(rotatedCookie)) }));
assert.ok(await auth.api.getSession({ headers: new Headers(headers(independentCookie)) }));
console.log(JSON.stringify({ probe: 'rotation', stableIdentity: true, sameDeadline: true,
  oldKeyRejectedByHTTPAndDirectAPIs: true, otherSessionUnaffected: true,
  stockStaleLogoutLeavesRotatedKeyValid: true }));

// Actual browser receives an already produced callback cookie after rotation.
// No real provider or TLS claim: HTTP loopback suffices to examine ordering.
let held: import('node:http').ServerResponse | undefined;
let signalHeld!: () => void;
let heldArrival = new Promise<void>(resolve => { signalHeld = resolve; });
const server = createServer((req, res) => {
  if (req.url === '/late') { held = res; signalHeld(); return; }
  if (req.url === '/seed') res.setHeader('Set-Cookie', sessionHeader(freshAlice));
  if (req.url === '/rotate') res.setHeader('Set-Cookie', rotatedCookie + '; Path=/; HttpOnly; SameSite=Lax');
  res.end('<!doctype html><title>Research</title>');
});
await new Promise<void>(resolve => server.listen(8199, '127.0.0.1', resolve));
const browser = await chromium.launch();
try {
  const profile = await browser.newContext();
  const page = await profile.newPage();
  await page.goto(origin + '/seed');
  await page.evaluate(() => { (window as any).held = fetch('/late'); });
  await heldArrival;
  await page.evaluate(() => fetch('/rotate'));
  assert.equal((await profile.cookies()).find(c => c.name === 'better-auth.session_token')?.expires, -1);
  held!.setHeader('Set-Cookie', sessionHeader(late)); held!.end('late');
  await page.evaluate(() => (window as any).held);
  const stale = (await profile.cookies()).find(c => c.name === 'better-auth.session_token')!;
  assert.ok(stale.expires > Date.now() / 1000);
  const observedCookie = `${stale.name}=${stale.value}`;
  assert.equal((await auth.api.getSession({ headers: new Headers(headers(observedCookie)) }))?.user.name, 'bob');
  const lateSession = await auth.api.getSession({ headers: new Headers(headers(lateCookie)) });
  await ctx.internalAdapter.deleteSession(lateSession!.session.token);
  assert.equal(await auth.api.getSession({ headers: new Headers(headers(observedCookie)) }), null);
  console.log(JSON.stringify({ probe: 'late-response-browser', browser: browser.version(), transport: 'HTTP-loopback',
    staleDifferentUserCookieOverwroteRotatedCookie: true, issuedSessionMustAlsoBeInvalidated: true,
    invalidCookieRemainsWithoutAccess: true }));
} finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }

// Minimal positive-list model. Profile binding is an ASSUMPTION here.
const directory = mkdtempSync(join(tmpdir(), 'skyttel-432-'));
const file = join(directory, 'model.sqlite');
let model = new Database(file);
model.exec(`CREATE TABLE live (id TEXT PRIMARY KEY, profile TEXT, generation INTEGER, kind TEXT);
CREATE TABLE result (id TEXT PRIMARY KEY, owner TEXT, action TEXT, at INTEGER);
CREATE TABLE profile (id TEXT PRIMARY KEY, generation INTEGER);
INSERT INTO profile VALUES ('profile-a', 0), ('other-device', 0);
INSERT INTO live VALUES ('current', 'profile-a', 0, 'session'), ('issued-other-user', 'profile-a', 0, 'session'),
('pending', 'profile-a', 0, 'attempt'), ('independent', 'other-device', 0, 'session');`);
const present = (id: string) => !!model.prepare('SELECT 1 FROM live WHERE id = ?').get(id);
const revoke = (actionId: string, fail = false) => model.transaction(() => {
  if (model.prepare('SELECT 1 FROM result WHERE id = ?').get(actionId)) return;
  model.prepare('UPDATE profile SET generation = generation + 1 WHERE id = ?').run('profile-a');
  model.prepare('DELETE FROM live WHERE profile = ? AND id != ?').run('profile-a', 'current');
  model.prepare('UPDATE live SET generation = 1 WHERE id = ?').run('current');
  model.prepare('INSERT INTO result VALUES (?, ?, ?, ?)').run(actionId, 'alice', 'off', 100);
  if (fail) throw new Error('injected failure');
}).immediate();
assert.throws(() => revoke('failure', true));
assert.ok(present('pending')); assert.ok(present('issued-other-user'));
revoke('action-a'); revoke('action-a');
assert.equal(present('pending'), false); assert.equal(present('issued-other-user'), false);
assert.ok(present('current')); assert.ok(present('independent'));
model.close(); model = new Database(file);
assert.equal(present('pending'), false);
const result = (id: string, owner: string | undefined, now: number) => {
  if (!owner) return null;
  return model.prepare('SELECT action FROM result WHERE id = ? AND owner = ? AND at > ?').get(id, owner, now - 86400000);
};
assert.equal(result('action-a', undefined, 101), null);
assert.equal(result('action-a', 'bob', 101), undefined);
assert.deepEqual(result('action-a', 'alice', 101), { action: 'off' });
assert.equal(result('action-a', 'alice', 86400100), undefined);
model.exec('DELETE FROM result; DELETE FROM profile;');
assert.equal(present('pending'), false); assert.equal(present('issued-other-user'), false);
// Fresh generations are never a default for absent old attempts.
assert.equal(present('never-registered-old-attempt'), false);
model.close(); rmSync(directory, { recursive: true });
console.log(JSON.stringify({ probe: 'conditional-model', assumedBinding: true, rollback: true,
  issuedAndPendingRemoved: true, duplicateIdempotent: true, restart: true,
  exactResultOwnerAndDeadline: true, cleanupDidNotReviveDeletedEntries: true }));
