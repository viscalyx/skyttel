// THROWAWAY: one-command Vite preview with a disposable, synthetic household.
// No private environment file, real identity provider, or billable provider calls.
import { request } from '@playwright/test';
import { createServer } from 'vite';
import type { MapState } from '../src/shared/map.js';
import { createHousehold, signIn } from '../tests/support/client.js';
import { createInstallation } from '../tests/support/installation.js';

const installation = await createInstallation();
const client = await request.newContext();
await signIn(client, installation.origin);
const { household } = await (
  await createHousehold(client, installation.origin, 'Familjen Linden · filterprototyp')
).json();
const path = `${installation.origin}/api/households/${household.id}/map`;
const read = async (): Promise<MapState> => (await client.get(path)).json();
async function post(route: string, body: object) {
  const state = await read();
  const response = await client.post(`${path}/${route}`, {
    headers: { origin: installation.origin },
    data: { version: state.draft.version, contentVersion: state.contentVersion, ...body },
  });
  if (!response.ok()) throw new Error(await response.text());
}
// A small connected household with varied types and all three proposal states.
const initial = await read();
const subscriptionType = initial.types.find((type) => type.name === 'Abonnemang');
for (const [id, type, name] of [
  ['alex', 'Person', 'Alex Exempel'],
  ['lo', 'Person', 'Lo Exempel'],
  ['bike', 'Fordon', 'Alex blå cykel'],
  ['car', 'Fordon', 'Familjens bil'],
  ['garage', 'Garage', 'Familjens garage'],
  ['home', 'Bostad', 'Lägenheten på Linden'],
  ['music', 'Tjänst', 'Molnmusik'],
  ['subscription', 'Abonnemang', 'Familjens Molnmusik'],
  ['phone', 'Abonnemang', 'Alex mobilabonnemang'],
  ['account', 'Tjänstekonto', 'Familjens musikkonto'],
  ['bank', 'Bankkonto', 'Hushållets betalkonto'],
  ['card', 'Kort', 'Familjens musikkort'],
  ['email', 'E-postadress', 'familjen@example.test'],
  ['company', 'Företag', 'Molnmusik AB'],
  ['association', 'Förening', 'Lindens musikförening'],
  ['rent', 'Hyresavtal', 'Hyresavtal för lägenheten'],
]) {
  await post('draft', {
    id,
    baseRevision: null,
    value: { name, description: '', typeId: initial.types.find((item) => item.name === type)?.id },
  });
}
for (const [id, sourceId, targetId, type] of [
  ['alex-bike', 'bike', 'alex', 'Äger'],
  ['lo-music', 'lo', 'music', 'Använder'],
  ['alex-account', 'account', 'alex', 'Äger'],
  ['subscription-service', 'subscription', 'music', 'Tillhör tjänsten'],
  ['account-service', 'account', 'music', 'Tillhör tjänsten'],
  ['company-service', 'company', 'music', 'Erbjuder'],
]) {
  await post('relationship', {
    id,
    baseRevision: null,
    value: {
      sourceId,
      targetId,
      knowledge: 'known',
      typeId: initial.relationshipTypes.find((item) => item.name === type)?.id,
    },
  });
}
await post('draft', {
  id: 'prototype-ended',
  baseRevision: null,
  value: {
    name: 'Tidigare mobilabonnemang',
    description: '',
    typeId: subscriptionType?.id,
    lifecycle: 'ended',
  },
});
await post('save', { operationId: 'prototype-examples' });
const saved = await read();
const person = saved.objects.find((object) => object.name === 'Alex Exempel');
const card = saved.objects.find((object) => object.name === 'Familjens musikkort');
if (person)
  await post('draft', {
    id: person.id,
    baseRevision: person.revision,
    value: { ...person, description: 'En ändring i ditt utkast.' },
  });
if (card) await post('draft', { id: card.id, baseRevision: card.revision, value: null });
await post('draft', {
  id: 'prototype-new',
  baseRevision: null,
  value: { name: 'Familjens nya mobilabonnemang', description: '', typeId: subscriptionType?.id },
});
const { cookies } = await client.storageState();
const vite = await createServer({
  plugins: [
    {
      name: 'throwaway-filter-session',
      configureServer(server) {
        // Bootstrap the synthetic session before Vite's normal HTML fallback.
        server.middlewares.use((incoming, response, next) => {
          if (incoming.url !== '/prototype-start') return next();
          response.setHeader(
            'Set-Cookie',
            cookies.map(
              (cookie) => `${cookie.name}=${cookie.value}; Path=/; HttpOnly; SameSite=Lax`,
            ),
          );
          response.writeHead(302, { Location: `/households/${household.id}?variant=A` });
          response.end();
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: false,
    proxy: {
      '/api': {
        target: installation.origin,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest) =>
            proxyRequest.setHeader('origin', installation.origin),
          );
        },
      },
      '/healthz': installation.origin,
    },
  },
});
await vite.listen();
console.log(`\nFilterprototyper: ${vite.resolvedUrls?.local[0]}prototype-start`);
console.log('A–E: byt med panelen längst ned eller ← →. Ctrl+C tar bort exempelinstallationen.\n');
let stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  await vite.close();
  await client.dispose();
  await installation.close();
  process.exit(0);
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
