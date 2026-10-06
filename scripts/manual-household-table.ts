import { createInterface } from 'node:readline';
import { request } from '@playwright/test';
import { prepareHouseholdTable } from '../tests/support/household-table.js';
import { createInstallation } from '../tests/support/installation.js';
import { prepareObjectSearch } from '../tests/support/object-search.js';

const installation = await createInstallation(undefined, {
  modelFetch: async () => Response.json({ output: [] }),
});
const client = await request.newContext();
let input: ReturnType<typeof createInterface> | undefined;
const stop = () => input?.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  await (process.argv.includes('--search') ? prepareObjectSearch : prepareHouseholdTable)(
    client,
    installation.origin,
  );
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  console.log(
    JSON.stringify({
      event: 'ready',
      origin: installation.origin,
      directory: installation.directory,
      message:
        'Sign in with Google as synthetic Alex Exempel. Open Tabell. Type quit to remove the disposable installation.',
    }),
  );
  for await (const line of input) if (line.trim() === 'quit') break;
} finally {
  await client.dispose();
  await installation.close();
  input?.close();
}
