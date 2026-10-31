import type Database from 'better-sqlite3';
import { Hono } from 'hono';
import type { Auth } from './auth.js';
import { completeRecovery, readRecovery } from './installation-recovery.js';

export function installationRecoveryRoutes(
  database: Database.Database,
  auth: Auth,
  origin: string,
) {
  const routes = new Hono<{ Variables: { sessionId: string } }>();
  routes.use('*', async (context, next) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers });
    if (!session) return context.json({ error: 'unauthenticated' }, 401);
    context.set('sessionId', session.session.id);
    if (context.req.method !== 'GET' && context.req.header('Origin') !== origin)
      return context.json({ error: 'forbidden' }, 403);
    await next();
  });
  routes.get('/', (context) => context.json(readRecovery(database, context.get('sessionId'))));
  routes.post('/complete', async (context) => {
    if (
      context.req.header('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !==
      'application/json'
    )
      return context.json({ error: 'invalid_request' }, 400);
    return context.json(
      completeRecovery(
        database,
        context.get('sessionId'),
        await context.req.json().catch(() => null),
      ),
    );
  });
  return routes;
}
