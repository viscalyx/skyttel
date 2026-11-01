import sharp from 'sharp';
import { afterEach, beforeEach, expect, test } from 'vitest';
import {
  assistantTaskAccess,
  assistantTaskConnection,
} from '../../../src/server/assistant-auth.js';
import type { MapState } from '../../../src/shared/map.js';
import { applicationFixture } from './fixture.js';

let fixture: Awaited<ReturnType<typeof applicationFixture>>;
let owner: ReturnType<typeof fixture.client>;
let householdPath: string;
const build = { commit: 'synthetic-upload-build', version: '1.0.0' };
const buildHeader = { 'X-Skyttel-Build': `${build.commit}:${build.version}` };

beforeEach(async () => {
  fixture = await applicationFixture({ identity: build });
  owner = fixture.client();
  await owner.signIn();
  const { household } = await (
    await owner.json('/api/households', { name: 'Synthetic uploads' }, buildHeader)
  ).json();
  householdPath = `/api/households/${household.id}`;
});
afterEach(() => fixture.close());

async function unreadRequest(
  actor: ReturnType<typeof fixture.client>,
  path: string,
  status: number,
  headers: Record<string, string> = {},
) {
  let reads = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array(1024));
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  try {
    const response = await actor.request(path, {
      method: 'POST',
      headers: { origin: fixture.config.origin, ...buildHeader, ...headers },
      body,
      duplex: 'half',
    } as RequestInit);
    expect(response.status).toBe(status);
    expect(reads).toBe(0);
    return response;
  } finally {
    if (!body.locked) await body.cancel();
  }
}

const protectedBodies = [
  ['/profile-images/person', 'application/octet-stream'],
  ['/map/object-form', 'multipart/form-data; boundary=synthetic'],
  ['/map/object-form', 'application/json'],
  ...['draft', 'relationship', 'relationship-form', 'resolve', 'discard-review'].map((route) => [
    `/map/${route}`,
    'application/json',
  ]),
];

test('internal MCP task guards reject bodies before reading', async () => {
  await assistantTaskConnection.run('synthetic-task', () =>
    unreadRequest(fixture.client(), '/mcp', 401),
  );
  await assistantTaskConnection.run('synthetic-task', () =>
    assistantTaskAccess.run(
      () => {
        throw new Error('Task revoked');
      },
      () => unreadRequest(fixture.client(), '/mcp', 401),
    ),
  );
});

test('import and recovery retain their separate admission before reading', async () => {
  await unreadRequest(fixture.client(), `${householdPath}/imports`, 401, {
    'content-type': 'application/zip',
    'x-skyttel-content-version': '1',
  });
  await unreadRequest(owner, '/api/households/other/imports', 403, {
    'content-type': 'application/zip',
    'x-skyttel-content-version': '1',
  });
  await unreadRequest(fixture.client(), '/api/recovery/complete', 401);
  await unreadRequest(owner, '/api/recovery/complete', 403);
});

test.each(protectedBodies)(
  '%s (%s) rejects anonymous and non-member bodies unread',
  async (path, contentType) => {
    await unreadRequest(fixture.client(), `${householdPath}${path}`, 401, {
      'content-type': contentType,
    });
    fixture.setSubject('outside-household');
    const outsider = fixture.client();
    await outsider.signIn();
    await unreadRequest(outsider, `${householdPath}${path}`, 403, { 'content-type': contentType });
    // Membership in a different household must not admit this request.
    await unreadRequest(owner, `/api/households/other${path}`, 403, {
      'content-type': contentType,
    });
  },
);

test.each(['', 'Bearer invalid'])(
  'MCP rejects absent or invalid credentials (%s) before reading',
  async (authorization) => {
    const response = await unreadRequest(fixture.client(), '/mcp', 401, { authorization });
    expect(response.headers.get('www-authenticate')).toContain('oauth-protected-resource');
  },
);

test('property writes count streamed bytes even when Content-Length understates the body', async () => {
  let sent = 0;
  let canceled = false;
  const response = await owner.request(`${householdPath}/map/draft`, {
    method: 'POST',
    headers: {
      origin: fixture.config.origin,
      ...buildHeader,
      'content-type': 'application/json',
      'content-length': '2',
    },
    body: new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          const size = sent < 2_000_001 ? Math.min(64_000, 2_000_001 - sent) : 1;
          controller.enqueue(new Uint8Array(size).fill(32));
          sent += size;
          if (sent > 2_000_001) controller.close();
        },
        cancel() {
          canceled = true;
        },
      },
      { highWaterMark: 0 },
    ),
    duplex: 'half',
  } as RequestInit);
  expect(response.status).toBe(413);
  expect(sent).toBe(2_000_001);
  expect(canceled).toBe(true);
});

