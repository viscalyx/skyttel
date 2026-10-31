import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { alex, type createInstallation } from './installation.js';

export async function setupDatabase(
  installation: Awaited<ReturnType<typeof createInstallation>>,
  firstAdmin = { provider: 'google', subject: alex.subject },
  overrides: NodeJS.ProcessEnv = {},
) {
  const environmentFile = join(installation.directory, '.env');
  await writeFile(
    environmentFile,
    Object.entries({
      SKYTTEL_ORIGIN: installation.origin,
      SKYTTEL_DATABASE_PATH: join(installation.directory, 'skyttel.db'),
      SKYTTEL_FIRST_ADMIN_PROVIDER: firstAdmin.provider,
      SKYTTEL_FIRST_ADMIN_SUBJECT: firstAdmin.subject,
      BETTER_AUTH_SECRET: 'synthetic-test-secret-with-at-least-32-characters',
      SKYTTEL_AUTHORITY_GENERATION: '11111111-1111-4111-8111-111111111111',
      GOOGLE_CLIENT_ID: 'fake-google',
      GOOGLE_CLIENT_SECRET: 'fake-secret',
      MICROSOFT_CLIENT_ID: 'fake-microsoft',
      MICROSOFT_CLIENT_SECRET: 'fake-secret',
    })
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
  );
  const child = spawn('npm', ['run', 'db:setup'], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'development',
      SKYTTEL_DEV_ENV_FILE: environmentFile,
      ...overrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  const [code] = await once(child, 'close');
  return { code, output };
}
