import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { alex, createInstallation, robin } from '../tests/support/installation.js';

const { values } = parseArgs({ options: { microsoft: { type: 'boolean' } } });
const provider = values.microsoft ? 'microsoft' : 'google';
const identity = values.microsoft ? robin : alex;
const installation = await createInstallation({ provider, subject: identity.subject });
installation.setIdentity(identity);
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
process.once('SIGINT', () => input.close());
process.once('SIGTERM', () => input.close());
try {
  console.log(
    JSON.stringify({
      event: 'ready',
      origin: installation.origin,
      directory: installation.directory,
      provider,
    }),
  );
  console.log('provider-down | provider-up | deny-consent | allow-consent | restart | quit');
  for await (const line of input) {
    const command = line.trim();
    if (command === 'quit') break;
    if (command === 'provider-down') installation.failProvider(true);
    else if (command === 'provider-up') installation.failProvider(false);
    else if (command === 'deny-consent') installation.denyConsent(true);
    else if (command === 'allow-consent') installation.denyConsent(false);
    else if (command === 'restart') await installation.restart();
    else {
      console.log('Unknown command.');
      continue;
    }
    console.log(JSON.stringify({ event: 'configured', command }));
  }
} finally {
  input.close();
  await installation.close();
  console.log(JSON.stringify({ event: 'closed', directory: installation.directory }));
}
