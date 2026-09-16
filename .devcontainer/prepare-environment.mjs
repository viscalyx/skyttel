import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const filename = join(homedir(), '.config/skyttel/development.env');
try {
  await writeFile(filename, [
    '# Local development only. Supply your own provider registration for sign-in.',
    'SKYTTEL_ORIGIN=http://localhost:5173',
    'SKYTTEL_DATABASE_PATH=/data/skyttel.sqlite',
    'SKYTTEL_FIRST_ADMIN_PROVIDER=google',
    'SKYTTEL_FIRST_ADMIN_SUBJECT=synthetic-first-administrator',
    `BETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}`,
    'GOOGLE_CLIENT_ID=synthetic-google-client',
    'GOOGLE_CLIENT_SECRET=synthetic-google-secret',
    'MICROSOFT_CLIENT_ID=synthetic-microsoft-client',
    'MICROSOFT_CLIENT_SECRET=synthetic-microsoft-secret',
    'HOST=0.0.0.0',
    'PORT=3000',
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log(`Created ${filename} with synthetic provider values.`);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
