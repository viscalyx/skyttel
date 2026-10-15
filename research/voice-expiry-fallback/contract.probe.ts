import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { expect, test } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';

// Executable conditional design model. This is NOT production authorization.
// All identities and proof fields below are synthetic trusted server fixtures.
function task() {
  let now = 90;
  let state: 'collecting' | 'verified' | 'delivering' | 'delivered' | 'rejected' = 'collecting';
  let revision = 1;
  const deadline = 110;
  const expiry = 100;
  const initialRevision = revision;
  let complete = false;
  let boundClient: object | undefined;
  let final:
    | { taskId: string; revision: number; kind: string; text: string; digest: string }
    | undefined;
  const alive = () =>
    state !== 'rejected' && state !== 'delivered' && now < deadline && revision === initialRevision;
  return {
    time(value: number) {
      now = value;
    },
    verify(proof: { complete: boolean; startUpper: number; conservativeDeadline: number }) {
      if (
        !alive() ||
        now >= expiry ||
        !proof.complete ||
        proof.startUpper >= expiry ||
        proof.conservativeDeadline !== deadline
      )
        return false;
      complete = true;
      state = 'verified';
      return true;
    },
    expiry() {
      if (!complete) state = 'rejected';
    },
    mutate() {
      return alive() && complete && state === 'verified';
    },
    revoke() {
      revision++;
      state = 'rejected';
      final = undefined;
    },
    restart() {
      state = 'rejected';
      final = undefined;
    },
    disconnect() {
      state = 'rejected';
      final = undefined;
    },
    finish(client: object, sections: string[], kind = 'answer') {
      if (!alive() || !complete || state !== 'verified') return undefined;
      const text = sections.filter(Boolean).join('\n');
      final = {
        taskId: 'existing-task',
        revision: 4,
        kind,
        text,
        digest: createHash('sha256').update(text, 'utf8').digest('hex'),
      };
      boundClient = client;
      state = 'delivering';
      return final;
    },
    ack(client: object, value: unknown) {
      if (
        !alive() ||
        state !== 'delivering' ||
        client !== boundClient ||
        !final ||
        JSON.stringify(value) !==
          JSON.stringify({
            taskId: final.taskId,
            revision: final.revision,
            digest: final.digest,
          })
      )
        return false;
      state = 'delivered';
      final = undefined;
      return true;
    },
    status: () => state,
    deadline,
    expireDelivery() {
      if (now >= deadline && state !== 'delivered') {
        state = 'rejected';
        final = undefined;
      }
    },
  };
}
const proof = { complete: true, startUpper: 80, conservativeDeadline: 110 };

test.each([
  { complete: false, startUpper: 80, conservativeDeadline: 110 },
  { complete: true, startUpper: 100, conservativeDeadline: 110 },
  { complete: true, startUpper: 80, conservativeDeadline: 130 },
])('uncertain instruction or start/deadline gets no exception: %j', (value) => {
  const t = task();
  expect(t.verify(value)).toBe(false);
  t.expiry();
  expect(t.mutate()).toBe(false);
  expect(t.verify(proof)).toBe(false);
});

test('delayed start proof, dequeue and retry never extend or revive task', () => {
  const t = task();
  t.time(100);
  expect(t.verify(proof)).toBe(false);
  t.expiry();
  t.time(105);
  expect(t.mutate()).toBe(false);
  expect(t.finish({}, ['Svar'])).toBeUndefined();
  expect(t.deadline).toBe(110);
});

test.each(['revoke', 'restart', 'disconnect'] as const)(
  '%s breaks verified work and late ACK',
  (stop) => {
    const t = task();
    const client = {};
    expect(t.verify(proof)).toBe(true);
    const final = t.finish(client, ['Obligatorisk notis', 'Verifierat resultat', 'Följdfråga?']);
    expect(final?.text).toBe('Obligatorisk notis\nVerifierat resultat\nFöljdfråga?');
    t[stop]();
    expect(t.mutate()).toBe(false);
    expect(t.ack(client, final)).toBe(false);
    expect(t.verify(proof)).toBe(false);
  },
);

