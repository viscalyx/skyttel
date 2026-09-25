# Prepare a local household move

This setup gives a human two disposable compiled installations in the
devcontainer: a source at `http://localhost:5173` and a destination at
`http://localhost:3301`. Each has a separate database and authentication
secret. Use the host browser with separate Chrome profiles; cookies on
`localhost` are shared across ports within one profile.

Use invented household content only. The setup does not change the ordinary
development database. It does not need a public address or tunnel.
`tests/integration/household-recovery.spec.ts` automates this scenario with
isolated installations. The steps here support optional troubleshooting;
Issue #97 does not require a manual repeat.

## Prerequisites

- Complete [local authentication](local-authentication.md) and have a
  working private development configuration. Its path is
  `SKYTTEL_DEV_ENV_FILE`, or `.devcontainer/.env` by default.
- Keep the source's existing configured first-administrator account.
  Use a different verified login identity for the destination. The example
  selects Microsoft when the source uses Google, and Google otherwise.
  The person must control the selected account and be able to sign in.
- The selected destination provider needs its callback at port 3301.
  Google uses the [existing two-callback setup](local-authentication.md).
  Microsoft localhost callbacks follow that guide's port handling. Keep
  the normal source callback at port 5173.
- Install the repository dependencies. Stop normal development servers and
  keep ports 3300, 5173 and 3301 free. Forward 5173 and 3301 to the same host
  ports in VS Code's **Ports** panel, with local/private visibility.

Do not run `db:setup`; each database must begin empty. These preparation
steps configure access only. Follow the relevant manual case for synthetic
household content and application assertions.

## Create private temporary configuration

In terminal A, from the repository root, run:

```sh
umask 077
export SKYTTEL_MOVE_CASE_DIR=$(mktemp -d /tmp/skyttel-move-case.XXXXXX)
node --input-type=module <<'JS'
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const root = process.env.SKYTTEL_MOVE_CASE_DIR;
const file = process.env.SKYTTEL_DEV_ENV_FILE ?? '.devcontainer/.env';
const source = parseEnv(readFileSync(file, 'utf8'));
const keys = [
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
  'SKYTTEL_FIRST_ADMIN_PROVIDER', 'SKYTTEL_FIRST_ADMIN_SUBJECT',
];
if (!root || keys.some((key) => !source[key])) {
  throw new Error('Complete the existing private login configuration first.');
}
for (const name of ['source', 'target']) {
  const values = Object.fromEntries(keys.map((key) => [key, source[key]]));
  Object.assign(values, {
    SKYTTEL_ORIGIN: 'http://localhost:5173',
    SKYTTEL_DATABASE_PATH: `${root}/${name}.sqlite`,
    BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
    HOST: '0.0.0.0', PORT: '3300',
  });
  if (name === 'target') {
    values.SKYTTEL_FIRST_ADMIN_PROVIDER =
      source.SKYTTEL_FIRST_ADMIN_PROVIDER === 'google' ? 'microsoft' : 'google';
    values.SKYTTEL_FIRST_ADMIN_SUBJECT = 'not-configured';
  }
  writeFileSync(`${root}/${name}.env`, Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n',
  { mode: 0o600, flag: 'wx' });
}
console.log('Created source.env and target.env in the temporary directory.');
JS
printf '%s\n' "$SKYTTEL_MOVE_CASE_DIR"
```

Copy only the printed directory path to terminal B, setting the variable to
that exact path there. Do not copy or print either environment file. If you
need another destination provider, edit only `target.env` privately before
starting it. Keep the source and destination secrets and paths distinct.

## Start the source and destination

In each terminal, clear inherited application settings so the corresponding
temporary file supplies them:

```sh
unset SKYTTEL_ORIGIN SKYTTEL_DATABASE_PATH BETTER_AUTH_SECRET
unset SKYTTEL_FIRST_ADMIN_PROVIDER SKYTTEL_FIRST_ADMIN_SUBJECT
unset GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
unset MICROSOFT_CLIENT_ID MICROSOFT_CLIENT_SECRET PORT HOST
```

