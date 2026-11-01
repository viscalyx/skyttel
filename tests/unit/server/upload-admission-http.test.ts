import { request as httpRequest } from 'node:http';
import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { beginAssistant } from '../../support/assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { createInstallation, robin } from '../../support/installation.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let owner: APIRequestContext;
let outsider: APIRequestContext;
let householdId: string;
let outsiderId: string;
beforeEach(async () => {
  app = await createInstallation();
  owner = await request.newContext();
  await signIn(owner, app.origin);
  ({
    household: { id: householdId },
  } = await (await createHousehold(owner, app.origin)).json());
  app.setIdentity(robin);
  outsider = await request.newContext();
  await signIn(outsider, app.origin, 'microsoft');
  ({
    user: { id: outsiderId },
  } = await (await outsider.get(`${app.origin}/api/bootstrap`)).json());
});
afterEach(async () => {
  await outsider.dispose();
  await owner.dispose();
  await app.close();
});

async function cookie(actor: APIRequestContext) {
  return (await actor.storageState()).cookies
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

// Send one bounded chunk, never the terminating chunk. The generous deadline
// only prevents a broken server from hanging the test; completion is structural.
function unfinished(path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; milliseconds: number; challenge?: string }>(
    (resolve, reject) => {
      const started = performance.now();
      const outgoing = httpRequest(`${app.origin}${path}`, {
        method: 'POST',
        headers: { origin: app.origin, 'transfer-encoding': 'chunked', ...headers },
        agent: false,
      });
      const timeout = setTimeout(() => {
        outgoing.destroy(new Error('No response while the request body remains unfinished'));
      }, 5000);
      outgoing.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      outgoing.once('response', (response) => {
        clearTimeout(timeout);
        try {
          expect(outgoing.writableEnded).toBe(false);
          resolve({
            status: response.statusCode ?? 0,
            milliseconds: Math.round(performance.now() - started),
            challenge: response.headers['www-authenticate'],
          });
        } catch (error) {
          reject(error);
        } finally {
          response.destroy();
          outgoing.destroy();
        }
      });
      outgoing.write(Buffer.alloc(1024, 32));
    },
  );
}

test('bounded parallel HTTP uploads reject unfinished anonymous and non-member bodies', async () => {
  const nonMember = await cookie(outsider);
  const routes = [
    ['profile-images/person', 'application/octet-stream'],
    ['map/object-form', 'multipart/form-data; boundary=synthetic'],
    ['map/object-form', 'application/json'],
    ['map/draft', 'application/json'],
  ];
  const results = [];
  // At most four open requests and 4096 submitted body bytes per batch.
  for (const batch of [routes.slice(0, 2), routes.slice(2)]) {
    const pending = batch.flatMap(([path, contentType]) =>
      ['', nonMember].map(async (value) => {
        const result = await unfinished(`/api/households/${householdId}/${path}`, {
          cookie: value,
          'content-type': contentType,
        });
        expect(result.status).toBe(value ? 403 : 401);
        return result;
      }),
    );
    const settled = await Promise.allSettled(pending);
    for (const result of settled) {
      if (result.status === 'rejected') throw result.reason;
      results.push(result.value);
    }
  }
  console.info(
    JSON.stringify({
      event: 'synthetic_upload_admission',
      requests: results.length,
      peakConcurrent: 4,
      submittedBodyBytes: results.length * 1024,
      responseMilliseconds: results.map((result) => result.milliseconds),
    }),
  );
});

async function connect() {
  const { code } = await (
    await owner.post(`${app.origin}/api/households/${householdId}/invitations`, {
      headers: { origin: app.origin },
      data: { userId: outsiderId },
    })
  ).json();
  expect(
    (
      await outsider.post(`${app.origin}/api/invitations/accept`, {
        headers: { origin: app.origin },
        data: { code },
      })
    ).status(),
  ).toBe(200);
  const flow = await beginAssistant(outsider, app.origin);
  const accepted = await flow.consent(householdId);
  expect(accepted.status()).toBe(200);
  const tokens = await flow.exchange((await accepted.json()).url);
  expect(tokens.status).toBe(200);
  const { access_token: token } = await tokens.json();
  const { connections } = await (await outsider.get(`${app.origin}/api/assistants/context`)).json();
  return { token: token as string, id: connections[0].id as string };
}

test.each(['absent', 'invalid', 'connection revoked', 'membership revoked'])(
  'MCP rejects unfinished HTTP bodies with %s authorization',
  async (state) => {
    let token = state === 'invalid' ? 'invalid' : '';
    if (state.endsWith('revoked')) {
      const connection = await connect();
      token = connection.token;
      const path =
        state === 'connection revoked'
          ? `/api/assistants/${connection.id}/revoke`
          : `/api/households/${householdId}/members/${outsiderId}/revoke`;
      expect(
        (
          await owner.post(`${app.origin}${path}`, {
            headers: { origin: app.origin },
            data: {},
          })
        ).status(),
      ).toBe(200);
    }
    const result = await unfinished('/mcp', token ? { authorization: `Bearer ${token}` } : {});
    expect(result.status).toBe(401);
    expect(result.challenge).toContain('oauth-protected-resource');
  },
);

test('authorized MCP accepts its exact streamed limit and rejects the next byte', async () => {
  const { token } = await connect();
  const message = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'read_map', arguments: {} },
  });
  for (const length of [2_000_000, 2_000_001]) {
    let offset = 0;
    const payload = Buffer.from(message.padEnd(length, ' '));
    const response = await fetch(`${app.origin}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: new ReadableStream({
        pull(controller) {
          controller.enqueue(payload.subarray(offset, offset + 64_000));
          offset += 64_000;
          if (offset >= payload.length) controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit);
    expect(response.status).toBe(length === 2_000_000 ? 200 : 413);
    if (response.ok) expect((await response.json()).result.isError).not.toBe(true);
    else await response.arrayBuffer();
  }
});