test('deadline rejects commit and delivery ACK even when timeout callback is late', () => {
  const t = task();
  const client = {};
  t.verify(proof);
  const final = t.finish(client, ['Helt svar']);
  t.time(110);
  expect(t.mutate()).toBe(false);
  expect(
    t.ack(client, { taskId: final?.taskId, revision: final?.revision, digest: final?.digest }),
  ).toBe(false);
  expect(t.finish(client, ['Nytt svar'])).toBeUndefined();
  t.expireDelivery();
  expect(t.status()).toBe('rejected');
});

test('partial text, transport receipt, wrong revision and another client never deliver final question', () => {
  const t = task();
  const a = {},
    b = {};
  t.verify(proof);
  const final = t.finish(a, ['Vad kostar abonnemanget?'], 'question');
  const ack = { taskId: final?.taskId, revision: final?.revision, digest: final?.digest };
  expect(t.ack(a, { type: 'pong' })).toBe(false);
  expect(
    t.ack(a, { ...ack, digest: createHash('sha256').update('Vad kostar').digest('hex') }),
  ).toBe(false);
  expect(t.ack(a, { ...ack, revision: 3 })).toBe(false);
  expect(t.ack(b, ack)).toBe(false);
  t.time(105);
  expect(t.ack(a, ack)).toBe(true);
  expect(t.ack(a, ack)).toBe(false);
  expect(t.mutate()).toBe(false);
  expect(t.verify(proof)).toBe(false);
});

test('real synthetic WebSocket binds ACK to preauthenticated socket without new browser secret', async () => {
  let now = 90;
  const server = createServer();
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    if (
      req.headers.origin !== 'http://example.test' ||
      req.headers.cookie !== 'existing-session=synthetic' ||
      now >= 100
    ) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing address');
  const url = `ws://127.0.0.1:${address.port}`;
  const connect = () =>
    new WebSocket(url, {
      origin: 'http://example.test',
      headers: { cookie: 'existing-session=synthetic' },
    });
  const sockets: WebSocket[] = [];
  wss.on('connection', (ws) => sockets.push(ws));
  const a = connect(),
    b = connect();
  try {
    await Promise.all([once(a, 'open'), once(b, 'open')]);
    expect(sockets).toHaveLength(2);
    const t = task();
    expect(t.verify(proof)).toBe(true);
    now = 105;
    t.time(now);
    const final = t.finish(sockets[0], ['Obligatorisk notis', 'Hela svaret: ränta 3,5 %.']);
    const pending = once(a, 'message');
    sockets[0].send(JSON.stringify(final));
    const [bytes] = await pending;
    const received = JSON.parse(String(bytes));
    expect(received.text).toBe(final?.text);
    expect(createHash('sha256').update(received.text, 'utf8').digest('hex')).toBe(received.digest);
    const ack = { taskId: received.taskId, revision: received.revision, digest: received.digest };
    // A second client knows every public identifier and the whole text.
    // It still cannot acknowledge a delivery bound to the first socket.
    const wrong = once(sockets[1], 'message');
    b.send(JSON.stringify(ack));
    const [wrongBytes] = await wrong;
    expect(t.ack(sockets[1], JSON.parse(String(wrongBytes)))).toBe(false);
    const late = connect();
    const refused = await new Promise<number>((resolve, reject) => {
      late.on('unexpected-response', (_req, res) => {
        resolve(res.statusCode ?? 0);
        res.resume();
        late.terminate();
      });
      late.on('error', () => {});
      late.on('open', () => reject(new Error('new post-expiry connection accepted')));
    });
    expect(refused).toBe(401);
    const correct = once(sockets[0], 'message');
    a.send(JSON.stringify(ack));
    const [ackBytes] = await correct;
    expect(t.ack(sockets[0], JSON.parse(String(ackBytes)))).toBe(true);
    expect(t.status()).toBe('delivered');
  } finally {
    a.terminate();
    b.terminate();
    for (const socket of wss.clients) socket.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
