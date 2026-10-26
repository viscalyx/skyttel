// Substitute only the CLI's external network and wall-clock boundaries.
import { appendFileSync, readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import timers from 'node:timers/promises';

const fixture = JSON.parse(readFileSync(process.env.CI_WATCH_FIXTURE, 'utf8'));
let clock = fixture.start;
Date.now = () => clock;
timers.setTimeout = async (ms) => {
  clock += ms;
  if (clock >= fixture.stopAt) process.emit('SIGINT');
};
syncBuiltinESMExports();

globalThis.fetch = async (url, options) => {
  const path = String(url).replace('https://api.github.com/', '');
  appendFileSync(
    process.env.CI_WATCH_TRACE,
    `${JSON.stringify({ path, time: clock, method: options.method ?? 'GET' })}\n`,
  );
  const step = fixture.steps.filter((item) => item.at <= clock).at(-1);
  const response = step.responses[path] ?? fixture.responses[path];
  if (!response) throw new Error(`Unexpected request: ${path}`);
  if (response.interrupt) process.emit('SIGINT');
  if (response.networkError) throw new Error(response.networkError);
  return new Response(JSON.stringify(response.body), {
    status: response.status ?? 200,
    headers: response.headers,
  });
};
