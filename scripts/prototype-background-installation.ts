// THROWAWAY fixture: real app and authentication; only Google's external response is synthetic.

import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { createCookieGetter, getCookies } from 'better-auth/cookies';
import { createApp } from '../src/server/app.js';
import { createAuth, verifyAuthSchema } from '../src/server/auth.js';
import type { Config } from '../src/server/config.js';
import { openDatabase } from '../src/server/database.js';
import { attachTaskDelivery } from '../src/server/task-delivery-transport.js';

export async function prototypeBackgroundInstallation() {
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-background-prototype-'));
  const config: Config = {
    origin: 'http://localhost:5187',
    host: '127.0.0.1',
    port: 5187,
    databasePath: join(directory, 'skyttel.db'),
    firstAdmin: { provider: 'google', subject: 'alex-google' },
    authSecret: 'synthetic-background-prototype-secret-32-characters',
    authorityFence: { generation: '11111111-1111-4111-8111-111111111111' },
    google: { clientId: 'fake-google', clientSecret: 'fake-secret' },
    microsoft: { clientId: 'fake-microsoft', clientSecret: 'fake-secret' },
  };
  const database = openDatabase(config.databasePath);
  const auth = createAuth(config, database);
  await verifyAuthSchema(auth);
  const context = await auth.$context;
  // Each disposable database owns fresh cookies. Other localhost installations
  // and earlier prototype runs must never supply or lose their login keys here.
  const cookiePrefix = `skyttel_background_${randomBytes(8).toString('hex')}`;
  Object.assign(context.options.advanced, {
    cookiePrefix: `${cookiePrefix}.better-auth`,
  });
  context.authCookies = getCookies(context.options);
  context.createAuthCookie = createCookieGetter(context.options);
  const bindingCookie = `${cookiePrefix}_binding`;
  for (const provider of context.socialProviders) {
    provider.createAuthorizationURL = async ({ state, redirectURI }) => {
      const callback = new URL(redirectURI);
      callback.searchParams.set('state', state);
      callback.searchParams.set('code', 'synthetic-authorization-code');
      return callback;
    };
    provider.validateAuthorizationCode = async () => ({
      accessToken: 'synthetic-provider-token',
      tokenType: 'bearer',
    });
    provider.getUserInfo = async () => {
      const profile = {
        sub: 'alex-google',
        oid: 'alex-google',
        name: 'Alex Exempel',
        email: 'alex@example.test',
        email_verified: true,
      };
      const mapped = await provider.options?.mapProfileToUser?.(profile);
      return {
        user: { name: profile.name, email: profile.email, emailVerified: true, ...mapped },
        data: profile,
      };
    };
  }
  function prototypeRequest(request: Request) {
    const headers = new Headers(request.headers);
    const cookies = (headers.get('cookie') ?? '')
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item && !item.startsWith('skyttel_binding='))
      .map((item) =>
        item.startsWith(`${bindingCookie}=`)
          ? `skyttel_binding=${item.slice(bindingCookie.length + 1)}`
          : item,
      );
    headers.set('cookie', cookies.join('; '));
    return new Request(request, { headers });
  }
  const app = createApp({ config, database, auth });
  const server = serve({
    fetch: async (request) => {
      const url = new URL(request.url);
      // Enter through the canonical origin before the browser creates any
      // cookies. The real app correctly rejects a different origin at login.
      if (
        (request.method === 'GET' || request.method === 'HEAD') &&
        !url.pathname.startsWith('/api/') &&
        url.origin !== config.origin &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
        url.port === String(config.port)
      ) {
        const destination = new URL(config.origin);
        destination.pathname = url.pathname;
        destination.search = url.search;
        return Response.redirect(destination, 307);
      }
      // Adapt only this throwaway installation's cookie names at its boundary.
      // The ordinary binding protocol, origin checks and session policy remain.
      const response = await app.fetch(prototypeRequest(request));
      if (
        url.pathname.startsWith('/api/browser-binding/') &&
        response.headers.get('content-type')?.includes('application/json')
      ) {
        const body = (await response.json()) as Record<string, unknown>;
        if (body.cookieName === 'skyttel_binding') body.cookieName = bindingCookie;
        const output = new Headers(response.headers);
        output.delete('content-length');
        return new Response(JSON.stringify(body), { status: response.status, headers: output });
      }
      if (response.headers.get('content-type')?.includes('text/html')) {
        const html = (await response.text()).replace(
          '<head>',
          `<head><meta name="skyttel-background-cookie-prefix" content="${cookiePrefix}">`,
        );
        const output = new Headers(response.headers);
        output.delete('content-length');
        output.delete('etag');
        output.delete('last-modified');
        return new Response(html, { status: response.status, headers: output });
      }
      return response;
    },
    hostname: config.host,
    port: config.port,
  });
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  attachTaskDelivery(server, config.origin, (request) =>
    app.prepareTaskDelivery(prototypeRequest(request)),
  );
  return {
    directory,
    config,
    database,
    async close() {
      await app.close();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        if ('closeIdleConnections' in server) server.closeIdleConnections();
      });
      database.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
