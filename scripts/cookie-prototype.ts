// THROWAWAY. Actual App + actual server against a disposable synthetic household.
// OAuth uses the repository's synthetic provider. No model or voice credentials.
import { request } from '@playwright/test';
import { createServer } from 'vite';
import { createInstallation } from '../tests/support/installation.js';

const installation = await createInstallation();
installation.seedDemo();
const client = await request.newContext({ baseURL: installation.origin });
const signIn = await client.post('/api/auth/sign-in/social', {
  headers: { origin: installation.origin },
  data: { provider: 'google', callbackURL: '/' },
});
const { url } = await signIn.json();
await client.get(url);
const state = await client.storageState();
const cookie = state.cookies.map((item) => `${item.name}=${item.value}`).join('; ');
await client.dispose();

// Keep the fixture session on this local proxy, never expose it in a URL or log.
const server = await createServer({
  server: {
    host: '127.0.0.1',
    port: 5416,
    strictPort: true,
    proxy: {
      '/api': { target: installation.origin, changeOrigin: true, headers: { cookie } },
      '/healthz': { target: installation.origin, changeOrigin: true },
    },
  },
});
await server.listen();
console.log('Prototyp D i Skyttel: http://localhost:5416/');
console.log('Eget tillfälligt testhushåll. Cookieval simuleras; inga externa AI-anrop.');
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await server.close();
  await installation.close();
  process.exit(0);
}
process.once('SIGINT', () => {
  void close();
});
process.once('SIGTERM', () => {
  void close();
});
