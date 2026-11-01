import { createHash } from 'node:crypto';
import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { beginAssistant } from '../../support/assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { createInstallation } from '../../support/installation.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let browser: APIRequestContext;
let householdId: string;
beforeEach(async () => {
  app = await createInstallation();
  browser = await request.newContext();
  await signIn(browser, app.origin);
  ({
    household: { id: householdId },
  } = await (await createHousehold(browser, app.origin)).json());
});
afterEach(async () => {
  await browser.dispose();
  await app.close();
});

async function authorization() {
  const flow = await beginAssistant(browser, app.origin);
  const query = new URL(flow.authorizeUrl).searchParams;
  const verifier = 'synthetic-proof-key-for-oauth-parameter-regressions';
  query.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
  query.set('prompt', 'consent');
  return { query, verifier };
}

async function codeExchange() {
  const { query, verifier } = await authorization();
  const authorized = await browser.get(`${app.origin}/api/auth/oauth2/authorize?${query}`, {
    maxRedirects: 0,
  });
  expect(authorized.status()).toBe(302);
  const consent = await browser.post(`${app.origin}/api/assistants/consent`, {
    headers: { origin: app.origin },
    data: {
      accept: true,
      externalAi: true,
      householdId,
      oauth_query: new URL(authorized.headers().location, app.origin).search.slice(1),
    },
  });
  expect(consent.status()).toBe(200);
  return new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: query.get('client_id') ?? '',
    code: new URL((await consent.json()).url).searchParams.get('code') ?? '',
    code_verifier: verifier,
    redirect_uri: query.get('redirect_uri') ?? '',
    resource: `${app.origin}/mcp`,
  });
}

