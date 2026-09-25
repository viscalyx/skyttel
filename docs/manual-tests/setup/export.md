# Prepare the active export-transfer check

This disposable Linux fixture prepares
[EXPORT-07](../household-export.md#export-07-återkallad-tillgång-avbryter-pågående-hämtning).
It runs the actual application, authentication, SQLite and HTTP export
stream. Only external Google/Microsoft responses use the existing controlled
test identities. It does not test live provider login. It accepts no origin,
database path, credentials or production configuration.

## Start the isolated application

From the repository root in the devcontainer, use Node.js 24 and run:

```sh
npm ci
npm run build
node --import tsx scripts/manual-export.ts
```

Keep this terminal open. The launcher creates a new private directory under
`/tmp`, starts the app on a random loopback port and establishes Alex and
Robin through the normal public authentication callbacks. It creates Linden,
invites Robin, accepts the invitation and makes Robin an administrator
through public HTTP. The fixture adds 100 retained synthetic lossless image
versions containing random pixels, matching the automated export fixture.
The exported ZIP must exceed 16 MiB; compressible solid-color images would
not provide the required transfer size.

Wait for the JSON line whose `event` is `ready`. It gives `origin`,
`administrationUrl`, `directory` and `scratchDirectory`. No session cookies
or provider tokens are printed or written to a client credential file.
If using VS Code port forwarding, forward the printed port to the same
number on the host and open the exact `http://127.0.0.1:PORT` address.
Use a fresh browser profile and **Fortsätt med Google** to enter as the
controlled Alex. Open the printed `administrationUrl`. The HTTP reader is
already signed in as the controlled Robin in a separate session.

Use the [manual case](../household-export.md#export-07-återkallad-tillgång-avbryter-pågående-hämtning)
for the application actions. Do not start extra exports or another app on
this fixture database. This preparation is not a manual test result.

## Reader controls and evidence

Type these commands in the launcher's terminal, one at a time:

```text
pause
inspect
resume
quit
```

`pause` prepares a fresh export as Robin and opens its real HTTP response.
It consumes one chunk and then stops reading. It samples the server's open
archive file position through Linux `/proc/self/fdinfo` until that position
stops advancing. The `paused` event must show:

- `archiveBytes` greater than `16777216`;
- `receivedBytes` greater than zero;
- `sourceReadBytes` at least `receivedBytes` and less than `archiveBytes`;
- `active: true`, with an `expiresAt` still in the future.

These measurements show unread bytes in the server's source file, not just
a browser request that appears pending. `inspect` repeats the measurement
without consuming more of the response. Run it immediately before changing
access as Alex. A missing source, `active: false` or an `error` event is not
valid evidence: quit and start a fresh fixture instead of recording a pass.

Complete each role-change check well before the displayed expiry, normally
within a minute. Exports expire after ten minutes, which would otherwise
confound the access-change result. Do not use browser throttling.

After changing access, `resume` drains the response and reports `result`.
Require `receivedBytes < archiveBytes`, `interrupted: true`,
`beforeExpiry: true`, `scratchEmpty: true` and `retryStatus: 403`.
The client counts bytes and never writes a ZIP. A complete response or any
other result is a failed check, not a successful interrupted transfer.
For the second run, restore Robin's administrator role through Alex's UI,
then use `pause` again; it creates a different export ID.

## Inspect the private server copy

Open a second terminal. Set this variable to the exact `directory` printed
by this launcher's `ready` event; do not use an ordinary database directory:

```sh
SKYTTEL_EXPORT_CASE_DIR='/tmp/skyttel-test-REPLACE-WITH-PRINTED-DIRECTORY'
ls -ld -- "$SKYTTEL_EXPORT_CASE_DIR/.skyttel-exports"
ls -l -- "$SKYTTEL_EXPORT_CASE_DIR/.skyttel-exports"/*/archive.zip
```

Run these commands while `pause` holds the stream open. The directory should
have private permissions (`drwx------`), and its one export subdirectory
contains `archive.zip`. Its size matches `archiveBytes`.

After **each** access change and `resume`, run this exact emptiness check.
It lists names only, never archive content or login data. Require `[]` and
exit status zero, while the `.skyttel-exports` directory itself still exists:

```sh
node -e 'const fs = require("node:fs");
const entries = fs.readdirSync(process.argv[1]);
console.log(JSON.stringify(entries));
if (entries.length) process.exitCode = 1;' \
  "$SKYTTEL_EXPORT_CASE_DIR/.skyttel-exports"
```

## Finish or reset

Type `quit` in the launcher terminal. Ctrl+C also requests shutdown. The
launcher closes the reader and server, removes its own temporary directory
and prints `closed`. Verify from the second terminal:

```sh
test ! -e "${SKYTTEL_EXPORT_CASE_DIR:?}" && printf '%s\n' 'Fixture removed'
unset SKYTTEL_EXPORT_CASE_DIR
```

Close the test browser profile and remove the forwarded port. No downloaded
ZIP or client credentials need cleaning. If the process is forcibly killed
instead of quitting, first ensure it is stopped. In the second terminal,
with the variable still set to its exact printed temporary directory, run:

```sh
rm -r -- "${SKYTTEL_EXPORT_CASE_DIR:?}"
unset SKYTTEL_EXPORT_CASE_DIR
```

Restart the launcher for a new case; it never reuses the previous database
or sessions.
