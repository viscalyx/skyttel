import { createHash, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { beginAssistant, callAssistant } from '../support/assistant.js';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';

test('AI-03: medgivandet kräver val av hushåll och AI-behandling', async ({ page }) => {
  const app = await createInstallation();
  try {
    await signIn(page.request, app.origin);
    const { household } = await (await createHousehold(page.request, app.origin)).json();
    const flow = await beginAssistant(page.request, app.origin);
    await page.goto(flow.consentUrl.href);
    await expect(page.getByRole('heading', { name: 'Anslut extern assistent' })).toBeVisible();
    await expect(page.getByText(/Inloggad som Alex Exempel/)).toBeVisible();
    await expect(page.getByText(/Databasen i EU garanterar inte/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Godkänn läsåtkomst' })).toBeDisabled();
    await page.getByLabel('Välj hushåll').selectOption(household.id);
    await expect(page.getByRole('button', { name: 'Godkänn läsåtkomst' })).toBeDisabled();
    await page.getByRole('checkbox').check();
    const callback = page.waitForRequest('http://127.0.0.1:7777/callback**');
    await page.route('http://127.0.0.1:7777/callback**', (route) =>
      route.fulfill({ body: 'Påhittad klient' }),
    );
    await page.getByRole('button', { name: 'Godkänn läsåtkomst' }).click();
    const tokens = await flow.exchange((await callback).url());
    expect(tokens.status, await tokens.clone().text()).toBe(200);
    const { access_token } = await tokens.json();
    expect((await callAssistant(app.origin, access_token, 'read_map')).status).toBe(200);
    await page.goto(`${app.origin}/assistants`);
    await page
      .getByRole('button', { name: 'Återkalla anslutning för Påhittad textassistent' })
      .click();
    await expect(page.getByText('Inga aktiva assistentanslutningar.')).toBeVisible();
    expect((await callAssistant(app.origin, access_token, 'read_map')).status).toBe(401);
    await page.getByRole('link', { name: 'Till kartan' }).click();
    await expect(page.getByRole('button', { name: 'Nytt objekt', exact: true })).toBeVisible();
  } finally {
    await app.close();
  }
});

test('AI-02: uttryckligt AI-val ger läsning och återkallelse stoppar gamla token', async ({
  request,
}) => {
  const app = await createInstallation();
  try {
    await signIn(request, app.origin);
    const { household } = await (await createHousehold(request, app.origin)).json();
    const registered = await request.post(`${app.origin}/api/auth/oauth2/register`, {
      headers: { origin: app.origin },
      data: {
        application_type: 'native',
        client_name: 'Påhittad textassistent',
        redirect_uris: ['http://127.0.0.1:7777/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'skyttel:read offline_access',
      },
    });
    expect(registered.status(), await registered.text()).toBe(201);
    const { client_id } = await registered.json();
    const verifier = randomBytes(32).toString('base64url');
    const query = new URLSearchParams({
      client_id,
      response_type: 'code',
      redirect_uri: 'http://127.0.0.1:7777/callback',
      scope: 'skyttel:read offline_access',
      resource: `${app.origin}/mcp`,
      state: 'fictional-state',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    const authorization = await request.get(`${app.origin}/api/auth/oauth2/authorize?${query}`, {
      maxRedirects: 0,
    });
    expect(authorization.status()).toBe(302);
    const consentUrl = new URL(authorization.headers().location, app.origin);
    const oauth_query = consentUrl.search.slice(1);
    const denied = await request.post(`${app.origin}/api/assistants/consent`, {
      headers: { origin: app.origin },
      data: {
        accept: true,
        externalAi: false,
        householdId: household.id,
        oauth_query,
      },
    });
    expect(denied.status()).toBe(403);
    const consent = await request.post(`${app.origin}/api/assistants/consent`, {
      headers: { origin: app.origin },
      data: {
        accept: true,
        externalAi: true,
        householdId: household.id,
        oauth_query,
      },
    });
    expect(consent.status(), await consent.text()).toBe(200);
    const callback = new URL((await consent.json()).url);
    expect(callback.searchParams.get('state')).toBe('fictional-state');
    const token = await request.post(`${app.origin}/api/auth/oauth2/token`, {
      headers: { origin: app.origin },
      form: {
        grant_type: 'authorization_code',
        client_id,
        code: callback.searchParams.get('code') ?? '',
        redirect_uri: 'http://127.0.0.1:7777/callback',
        code_verifier: verifier,
        resource: `${app.origin}/mcp`,
      },
    });
    expect(token.status(), await token.text()).toBe(200);
    const { access_token } = await token.json();
    const headers = {
      authorization: `Bearer ${access_token}`,
      accept: 'application/json, text/event-stream',
    };
    const tools = await request.post(`${app.origin}/mcp`, {
      headers,
      data: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    expect(tools.status(), await tools.text()).toBe(200);
    expect((await tools.json()).result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'read_map',
      'read_my_draft',
    ]);
    const read = await request.post(`${app.origin}/mcp`, {
      headers,
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'read_map', arguments: {} },
      },
    });
    expect(read.status(), await read.text()).toBe(200);
    expect(JSON.parse((await read.json()).result.content[0].text)).toMatchObject({ objects: [] });
    const { connections } = await (
      await request.get(`${app.origin}/api/assistants/context`)
    ).json();
    expect(connections).toHaveLength(1);
    expect(
      (
        await request.post(`${app.origin}/api/assistants/${connections[0].id}/revoke`, {
          headers: { origin: app.origin },
          data: {},
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.post(`${app.origin}/mcp`, {
          headers,
          data: { jsonrpc: '2.0', id: 3, method: 'tools/list' },
        })
      ).status(),
    ).toBe(401);
  } finally {
    await app.close();
  }
});

test('AI-01: OAuth krävs innan assistenten kan läsa kartan', async ({ request }) => {
  const app = await createInstallation();
  try {
    const denied = await request.post(`${app.origin}/mcp`, {
      data: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    expect(denied.status()).toBe(401);
    expect(denied.headers()['www-authenticate']).toContain('/.well-known/oauth-protected-resource');
    const resource = await request.get(`${app.origin}/.well-known/oauth-protected-resource`);
    expect(await resource.json()).toMatchObject({
      resource: `${app.origin}/mcp`,
      authorization_servers: [`${app.origin}/api/auth`],
      scopes_supported: ['skyttel:read'],
    });
  } finally {
    await app.close();
  }
});

test('AI-04: inloggning följs av medgivande och ett nej bevarar kartarbete', async ({
  page,
  request,
}) => {
  const app = await createInstallation();
  try {
    await signIn(request, app.origin);
    await createHousehold(request, app.origin);
    const flow = await beginAssistant(page.request, app.origin);
    await page.goto(flow.consentUrl.href);
    await page.getByRole('button', { name: 'Fortsätt med Google' }).click();
    await expect(page.getByRole('heading', { name: 'Anslut extern assistent' })).toBeVisible();
    await page.route('http://127.0.0.1:7777/callback**', (route) =>
      route.fulfill({ body: 'Påhittad klient' }),
    );
    const callback = page.waitForRequest('http://127.0.0.1:7777/callback**');
    await page.getByRole('button', { name: 'Nej, anslut inte' }).click();
    expect(new URL((await callback).url()).searchParams.get('error')).toBe('access_denied');
    await page.goto(`${app.origin}/assistants`);
    await expect(page.getByText('Inga aktiva assistentanslutningar.')).toBeVisible();
    await page.getByRole('link', { name: 'Till kartan' }).click();
    await expect(page.getByRole('button', { name: 'Nytt objekt', exact: true })).toBeVisible();
  } finally {
    await app.close();
  }
});

test('AI-05: eget utkast förblir privat och återkallad åtkomst stoppar klienten', async ({
  request,
  browser,
}) => {
  const app = await createInstallation();
  const other = await browser.newContext();
  try {
    await signIn(request, app.origin);
    const { household } = await (await createHousehold(request, app.origin)).json();
    app.setIdentity(robin);
    await signIn(other.request, app.origin, 'microsoft');
    const { user } = await (await other.request.get(`${app.origin}/api/bootstrap`)).json();
    const headers = { origin: app.origin };
    const base = `${app.origin}/api/households/${household.id}`;
    const { code } = await (
      await request.post(`${base}/invitations`, { headers, data: { userId: user.id } })
    ).json();
    await other.request.post(`${app.origin}/api/invitations/accept`, { headers, data: { code } });
    const map = await (await request.get(`${base}/map`)).json();
    for (const [actor, id, name] of [
      [request, 'alex-private', 'Alex privata förslag'],
      [other.request, 'robin-private', 'Robins privata förslag'],
    ] as const) {
      expect(
        (
          await actor.post(`${base}/map/draft`, {
            headers,
            data: {
              version: 0,
              id,
              baseRevision: null,
              value: { typeId: map.types[0].id, name, description: '' },
            },
          })
        ).status(),
      ).toBe(200);
    }
    app.seedMembership(user.id, 'other-household', 'Hushållet Eken');
    const flow = await beginAssistant(other.request, app.origin);
    const consent = await flow.consent(household.id);
    const { access_token } = await (await flow.exchange((await consent.json()).url)).json();
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/streamableHttp.js'
    );
    const client = new Client({ name: 'Påhittad textassistent', version: '1' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${app.origin}/mcp`), {
        requestInit: { headers: { authorization: `Bearer ${access_token}` } },
      }),
    );
    try {
      const draft = await client.callTool({ name: 'read_my_draft', arguments: {} });
      expect(JSON.stringify(draft)).toContain('Robins privata förslag');
      expect(JSON.stringify(draft)).not.toContain('Alex privata');
      const denied = await client.callTool({
        name: 'read_map',
        arguments: { householdId: 'other-household' },
      });
      expect(denied.isError).toBe(true);
      expect(JSON.stringify(denied)).not.toContain('Hushållet Eken');
      expect(
        (await request.post(`${base}/members/${user.id}/revoke`, { headers, data: {} })).status(),
      ).toBe(200);
      await expect(client.callTool({ name: 'read_my_draft', arguments: {} })).rejects.toThrow();
    } finally {
      await client.close();
    }
  } finally {
    await other.close();
    await app.close();
  }
});