function token(body: URLSearchParams | string) {
  return fetch(`${app.origin}/api/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: body.toString(),
  });
}

test('duplicate token callbacks are rejected before consuming the authorization code', async () => {
  const valid = await codeExchange();
  const duplicate = new URLSearchParams(valid);
  duplicate.append('redirect_uri', valid.get('redirect_uri') ?? '');
  const rejected = await token(duplicate);
  expect(rejected.status).toBe(400);
  expect(await rejected.json()).toEqual({ error: 'invalid_request' });
  const accepted = await token(valid);
  expect(accepted.status).toBe(200);
  expect(await accepted.json()).toHaveProperty('access_token');
});

test.each(['GET', 'POST'])(
  'duplicate authorization prompts are rejected before normalization (%s)',
  async (method) => {
    const { query } = await authorization();
    query.append('prompt', 'consent');
    const response = await authorize(method, query.toString());
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    expect(response.headers()).not.toHaveProperty('location');
    expect(
      (await (await browser.get(`${app.origin}/api/assistants/context`)).json()).connections,
    ).toEqual([]);
  },
);

function duplicateVariants(valid: URLSearchParams, name: string, value: string) {
  const original = new URLSearchParams(valid);
  original.set(name, value);
  const identical = new URLSearchParams(original);
  identical.append(name, value);
  const invalidLast = new URLSearchParams(original);
  invalidLast.append(name, 'invalid');
  const invalidFirst = new URLSearchParams(valid);
  invalidFirst.set(name, 'invalid');
  invalidFirst.append(name, value);
  // Decode names before counting: the encoded spelling is the same field.
  const encodedName = `%${name.charCodeAt(0).toString(16)}${name.slice(1)}`;
  return [
    identical.toString(),
    invalidFirst.toString(),
    invalidLast.toString(),
    `${original}&${encodedName}=${encodeURIComponent(value)}`,
  ];
}

const tokenFields = [
  'grant_type',
  'client_id',
  'client_secret',
  'client_assertion',
  'client_assertion_type',
  'code',
  'code_verifier',
  'redirect_uri',
  'refresh_token',
  'scope',
];

test.each(tokenFields)(
  'token singleton %s rejects every duplicate without consuming the code',
  async (name) => {
    const valid = await codeExchange();
    for (const malformed of duplicateVariants(valid, name, valid.get(name) ?? 'synthetic-value')) {
      const response = await token(malformed);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_request' });
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('location')).toBeNull();
    }
    const response = await token(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('access_token');
    expect((await token(valid)).status).toBe(400);
  },
);

test.each(tokenFields)(
  'refresh singleton %s rejects every duplicate without rotating the refresh token',
  async (name) => {
    const exchange = await codeExchange();
    const issued = await token(exchange);
    expect(issued.status).toBe(200);
    const { refresh_token } = await issued.json();
    expect(refresh_token).toBeTypeOf('string');
    const valid = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: exchange.get('client_id') ?? '',
      refresh_token,
      scope: 'skyttel:read',
      resource: `${app.origin}/mcp`,
    });
    for (const malformed of duplicateVariants(valid, name, valid.get(name) ?? 'synthetic-value')) {
      const response = await token(malformed);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_request' });
    }
    const response = await token(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      access_token: expect.any(String),
      scope: 'skyttel:read',
    });
  },
);

const authorizationFields = [
  'client_id',
  'redirect_uri',
  'scope',
  'response_type',
  'response_mode',
  'state',
  'prompt',
  'code_challenge',
  'code_challenge_method',
  'request',
  'request_uri',
  'display',
  'ui_locales',
  'max_age',
  'acr_values',
  'login_hint',
  'id_token_hint',
  'nonce',
  'claims',
  'dpop_jkt',
];

async function authorize(method: string, parameters: string) {
  return browser.fetch(
    `${app.origin}/api/auth/oauth2/authorize${method === 'GET' ? `?${parameters}` : ''}`,
    {
      method,
      maxRedirects: 0,
      ...(method === 'POST'
        ? {
            headers: {
              origin: app.origin,
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: parameters,
          }
        : {}),
    },
  );
}

for (const method of ['GET', 'POST']) {
  test.each(authorizationFields)(
    `${method} authorization singleton %s rejects duplicates without redirect or consent`,
    async (name) => {
      const { query } = await authorization();
      for (const malformed of duplicateVariants(
        query,
        name,
        query.get(name) ?? 'synthetic-value',
      )) {
        const response = await authorize(method, malformed);
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({ error: 'invalid_request' });
        expect(response.headers()).not.toHaveProperty('location');
      }
      expect(
        (await (await browser.get(`${app.origin}/api/assistants/context`)).json()).connections,
      ).toEqual([]);
      const valid = await authorize(method, query.toString());
      expect(valid.status()).toBe(302);
      const consentUrl = new URL(valid.headers().location, app.origin);
      expect(consentUrl.pathname).toBe('/assistant-consent');
      expect(consentUrl.searchParams.has('code')).toBe(false);
    },
  );

  test(`${method} authorization preserves repeated resources and unknown extension handling`, async () => {
    const { query } = await authorization();
    query.append('resource', `${app.origin}/mcp`);
    query.append('future_extension', 'first');
    query.append('future_extension', 'second');
    const response = await authorize(method, query.toString());
    expect(response.status()).toBe(302);
    const consentUrl = new URL(response.headers().location, app.origin);
    expect(consentUrl.pathname).toBe('/assistant-consent');
    expect(new Set(consentUrl.searchParams.getAll('resource'))).toEqual(
      new Set([`${app.origin}/mcp`]),
    );
    const accepted = await browser.post(`${app.origin}/api/assistants/consent`, {
      headers: { origin: app.origin },
      data: {
        accept: true,
        externalAi: true,
        householdId,
        oauth_query: consentUrl.search.slice(1),
      },
    });
    expect(accepted.status()).toBe(200);
    for (const values of [
      [`${app.origin}/mcp`, 'https://untrusted.example.test/mcp'],
      ['https://untrusted.example.test/mcp', `${app.origin}/mcp`],
    ]) {
      const denied = new URLSearchParams(query);
      denied.delete('resource');
      for (const value of values) denied.append('resource', value);
      const response = await authorize(method, denied.toString());
      if (method === 'POST') {
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({ error: 'invalid_target' });
        expect(response.headers()).not.toHaveProperty('location');
      } else {
        const location = new URL(response.headers().location, app.origin);
        expect(location.searchParams.get('error')).toBe('invalid_target');
        expect(location.searchParams.has('code')).toBe(false);
      }
    }
  });
}

test('token exchange preserves repeated resources and unknown extension handling', async () => {
  const valid = await codeExchange();
  valid.append('resource', `${app.origin}/mcp`);
  valid.append('future_extension', 'first');
  valid.append('future_extension', 'second');
  const response = await token(valid);
  expect(response.status).toBe(200);
  expect(await response.json()).toHaveProperty('access_token');
});

test.each(['first', 'last'])(
  'token exchange rejects an unauthorized resource in the %s position',
  async (position) => {
    const valid = await codeExchange();
    valid.delete('resource');
    const resources = [`${app.origin}/mcp`, 'https://untrusted.example.test/mcp'];
    if (position === 'first') resources.reverse();
    for (const resource of resources) valid.append('resource', resource);
    const response = await token(valid);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid_target' });
  },
);
