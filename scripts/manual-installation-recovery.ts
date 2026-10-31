import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { alex, robin } from '../tests/support/installation.js';
import {
  prepareInstallationRecovery,
  recoveryIdentity,
} from '../tests/support/installation-recovery.js';

const { values } = parseArgs({ options: { 'new-administrator': { type: 'boolean' } } });
const { installation } = await prepareInstallationRecovery(values['new-administrator']);
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
process.once('SIGINT', () => input.close());
process.once('SIGTERM', () => input.close());
console.log(JSON.stringify({ origin: installation.origin }));
console.log('owner | member | recovery | restart | quit');
try {
  for await (const line of input) {
    const command = line.trim();
    if (command === 'quit') break;
    if (command === 'owner') installation.setIdentity(alex);
    if (command === 'member') installation.setIdentity(robin);
    if (command === 'recovery')
      installation.setIdentity(values['new-administrator'] ? recoveryIdentity : alex);
    if (command === 'restart') await installation.restart();
  }
} finally {
  await installation.close();
}
