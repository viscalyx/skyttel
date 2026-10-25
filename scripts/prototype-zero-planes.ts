// Throwaway real-app launcher. Synthetic identity and household in a temporary
// SQLite database; no configured credentials or real providers are used.
import { request } from '@playwright/test';
import { createServer } from 'vite';
import { createBackgroundMapFixture } from '../tests/support/background-map.js';
import { createInstallation } from '../tests/support/installation.js';
import { captureZeroPlaneDepth } from './capture-zero-plane-depth.prototype.js';
import { captureZeroPlanesPrototype } from './capture-zero-planes.prototype.js';

const vite = await createServer({
  server: { host: '127.0.0.1', port: 5179, strictPort: true, ws: { clientPort: 5179 } },
});
await vite.listen();
const app = await createInstallation(undefined, {
  deliverResponse: async (incoming, response) => {
    const url = new URL(incoming.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return response;
    // Serve the actual development client on the installation's canonical
    // origin, so existing authentication, API and WebSocket paths stay intact.
    return fetch(`http://127.0.0.1:5179${url.pathname}${url.search}`);
  },
});
const client = await request.newContext();
const count = process.argv.includes('--dense') ? 80 : 9;
const { household, path } = await createBackgroundMapFixture(
  client,
  app.origin,
  count,
  'appearance',
);
// Deliberately straddle all three zero planes, rather than letting a connected
// chain's automatic layout drift away from the shared origin.
const view = await (await client.get(`${path}/view`)).json();
for (let index = 0; index < count; index++) {
  const angle = index * 2.399963;
  const radius = count === 9 ? 10 : 8 + (index % 4) * 3;
  const result = await client.post(`${path}/view/position`, {
    headers: { origin: app.origin },
    data: {
      id: `background-${index}`,
      version: 0,
      contentVersion: view.contentVersion,
      position: {
        x: Math.cos(angle) * radius,
        y: ((index % 5) - 2) * 4,
        z: Math.sin(angle) * radius,
      },
    },
  });
  if (!result.ok()) throw new Error(`Could not arrange prototype positions: ${result.status()}`);
}
await client.dispose();
console.log(
  `\nPlane comparison (${count} objects): ${app.origin}/households/${household.id}?prototype-planes&plane-depth=tint`,
);
console.log('Use the Google sign-in buttons: this launcher substitutes a synthetic identity.');
console.log('After sign-in, reopen the comparison URL above if the query is lost.');
console.log('Comparison starts with circle + subtle; A/B depth choice is in the URL.');
console.log('Ctrl+C stops the prototype and deletes its disposable database.');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await vite.close();
  await app.close();
}
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
if (process.argv.includes('--capture') || process.argv.includes('--capture-depth')) {
  try {
    if (process.argv.includes('--capture-depth'))
      await captureZeroPlaneDepth(app.origin, household.id);
    else await captureZeroPlanesPrototype(app.origin, household.id, count);
    await stop();
  } catch (error) {
    console.error(error);
    await stop();
    process.exitCode = 1;
  }
}