Start the source in terminal A:

```sh
npm run build
PORT=5173 HOST=0.0.0.0 NODE_ENV=development \
  node --env-file="$SKYTTEL_MOVE_CASE_DIR/source.env" dist/server/index.js
```

The compiled server exposes browser, OAuth discovery and MCP endpoints on
the same origin. The ordinary Vite development proxy does not expose MCP.
For a source restart, repeat only the last two command lines with the same
file; rebuilding is unnecessary unless application code changed.

In Chrome profile A, open `http://localhost:5173` and sign in as the source's
configured administrator. Keep terminal A open. Start the destination in
terminal B:

```sh
SKYTTEL_DEV_ENV_FILE="$SKYTTEL_MOVE_CASE_DIR/target.env" \
  node scripts/develop-prodlike.mjs
```

The destination launcher builds the application and sets its public origin
and listening port to 3301. In a different Chrome profile B, open
`http://localhost:3301` and sign in with the selected destination provider.
Access is initially denied because its first administrator is not configured.
That denial is expected; do not change the source configuration.

## Verify the destination administrator

In profile B, open `http://localhost:3301/api/bootstrap` and privately copy
the authenticated `user.id`. In terminal B, press Ctrl+C and wait for the
destination to stop. Then run the following, entering that ID at the prompt:

```sh
printf 'Destination Skyttel user ID: '
read -r SKYTTEL_MOVE_TARGET_USER
export SKYTTEL_MOVE_TARGET_USER
node --input-type=module <<'JS'
import Database from 'better-sqlite3';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const file = `${process.env.SKYTTEL_MOVE_CASE_DIR}/target.env`;
const settings = parseEnv(readFileSync(file, 'utf8'));
const db = new Database(settings.SKYTTEL_DATABASE_PATH, {
  readonly: true, fileMustExist: true,
});
try {
  if (db.prepare('SELECT 1 FROM installation WHERE id = 1').get()) {
    throw new Error('Destination household exists. Stop administrator setup.');
  }
  const accounts = db.prepare(
    'SELECT accountId FROM account WHERE userId = ? AND providerId = ?',
  ).all(process.env.SKYTTEL_MOVE_TARGET_USER,
    settings.SKYTTEL_FIRST_ADMIN_PROVIDER);
  if (accounts.length !== 1) {
    throw new Error('Expected the selected verified destination account.');
  }
  settings.SKYTTEL_FIRST_ADMIN_SUBJECT = accounts[0].accountId;
  writeFileSync(file, Object.entries(settings)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n',
  { mode: 0o600 });
  console.log('Destination administrator configured; no identity printed.');
} finally {
  db.close();
}
JS
unset SKYTTEL_MOVE_TARGET_USER
```

This reads only the target database's actual authenticated account; it does
not insert a login or household membership. Restart with the same terminal-B
command. Profile B can now create the empty destination household. Keep it
empty until the case instructs you to import. A historical owner's name or
ID from the source is not a substitute for this destination sign-in.

## Restart, stop and clean up

For a persistence check, press Ctrl+C in the relevant terminal, wait for
shutdown, and repeat only that terminal's start command. Keep the same
temporary directory, configuration and database. Do not recreate files or
run `db:setup`. Reload the corresponding browser profile after startup.

For the final move, stop source editing before export and stop terminal A
after its download, as described in the
[move runbook](../operations/recovery.md#pause-changes-and-take-the-final-export).
The destination uses only that downloaded archive. Do not copy a source
SQLite file or read it to complete destination recovery.

When the whole case is complete, stop both servers, close both test browser
profiles, clear copied IDs, and delete downloaded synthetic archives and
images. In terminal A, remove only this temporary directory:

```sh
rm -r -- "${SKYTTEL_MOVE_CASE_DIR:?}"
unset SKYTTEL_MOVE_CASE_DIR
```

Unset the same directory variable in terminal B. Resume ordinary development
with its original private environment file and `npm run dev:all`. Provider
registrations remain available for later local work; the disposable database
sessions and temporary copies of credentials are removed with the directory.
