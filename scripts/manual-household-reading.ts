import { createInterface } from 'node:readline';
import { request } from '@playwright/test';
import { prepareHouseholdReading } from '../tests/support/household-reading.js';
import { createInstallation } from '../tests/support/installation.js';

const installation = await createInstallation(undefined, {
  modelFetch: async () => Response.json({ output: [] }),
});
const client = await request.newContext();
let input: ReturnType<typeof createInterface> | undefined;
const stop = () => input?.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  await prepareHouseholdReading(client, installation.origin);
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  console.log(
    JSON.stringify({
      event: 'ready',
      origin: installation.origin,
      directory: installation.directory,
      message:
        'Sign in with Google as synthetic Alex Exempel. Open Tabell, page 2, and Samband för Alex. Type quit to remove the disposable installation.',
    }),
  );
  for await (const line of input) if (line.trim() === 'quit') break;
} finally {
  await client.dispose();
  await installation.close();
  input?.close();
}
