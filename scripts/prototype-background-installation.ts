// THROWAWAY fixture: real app and authentication; only Google's external response is synthetic.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
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
  const app = createApp({ config, database, auth });
  const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port });
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  attachTaskDelivery(server, config.origin, app.prepareTaskDelivery);
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
