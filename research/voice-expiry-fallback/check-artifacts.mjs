import { spawnSync } from 'node:child_process';
import { lint } from 'markdownlint/sync';

const note = 'research/voice-expiry-fallback.md';
const result = lint({
  files: [note],
  config: { default: true, MD060: { style: 'compact' } },
});
const errors = Object.entries(result).flatMap(([file, issues]) =>
  issues.map((issue) => ({ file, ...issue })),
);
if (errors.length) {
  console.error(JSON.stringify(errors, null, 2));
  process.exit(1);
}
console.log('Markdownlint: 1 file, 0 errors');
for (const [command, args] of [
  [
    'node_modules/.bin/cspell',
    [
      '--no-progress',
      '--config',
      'research/voice-expiry-fallback/cspell.json',
      '--force-check',
      '--file',
      note,
    ],
  ],
  ['node_modules/.bin/biome', ['check', '--vcs-enabled=false', 'research/voice-expiry-fallback']],
]) {
  const child = spawnSync(command, args, { stdio: 'inherit' });
  if (child.error) throw child.error;
  if (child.status !== 0) process.exit(child.status ?? 1);
}
