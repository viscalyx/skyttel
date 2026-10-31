import { createInterface } from 'node:readline';
import { request } from '@playwright/test';
import { createHousehold, signIn } from '../tests/support/client.js';
import { prepareHouseholdTable } from '../tests/support/household-table.js';
import { createInstallation } from '../tests/support/installation.js';
import { prepareObjectSearch } from '../tests/support/object-search.js';
import { prepareTableDetailProposals } from '../tests/support/table-detail-proposals.js';

const installation = await createInstallation(undefined, {
  modelFetch: async () => Response.json({ output: [] }),
});
const client = await request.newContext();
let input: ReturnType<typeof createInterface> | undefined;
const stop = () => input?.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  if (process.argv.includes('--scroll')) {
    await signIn(client, installation.origin);
    const { user } = await (await client.get(`${installation.origin}/api/bootstrap`)).json();
    const { household } = await (await createHousehold(client, installation.origin)).json();
    installation.seedTableScrollMap(user.id, household.id);
  } else {
    await (process.argv.includes('--details')
      ? prepareTableDetailProposals
      : process.argv.includes('--search')
        ? prepareObjectSearch
        : prepareHouseholdTable)(client, installation.origin);
  }
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