function streamed(bytes: Uint8Array): RequestInit {
  let offset = 0;
  return {
    body: new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          controller.enqueue(bytes.subarray(offset, offset + 64_000));
          offset += 64_000;
          if (offset >= bytes.length) controller.close();
        },
      },
      { highWaterMark: 0 },
    ),
    duplex: 'half',
  } as RequestInit;
}

const readMap = async (): Promise<MapState> => (await owner.request(`${householdPath}/map`)).json();

test.each([
  ['draft', 2_000_000],
  ['object-form', 12_032_768],
] as const)(
  '%s accepts an exact-limit JSON stream and rejects one additional byte',
  async (route, limit) => {
    const state = await readMap();
    const body = JSON.stringify({
      version: 0,
      contentVersion: state.contentVersion,
      stagingId: crypto.randomUUID(),
      id: 'person',
      baseRevision: null,
      value: { typeId: state.types[0].id, name: 'Synthetic person', properties: [] },
    });
    for (const size of [limit, limit + 1]) {
      const response = await owner.request(`${householdPath}/map/${route}`, {
        method: 'POST',
        headers: {
          origin: fixture.config.origin,
          ...buildHeader,
          'content-type': 'application/json',
        },
        ...streamed(Buffer.from(body.padEnd(size, ' '))),
      });
      expect(response.status, await response.text()).toBe(size === limit ? 200 : 413);
      expect((await readMap()).draft.changes).toHaveLength(1);
    }
  },
);

test.each(['image', 'multipart'] as const)(
  '%s accepts its exact byte limit and preserves the draft on overflow',
  async (kind) => {
    const state = await readMap();
    const metadata = {
      version: 0,
      contentVersion: state.contentVersion,
      stagingId: crypto.randomUUID(),
      id: 'person',
      baseRevision: null,
      value: { typeId: state.types[0].id, name: 'Synthetic person', properties: [] },
    };
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff6600' } })
      .png()
      .toBuffer();
    let payload: Buffer;
    let contentType: string;
    let path: string;
    if (kind === 'image') {
      expect((await owner.json(`${householdPath}/map/draft`, metadata, buildHeader)).status).toBe(
        200,
      );
      payload = Buffer.alloc(10_000_000);
      png.copy(payload);
      contentType = 'application/octet-stream';
      path = `${householdPath}/profile-images/person`;
    } else {
      const form = new FormData();
      form.set('metadata', JSON.stringify(metadata));
      form.set('image', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'synthetic.png');
      const encoded = new Request('http://localhost', { method: 'POST', body: form });
      contentType = encoded.headers.get('content-type') ?? '';
      payload = Buffer.alloc(12_032_768, 32);
      Buffer.from(await encoded.arrayBuffer()).copy(payload);
      path = `${householdPath}/map/object-form`;
    }
    const headers = {
      origin: fixture.config.origin,
      ...buildHeader,
      'content-type': contentType,
      'x-skyttel-draft-version': '1',
      'x-skyttel-content-version': '1',
      'x-skyttel-object-revision': 'null',
    };
    const exact = await owner.request(path, { method: 'POST', headers, ...streamed(payload) });
    expect(exact.status, await exact.text()).toBe(200);
    const accepted = await readMap();
    expect(accepted.draft.changes[0].after?.profileImageId).toEqual(expect.any(String));
    const overflow = await owner.request(path, {
      method: 'POST',
      headers,
      ...streamed(Buffer.concat([payload, Buffer.alloc(1)])),
    });
    expect(overflow.status).toBe(413);
    expect(await readMap()).toEqual(accepted);
  },
);

test('public authentication keeps its small limit and upload admission preserves build and origin checks', async () => {
  const body = Buffer.from(
    JSON.stringify({
      application_type: 'native',
      client_name: 'Synthetic upload client',
      redirect_uris: ['http://127.0.0.1:7777/callback'],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }).padEnd(16_384, ' '),
  );
  const anonymous = fixture.client();
  const exact = await anonymous.request('/api/auth/oauth2/register', {
    method: 'POST',
    headers: { origin: fixture.config.origin, 'content-type': 'application/json' },
    ...streamed(body),
  });
  expect(exact.status, await exact.text()).toBe(201);
  const overflow = await anonymous.request('/api/auth/oauth2/register', {
    method: 'POST',
    headers: { origin: fixture.config.origin, 'content-type': 'application/json' },
    ...streamed(Buffer.concat([body, Buffer.alloc(1)])),
  });
  expect(overflow.status).toBe(413);
  await unreadRequest(owner, `${householdPath}/map/draft`, 409, { 'X-Skyttel-Build': 'old' });
  await unreadRequest(owner, `${householdPath}/map/draft`, 403, {
    origin: 'https://other.example',
  });
  await unreadRequest(owner, '/mcp', 403, { origin: 'https://other.example' });
});
