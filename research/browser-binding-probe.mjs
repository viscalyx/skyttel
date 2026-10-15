import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { chromium } from '@playwright/test';
import { betterAuth } from 'better-auth';
import { openDatabase } from '../src/server/database.ts';
import { connect, key, model, schema } from './browser-binding-model.mjs';

const report = (probe, fields) => console.log(JSON.stringify({ probe, ...fields }));
const temp = mkdtempSync(join(tmpdir(), 'skyttel-binding-441-'));
const file = join(temp, 'binding.sqlite');
let db = connect(file);
schema(db);
let api = model(db);
const login = (marker, owner, options, authToken) => {
  const id = api.register(marker, marker, 'login', authToken);
  assert.ok(id);
  assert.equal(api.consume(id), true);
  return api.complete(id, owner, { ...options, requestBinding: marker });
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

// Native SQLite connections in worker threads race on the SAME file.
async function race(owners) {
  const marker = api.candidate();
  const current = login(marker, 'previous');
  const attempts = owners.map(() => api.register(marker, marker, 'login', current.token));
  attempts.forEach((id) => assert.equal(api.consume(id), true));
  const gate = new SharedArrayBuffer(4);
  const workers = attempts.map((attempt, i) => new Worker(new URL('./browser-binding-model.mjs', import.meta.url),
    { workerData: { file, gate, attempt, binding: marker, owner: owners[i] } }));
  const exits = workers.map((w) => new Promise((resolve, reject) => {
    w.on('error', reject); w.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`worker ${code}`)));
  }));
  await Promise.all(workers.map((w) => new Promise((resolve) => w.once('message', (m) => {
    assert.equal(m, 'ready'); resolve();
  }))));
  const outcomes = workers.map((w) => new Promise((resolve) => w.once('message', resolve)));
  Atomics.store(new Int32Array(gate), 0, 1);
  Atomics.notify(new Int32Array(gate), 0);
  const results = await Promise.all(outcomes);
  await Promise.all(exits);
  assert.equal(results.filter((r) => r.won).length, 1);
  assert.ok(results.every((r) => !r.error));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM session WHERE binding = ?').get(marker).n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM attempt WHERE binding = ?').get(marker).n, 0);
}

async function raceBoundary(action) {
  const marker = api.candidate(); const current = login(marker, 'alice', { remembered: true });
  const attempt = api.register(marker, marker, 'login', current.token); assert.ok(api.consume(attempt));
  const gate = new SharedArrayBuffer(4);
  const workers = [
    new Worker(new URL('./browser-binding-model.mjs', import.meta.url), {
      workerData: { file, gate, attempt, binding: marker, owner: 'bob' } }),
    new Worker(new URL('./browser-binding-model.mjs', import.meta.url), {
      workerData: { file, gate, operation: 'change', action, token: current.token, binding: marker } }),
  ];
  const exits = workers.map((w) => new Promise((resolve, reject) => {
    w.on('error', reject); w.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`worker ${code}`)));
  }));
  await Promise.all(workers.map((w) => new Promise((resolve) => w.once('message', () => resolve()))));
  const outcomes = workers.map((w) => new Promise((resolve) => w.once('message', resolve)));
  Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0);
  const results = await Promise.all(outcomes); await Promise.all(exits);
  assert.equal(results.filter((r) => r.won).length, 1);
  assert.ok(results.every((r) => !r.error));
  assert.equal(api.authorize(current.token, marker), null);
  assert.equal(api.complete(attempt, 'bob', { requestBinding: marker }), null);
}

