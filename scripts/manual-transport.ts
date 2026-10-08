import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createManualTransport } from './manual-transport-control.js';

const { values } = parseArgs({
  options: {
    origin: { type: 'string' },
    upstream: { type: 'string' },
    household: { type: 'string' },
    port: { type: 'string', default: '4318' },
  },
});
if (!values.origin || !values.upstream || !values.household)
  throw new Error(
    'Supply --origin HTTPS_ORIGIN --upstream LOOPBACK_HTTP_ORIGIN --household TEST_HOUSEHOLD_ID [--port 4318].',
  );
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid loopback port.');
const transport = await createManualTransport({
  publicOrigin: values.origin,
  upstreamOrigin: values.upstream,
  householdId: values.household,
  port,
  report: (event) => console.log(JSON.stringify(event)),
});
console.log(JSON.stringify({ phase: 'ready', address: transport.address, origin: values.origin }));
console.log('arm ROUTE:BOUNDARY | status | release | drop | clear | quit');
console.log(
  'Routes: stage save resolve discard read recover read-view position. Boundaries: before after drop-before drop-after.',
);
const input = createInterface({ input: process.stdin });
process.once('SIGINT', () => input.close());
process.once('SIGTERM', () => input.close());
try {
  for await (const line of input) {
    if (line.trim() === 'quit') break;
    try {
      console.log(JSON.stringify(transport.command(line)));
    } catch (error) {
      console.log(error instanceof Error ? error.message : 'Control failed.');
    }
  }
} finally {
  input.close();
  await transport.close();
  console.log(JSON.stringify({ phase: 'closed' }));
}
