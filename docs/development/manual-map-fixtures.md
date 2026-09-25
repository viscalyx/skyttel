# Prepare disposable map fixtures

This guide prepares the database states used by the manual contract-upgrade
and personal-view checks. Run it from the repository root in the devcontainer
with Node.js 24 and `npm ci` complete. Complete the existing
[development login setup](devcontainer.md#run-the-application) first. Use the
configured first administrator for Alex and a separate real test account for
Robin. Provider authentication remains unchanged.

The helper creates synthetic household data only in a fresh temporary
directory. It is not an operator migration command. Do not use a household
backup or ordinary development database. Preparation does not count as a
manual test result: perform and record the linked case separately.

## Start with verified test identities

Stop the normal development server with Ctrl+C and keep ports 3300 and 5173
free. Keep this terminal open throughout the case. The private provider
configuration comes from `SKYTTEL_DEV_ENV_FILE`, or `.devcontainer/.env` when
unset. The database path below overrides that file for this process only.

```sh
umask 077
SKYTTEL_MANUAL_MAP_DIR=$(mktemp -d /tmp/skyttel-manual-map-XXXXXX)
printf 'SKYTTEL_DATABASE_PATH=%s/verified.sqlite\n' \
  "$SKYTTEL_MANUAL_MAP_DIR" > "$SKYTTEL_MANUAL_MAP_DIR/case.env"
env -u SKYTTEL_DATABASE_PATH \
  node --env-file="$SKYTTEL_MANUAL_MAP_DIR/case.env" scripts/develop.mjs
```

Open `http://localhost:5173` in a fresh browser profile. Sign in as Alex and
create Linden. Choose one fixture below; use a fresh directory for the other
case. Before stopping the server, obtain the selected user's ID in that
user's browser Console:

```js
(await (await fetch('/api/bootstrap')).json()).user.id
```

Copy only that ID into the terminal variable shown below after stopping the
server. Do not copy cookies, provider tokens or session IDs. The helper
requires an existing Google or Microsoft account established by public login.

## Legacy contract upgrade

Use Alex's ID. Stop the server with Ctrl+C and wait for both development
processes to stop. Run in the same terminal, replacing the quoted value with
the ID from Alex's Console:

```sh
SKYTTEL_MANUAL_USER_ID='paste-Alex-user-id'
node --import tsx scripts/prepare-manual-map.ts \
  legacy-contracts "$SKYTTEL_MANUAL_MAP_DIR" "$SKYTTEL_MANUAL_USER_ID"
printf 'SKYTTEL_DATABASE_PATH=%s/legacy.sqlite\n' \
  "$SKYTTEL_MANUAL_MAP_DIR" > "$SKYTTEL_MANUAL_MAP_DIR/legacy.env"
```

The command refuses an existing `legacy.sqlite`. It creates that separate
file using migrations 001–006 and leaves `verified.sqlite` unchanged. It
copies Alex's verified user/account identifiers, without sessions or provider
tokens. It adds Linden (`manual-legacy-household`), the Bostad definition
`household-home-type` at revision 7 with description
`Hushållets egen beskrivning av bostad`, and Hyresvärd
`household-landlord-role` at revision 4 with description
`Hushållets egen beskrivning av hyresvärd`. The saved object
`home-before-upgrade` is Björkbacken, with Alex's private name proposal
Björkbacken hemma. These are synthetic equivalents of the automated upgrade
fixture, not a claim that an older deployed application was exercised.

Start the current application on that file. Startup performs the real
upgrade. Use this same command for later restarts, without rerunning the
helper or `db:setup`:

```sh
env -u SKYTTEL_DATABASE_PATH \
  node --env-file="$SKYTTEL_MANUAL_MAP_DIR/legacy.env" scripts/develop.mjs
```

Reload the browser and sign in again as Alex through the same provider.
Alex's user ID stays the same; the old session is intentionally absent.
Continue [AVTAL-06](../manual-tests/contracts.md#avtal-06-uppgradering-bevarar-egna-definitioner-och-äldre-utkast)
with this upgraded household.

## A second household on the same installation

While the original `verified.sqlite` installation is running, sign in as
Robin in a separate browser profile. Do not invite Robin to Linden yet.
Robin is authenticated but has no household access. Obtain Robin's user ID
with the Console command above, then stop the server with Ctrl+C. Run:

```sh
SKYTTEL_MANUAL_USER_ID='paste-Robin-user-id'
node --import tsx scripts/prepare-manual-map.ts \
  second-household "$SKYTTEL_MANUAL_MAP_DIR" "$SKYTTEL_MANUAL_USER_ID"
env -u SKYTTEL_DATABASE_PATH \
  node --env-file="$SKYTTEL_MANUAL_MAP_DIR/case.env" scripts/develop.mjs
```

The helper requires Robin to have no membership. It adds the synthetic
household Eken (`manual-other-household`) and makes the already verified
Robin a member. It changes no login identities, sessions or membership in
Linden. A repeated run is refused. Reload both profiles: Alex sees Linden;
Robin sees Eken on the same origin and database.

Continue [PLACERING-05](../manual-tests/personal-view.md#placering-05-personlig-avskildhet-och-återkallad-tillgång).
Keep Linden's full address from Alex's browser. After accepting Alex's normal
invitation, Robin may still land in Eken by default; open Linden's address
explicitly. Preserve this database and restart using the last command above.

## Finish or reset

Stop the server, close the test browser profiles, and delete only this
temporary directory in the same terminal:

```sh
rm -r -- "${SKYTTEL_MANUAL_MAP_DIR:?}"
unset SKYTTEL_MANUAL_MAP_DIR SKYTTEL_MANUAL_USER_ID
```

Restart ordinary development with `npm run dev:all`. To repeat either fixture,
start with a new directory and public logins; do not reset a fixture midway
through a persistence check.
