import { createInterface } from 'node:readline';
import { request } from '@playwright/test';
import { createInstallation } from '../tests/support/installation.js';
import { prepareMapExploration } from '../tests/support/map-exploration.js';

const installation = await createInstallation();
const client = await request.newContext();
let input: ReturnType<typeof createInterface> | undefined;
const stop = () => input?.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  const variant = process.argv.includes('--ended')
    ? 'ended'
    : process.argv.includes('--removed')
      ? 'removed'
      : 'base';
  await prepareMapExploration(client, installation.origin, variant);
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  console.log(
    JSON.stringify({
      event: 'ready',
      origin: installation.origin,
      directory: installation.directory,
      message:
        'Sign in with Google as synthetic Alex Exempel. Type quit to remove the disposable installation.',
    }),
  );
  for await (const line of input) if (line.trim() === 'quit') break;
} finally {
  await client.dispose();
  await installation.close();
  input?.close();
}
