import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { createInstallation } = await import(
  pathToFileURL(resolve('tests/support/installation.ts')).href
);

const rows = [];
for (let i = 0; i < 10; i++) {
  const a = performance.now();
  const installation = await createInstallation();
  const b = performance.now();
  installation.seedDemo();
  const c = performance.now();
  await installation.close();
  const d = performance.now();
  rows.push({ iteration: i + 1, start_ms: b - a, seed_ms: c - b, close_ms: d - c });
}
console.log(JSON.stringify({ method: '10 sequential warm-dependency createInstallation/seedDemo/close cycles; no browser, login, network emulation or restart; not per-test total fixture cost', rows }, null, 2));