try {
  for (let i = 0; i < 4; i++) { await race(['alice', 'bob']); await race(['alice', 'alice']); }
  report('sqlite-native-race', { sameAndDifferentUsers: true, races: 8, oneWinner: true,
    databaseConnections: 'independent-worker-connections', sqlite: db.prepare('SELECT sqlite_version() AS v').get().v });
  for (let i = 0; i < 4; i++) { await raceBoundary('logout'); await raceBoundary('revoke'); }
  report('sqlite-native-boundary-race', { races: 8, callbackVersusLogoutAndRevoke: true,
    oneAuthorizedCommit: true, staleOperationReturnsFailure: true, consumedCallbackCannotRevive: true });

  const marker = api.candidate();
  const initial = login(marker, 'alice', { remembered: true });
  assert.equal(api.register(marker, marker), null);
  const failId = api.register(marker, marker, 'login', initial.token);
  assert.ok(api.consume(failId));
  assert.equal(api.complete(failId, 'bob', { requestBinding: marker, success: false }), null);
  assert.ok(api.authorize(initial.token, marker));
  const rollbackId = api.register(marker, marker, 'login', initial.token);
  assert.ok(api.consume(rollbackId));
  assert.throws(() => api.complete(rollbackId, 'bob', { requestBinding: marker, fail: true }), /injected/);
  assert.ok(api.authorize(initial.token, marker));
  assert.ok(db.prepare('SELECT 1 FROM attempt WHERE id = ?').get(rollbackId));
  const otherMarker = api.candidate();
  const other = login(otherMarker, 'alice');
  const pendingLink = api.register(marker, marker, 'link', initial.token);
  assert.ok(api.consume(pendingLink));
  const pendingLogin = api.register(marker, marker, 'login', initial.token);
  assert.ok(api.consume(pendingLogin));
  const actionId = key();
  const rotated = api.change(initial.token, marker, 'revoke', actionId);
  assert.equal(rotated.id, initial.id);
  assert.equal(rotated.remembered, 0);
  assert.ok(rotated.expires <= initial.expires);
  assert.equal(api.complete(pendingLogin, 'bob', { requestBinding: marker }), null);
  assert.equal(api.complete(pendingLink, 'late-subject', { requestBinding: marker }), null);
  assert.equal(api.register(marker, marker), null);
  assert.equal(api.authorize(initial.token, marker), null);
  assert.equal(api.change(initial.token, marker, 'logout'), null);
  assert.ok(api.authorize(rotated.token, rotated.binding));
  assert.ok(api.authorize(other.token, otherMarker));
  assert.equal(api.readResult(undefined, marker, actionId), null);
  assert.equal(api.readResult(other.token, otherMarker, actionId)?.action, 'revoke');
  const wrong = login(api.candidate(), 'bob');
  assert.equal(api.readResult(wrong.token, wrong.binding, actionId), undefined);
  report('atomic-effects', { rollback: true, failurePreservesCurrent: true, consumedStateStillCancelled: true,
    staleRegistrationRejected: true, staleLinkRejected: true, oldKeyNotAlias: true, otherDeviceUnaffected: true,
    bindingAloneNotResultAuthority: true, resultRequiresSameAuthenticatedOwner: true });

  const link = api.register(rotated.binding, rotated.binding, 'link', rotated.token);
  assert.ok(api.consume(link));
  assert.equal(api.complete(link, 'new-provider-subject', { requestBinding: undefined }), null);
  assert.equal(api.complete(link, 'new-provider-subject', { requestBinding: otherMarker }), null);
  assert.deepEqual(api.complete(link, 'new-provider-subject', { requestBinding: rotated.binding }), { linked: true });
  assert.equal(api.complete(link, 'new-provider-subject', { requestBinding: rotated.binding }), null);
  assert.equal(api.register(rotated.binding, rotated.binding, 'link', undefined), null);
  assert.equal(api.change(undefined, rotated.binding, 'logout'), null);
  assert.equal(api.authorize(rotated.token, undefined), null);
  assert.equal(api.authorize(rotated.token, otherMarker), null);
  assert.equal(api.recoverWithValidToken(undefined), false);
  assert.equal(api.recoverWithValidToken(rotated.token), true);
  assert.equal(api.authorize(rotated.token, rotated.binding), null);
  report('authority-and-loss', { genuineLinkCommitsOnce: true, bindingCannotLinkOrLogout: true,
    bindingCannotReplaceOccupiedLogin: true, missingAndChangedBindingDenied: true,
    validTokenIdentifiesOnlyOwnOldBinding: true });

  // Full identifier loss cannot associate an unrelated fresh binding with old state.
  const oldBind = api.candidate();
  const unknown = login(oldBind, 'alice');
  const newBind = api.candidate();
  login(newBind, 'bob');
  assert.ok(api.authorize(unknown.token, oldBind));
  assert.equal(api.authorize(unknown.token, newBind), null);
  api.change(unknown.token, oldBind, 'logout');
  db.close(); db = connect(file); api = model(db);
  api.cleanup();
  assert.equal(api.authorize(unknown.token, oldBind), null);
  assert.equal(api.complete(pendingLogin, 'bob', { requestBinding: marker }), null);
  db.prepare('DELETE FROM binding').run();
  assert.equal(api.register(oldBind, oldBind), null);
  assert.equal(api.authorize(unknown.token, oldBind), null);
  report('restart-and-positive-list', { unknownOlderPairCanStillAuthenticateBeforeInvalidation: true,
    explicitScopeLimitExposed: true, afterInvalidationAndRestartDenied: true, deletionDoesNotRevive: true });

  // Controlled clock verifies exact expiry; physical scheduler/production pauses are outside this probe.
  let now = 1_000;
  const timed = model(db, () => now);
  const b = timed.candidate();
  const a = timed.register(b, b); timed.consume(a);
  const s = timed.complete(a, 'alice', { requestBinding: b, remembered: true });
  const off = timed.change(s.token, b, 'revoke', 'timed-action');
  assert.equal(off.expires, 1_000 + 8 * 3_600_000);
  now = off.expires;
  assert.equal(timed.authorize(off.token, off.binding), null);
  timed.cleanup();
  assert.equal(timed.binding(off.binding), undefined);
  now = 1_000 + 86_400_000;
  timed.cleanup();
  assert.equal(db.prepare('SELECT 1 FROM result WHERE id = ?').get('timed-action'), undefined);
  report('absolute-deadlines', { exactBoundaryDenied: true, revokedDeadlineIsMinimum: true,
    cleanupAtInjectedTime: true, noBackgroundExtension: true });

  // Real Better Auth code, synthetic provider. This negative control is distinct from our model.
  const authDb = openDatabase(':memory:');
  const authOrigin = 'http://localhost:8199';
  const auth = betterAuth({ baseURL: authOrigin, database: authDb,
    secret: 'synthetic-secret-for-441-at-least-thirty-two-characters',
    telemetry: { enabled: false }, logger: { disabled: true },
    trustedOrigins: [authOrigin], session: { cookieCache: { enabled: false }, disableSessionRefresh: true },
    socialProviders: { google: { clientId: 'fake', clientSecret: 'fake' } } });
  const authContext = await auth.$context;
  const providerReached = deferred(); const providerRelease = deferred();
  authContext.socialProviders = [{ id: 'google', name: 'synthetic', options: {},
    accountSubject: ({ profile }) => profile.sub,
    createAuthorizationURL: async ({ state }) => new URL(`https://provider.invalid/?state=${state}`),
    validateAuthorizationCode: async ({ code }) => {
      if (code === 'held') { providerReached.resolve(); await providerRelease.promise; }
      return { accessToken: code, scopes: ['openid'] };
    },
    getUserInfo: async (tokens) => ({ user: { id: tokens.accessToken, name: tokens.accessToken,
      email: `${tokens.accessToken}@research.invalid`, emailVerified: true }, data: { sub: tokens.accessToken } }),
  }];
  const authHeaders = (cookie = '') => ({ Cookie: cookie, Origin: authOrigin, 'Content-Type': 'application/json' });
  const cookieOf = (r) => r.headers.getSetCookie().map((v) => v.split(';')[0]).join('; ');
  const start = async () => {
    const r = await auth.handler(new Request(`${authOrigin}/api/auth/sign-in/social`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ provider: 'google', callbackURL: '/' }) }));
    return { state: new URL((await r.json()).url).searchParams.get('state'), cookie: cookieOf(r) };
  };
  const callback = (attempt, code) => auth.handler(new Request(
    `${authOrigin}/api/auth/callback/google?state=${attempt.state}&code=${code}`, { headers: authHeaders(attempt.cookie) }));
  const first = await start(); const second = await start();
  const inFlight = callback(first, 'held'); await providerReached.promise;
  assert.equal(await authContext.internalAdapter.findVerificationValue(`auth-state:${first.state}`), null);
  const secondResponse = await callback(second, 'bob');
  providerRelease.resolve(); const firstResponse = await inFlight;
  for (const [response, expected] of [[firstResponse, 'held'], [secondResponse, 'bob']]) {
    assert.equal((await auth.api.getSession({ headers: new Headers(authHeaders(cookieOf(response))) }))?.user.name, expected);
  }
  report('better-auth-stock-negative-control', { version: '1.7.7', consumedStateBeforeCompletion: true,
    overlappingDifferentUsersBothHaveValidSessions: true, provesNeedForAdditionalContract: true });
  authDb.close();

  // HTTPS loopback exercises real browser cookies; the CA/proxy are deliberately synthetic.
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost',
    '-keyout', join(temp, 'key.pem'), '-out', join(temp, 'cert.pem')], { stdio: 'ignore' });
  const markerName = '__Host-skyttel_binding';
  const authName = '__Host-research_auth';
  const holds = new Map(); let candidates = 0; let providerStarts = 0;
  const cookie = (req, name) => req.headers.cookie?.split('; ').find((x) => x.startsWith(`${name}=`))?.slice(name.length + 1);
  const bindingCookie = (id) => `${markerName}=${id}; Secure; SameSite=Lax; Path=/`;
  const sessionCookie = (id) => `${authName}=${id}; Secure; HttpOnly; SameSite=Lax; Path=/`;
  const server = createServer({ key: readFileSync(join(temp, 'key.pem')), cert: readFileSync(join(temp, 'cert.pem')) }, (req, res) => {
    const url = new URL(req.url, 'https://localhost');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/candidate') {
      candidates++; const id = api.candidate();
      const release = () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ id })); };
      if (url.searchParams.has('hold')) holds.set(url.searchParams.get('hold'), { release, id }); else release();
      return;
    }
    if (url.pathname === '/unsafe-cookie') {
      const id = api.candidate();
      const release = () => { res.setHeader('Set-Cookie', bindingCookie(id)); res.end(JSON.stringify({ id })); };
      if (url.searchParams.has('hold')) holds.set(url.searchParams.get('hold'), { release, id }); else release();
      return;
    }
    if (url.pathname === '/echo') {
      const marker = cookie(req, markerName);
      const id = api.register(marker, url.searchParams.get('expected'));
      if (id) providerStarts++;
      res.end(JSON.stringify({ ok: !!id, marker })); return;
    }
    if (url.pathname === '/pair') {
      res.setHeader('Set-Cookie', [bindingCookie(url.searchParams.get('binding')), sessionCookie(url.searchParams.get('token'))]);
      res.end('pair'); return;
    }
    if (url.pathname === '/late-auth') {
      holds.set(url.searchParams.get('hold'), { release: () => {
        res.setHeader('Set-Cookie', sessionCookie(url.searchParams.get('token'))); res.end('late auth');
      } }); return;
    }
    if (url.pathname === '/access') {
      res.end(JSON.stringify({ owner: api.authorize(cookie(req, authName), cookie(req, markerName))?.owner ?? null })); return;
    }
    res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Research 441</title>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `https://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  async function pages() {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const a = await context.newPage(); const b = await context.newPage();
    await Promise.all([a.goto(origin), b.goto(origin)]); return { context, a, b };
  }
  const waitHold = async (name) => {
    for (let n = 0; n < 100 && !holds.has(name); n++) await new Promise((r) => setTimeout(r, 10));
    assert.ok(holds.has(name)); return holds.get(name);
  };
  const safeStart = async (page, options = {}) => page.evaluate(async ({ markerName, options }) => {
    if (!navigator.locks || options.noLocks) return { stopped: 'coordination-unavailable' };
    return navigator.locks.request('skyttel-binding-v1', async () => {
      let id = document.cookie.split('; ').find((x) => x.startsWith(`${markerName}=`))?.slice(markerName.length + 1);
      if (!id) {
        const response = await fetch('/candidate' + (options.hold ? `?hold=${options.hold}` : ''));
        id = (await response.json()).id;
        if (!options.blockCookie) document.cookie = `${markerName}=${id}; Secure; SameSite=Lax; Path=/`;
      }
      return (await fetch(`/echo?expected=${id}`)).json();
    });
  }, { markerName, options });
  try {
    const positive = await pages(); const before = candidates;
    const [one, two] = await Promise.all([safeStart(positive.a), safeStart(positive.b)]);
    assert.ok(one.ok && two.ok); assert.equal(one.marker, two.marker); assert.equal(candidates - before, 1);
    const nativeCookie = (await positive.context.cookies()).find((c) => c.name === markerName);
    assert.equal(nativeCookie.secure, true); assert.equal(nativeCookie.httpOnly, false);
    assert.equal(nativeCookie.sameSite, 'Lax'); assert.equal(nativeCookie.expires, -1); assert.equal(nativeCookie.path, '/');
    report('first-two-tabs', { browser: browser.version(), transport: 'HTTPS-self-signed-loopback',
      oneCandidate: true, sameBindingBeforeProviderStarts: true, nativeHostCookieAttributesChecked: true,
      noPersistentCoordinationStorage: true });
    await positive.context.close();

    const unsafe = await pages();
    const oldRequest = unsafe.b.evaluate(() => { window.outstanding = fetch('/unsafe-cookie?hold=unsafe'); });
    await oldRequest; const oldResponse = await waitHold('unsafe');
    const earlier = await unsafe.a.evaluate(async () => {
      const { id } = await (await fetch('/unsafe-cookie')).json(); return (await fetch(`/echo?expected=${id}`)).json();
    });
    assert.ok(earlier.ok); oldResponse.release();
    const later = await unsafe.b.evaluate(async () => {
      const { id } = await (await window.outstanding).json(); return (await fetch(`/echo?expected=${id}`)).json();
    });
    assert.ok(later.ok); assert.notEqual(earlier.marker, later.marker);
    report('echo-is-not-convergence', { bothEchoesPass: true, twoDifferentLiveBindings: true });
    await unsafe.context.close();

    for (const jsonOnly of [false, true]) {
      const delayed = await pages(); const label = jsonOnly ? 'json-late' : 'cookie-late';
      // Ending the lock callback while fetch remains pending is intentionally unsafe
      // for Set-Cookie. JSON has no cookie-writing continuation after lock release.
      await delayed.a.evaluate(async ({ jsonOnly, label }) => {
        await navigator.locks.request('skyttel-binding-v1', async () => {
          window.detached = fetch(`/${jsonOnly ? 'candidate' : 'unsafe-cookie'}?hold=${label}`);
          await Promise.race([window.detached, new Promise((r) => setTimeout(r, 30))]);
        });
      }, { jsonOnly, label });
      const held = await waitHold(label);
      const next = await safeStart(delayed.b); assert.ok(next.ok);
      held.release(); await delayed.a.evaluate(() => window.detached.then((r) => r.text()));
      const observed = (await delayed.context.cookies()).find((c) => c.name === markerName).value;
      assert.equal(observed === next.marker, jsonOnly);
      report(jsonOnly ? 'late-json-candidate' : 'late-set-cookie-after-lock', {
        lockAlreadyReleased: true, newBindingSurvives: jsonOnly, oldNetworkResponseWritesCookie: !jsonOnly });
      await delayed.context.close();
    }

    const denied = await pages(); const startsBefore = providerStarts;
    assert.equal((await safeStart(denied.a, { blockCookie: true })).ok, false);
    assert.equal((await safeStart(denied.b, { noLocks: true })).stopped, 'coordination-unavailable');
    // Native rejection of a malformed __Host cookie, independently of the simulated policy.
    await denied.a.evaluate(({ markerName }) => { document.cookie = `${markerName}=rejected; Secure; Path=/wrong`; }, { markerName });
    assert.equal((await denied.context.cookies()).some((c) => c.name === markerName), false);
    assert.equal(providerStarts, startsBefore);
    report('initialization-rejections', { simulatedCookiePolicy: 'no-write', missingLocksStop: true,
      nativeMalformedHostCookieRejected: true, noProviderStarts: true });
    await denied.context.close();

    const late = await pages(); const m = api.candidate();
    const old = login(m, 'alice', { remembered: true });
    await late.a.evaluate(({ b, t }) => fetch(`/pair?binding=${b}&token=${t}`), { b: m, t: old.token });
    await late.a.evaluate((token) => { window.oldResponse = fetch(`/late-auth?hold=late-auth&token=${token}`); }, old.token);
    await waitHold('late-auth');
    const newSession = login(m, 'bob', {}, old.token);
    await late.b.evaluate(({ b, t }) => fetch(`/pair?binding=${b}&token=${t}`), { b: m, t: newSession.token });
    assert.equal((await late.b.evaluate(() => fetch('/access').then((r) => r.json()))).owner, 'bob');
    holds.get('late-auth').release(); await late.a.evaluate(() => window.oldResponse.then((r) => r.text()));
    assert.equal((await late.a.evaluate(() => fetch('/access').then((r) => r.json()))).owner, null);
    assert.equal((await late.context.cookies()).find((c) => c.name === authName).value, old.token);
    // Restore a genuinely invalidated pair using actual response headers.
    api.change(newSession.token, m, 'logout');
    await late.a.evaluate(({ b, t }) => fetch(`/pair?binding=${b}&token=${t}`), { b: m, t: newSession.token });
    assert.equal((await late.a.evaluate(() => fetch('/access').then((r) => r.json()))).owner, null);
    report('actual-late-cookie-writes', { previousUserCookieOverwritesNewUser: true, oldKeyStillDenied: true,
      restoredInvalidatedCookiePairDenied: true, noAliasOrRepairToken: true });
    await late.context.close();

    const loss = await pages(); const lostMarker = api.candidate();
    const lost = login(lostMarker, 'alice', { remembered: true });
    const install = async (b, t) => loss.a.evaluate(({ b, t }) => fetch(`/pair?binding=${b}&token=${t}`), { b, t });
    const access = () => loss.a.evaluate(() => fetch('/access').then((r) => r.json()));
    await install(lostMarker, lost.token); assert.equal((await access()).owner, 'alice');
    await loss.a.evaluate(({ markerName }) => { document.cookie = `${markerName}=; Secure; Path=/; Max-Age=0`; }, { markerName });
    assert.equal((await access()).owner, null);
    // Before explicit replacement, a restored still-live pair is identifiable again.
    await install(lostMarker, lost.token); assert.equal((await access()).owner, 'alice');
    api.recoverWithValidToken(lost.token);
    await install(lostMarker, lost.token); assert.equal((await access()).owner, null);
    const unknownMarker = api.candidate(); const unknownSession = login(unknownMarker, 'alice');
    await install(unknownMarker, unknownSession.token);
    await loss.context.clearCookies();
    const freshMarker = api.candidate(); const fresh = login(freshMarker, 'bob');
    await install(freshMarker, fresh.token); assert.equal((await access()).owner, 'bob');
    await install(unknownMarker, unknownSession.token); assert.equal((await access()).owner, 'alice');
    // Revocation rotates BOTH server associations. A late authentication response alone mismatches.
    const afterRevoke = api.change(unknownSession.token, unknownMarker, 'revoke');
    await install(afterRevoke.binding, afterRevoke.token); assert.equal((await access()).owner, 'alice');
    await loss.a.evaluate((token) => { window.rotationLate = fetch(`/late-auth?hold=rotation-late&token=${token}`); }, unknownSession.token);
    await waitHold('rotation-late'); holds.get('rotation-late').release();
    await loss.a.evaluate(() => window.rotationLate.then((r) => r.text()));
    assert.equal((await access()).owner, null);
    await install(unknownMarker, unknownSession.token); assert.equal((await access()).owner, null);
    report('actual-cookie-pair-loss-and-rotation', { missingMarkerDeniedWithLiveAuthKey: true,
      restoredStillLivePairWorksBeforeInvalidation: true, identifiableOldBindingInvalidatedBeforeReplacement: true,
      allIdentifiersLostDoesNotInvalidateUnknownOldPair: true, lateAuthAfterRotationDenied: true,
      restoredRevokedPairDenied: true });

    // Persistence is an absolute remaining deadline, never Max-Age reset by polling.
    const deadline = Math.floor(Date.now() / 1000) * 1000 + 3_600_000;
    await loss.a.evaluate(({ markerName, deadline }) => {
      document.cookie = `${markerName}=lifetime-probe; Secure; SameSite=Lax; Path=/; Expires=${new Date(deadline).toUTCString()}`;
    }, { markerName, deadline });
    const persistent = (await loss.context.cookies()).find((c) => c.name === markerName);
    assert.equal(persistent.expires, deadline / 1000);
    await loss.a.evaluate(() => fetch('/access'));
    assert.equal((await loss.context.cookies()).find((c) => c.name === markerName).expires, persistent.expires);
    report('native-cookie-lifetime', { sessionCookieAlreadyChecked: true, absoluteExpiresChecked: true,
      backgroundReadDoesNotRewriteCookie: true, browserRestartNotProven: true });
    await loss.context.close();
  } finally {
    await browser.close(); await new Promise((resolve) => server.close(resolve));
  }
} finally {
  db.close(); rmSync(temp, { recursive: true, force: true });
}
