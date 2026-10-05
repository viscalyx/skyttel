// The prototype uses the ordinary local API and its existing sign-in cookies.
import { spawn } from 'node:child_process';

const backend = 'http://127.0.0.1:3300';
try {
  const response = await fetch(`${backend}/healthz`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error('backend_unavailable');
} catch {
  console.error('Starta den vanliga lokala utvecklingsmiljön med npm run dev:all först.');
  process.exit(1);
}
console.info('Prototypen använder befintlig backend på port 3300.');
console.info('Logga in som vanligt på http://localhost:5173 i samma webbläsare.');
console.info('Öppna http://localhost:5176/?prototype=draft-review&variant=D');
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5176', '--strictPort'],
  { stdio: 'inherit' },
);
child.once('exit', (code) => {
  process.exitCode = code ?? 0;
});
child.once('error', () => {
  console.error('Prototypens utvecklingsserver kunde inte starta.');
  process.exitCode = 1;
});
process.once('SIGINT', () => child.kill('SIGINT'));
process.once('SIGTERM', () => child.kill('SIGTERM'));
