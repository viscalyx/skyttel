import { createInterface } from 'node:readline';
import { request } from '@playwright/test';
import { prepareDraftReview } from '../tests/support/draft-review.js';
import { createInstallation } from '../tests/support/installation.js';
import { modelMessage, textModel } from '../tests/support/text-model.js';

const installation = await createInstallation(
  undefined,
  process.argv.includes('--with-model')
    ? {
        modelFetch: textModel(() => [modelMessage('Ett provsvar.')]).provider,
      }
    : {},
);
const client = await request.newContext();
let input: ReturnType<typeof createInterface> | undefined;
const stop = () => input?.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  const { household, post } = await prepareDraftReview(client, installation.origin);
  if (process.argv.includes('--empty')) await post('discard', {});
  input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  console.log(
    JSON.stringify({
      origin: installation.origin,
      householdId: household.id,
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
