# Prepare a browser check

These setups keep manual browser checks separate from the ordinary
development database. Use the
[test guide](../../development/testing.md) for automated unit and integration
checks.

## Disposable local browser session

Use this setup when a browser check must replace household content. It runs
inside the devcontainer with the host browser at `http://localhost:5173`.
Complete the normal
[development login setup](../../development/devcontainer.md#set-up-local-sign-in)
first. The configured first administrator signs in with
that existing account. Household names and information must be invented.
No public address, tunnel, new provider registration, or assistant is needed.

Stop the normal `npm run dev:all` with Ctrl+C and keep ports 3300 and 5173
free. From the repository root, run this block in a terminal that you keep
open for the whole check. It creates a new empty database without running
`db:setup` or changing the ordinary development database. Provider settings
come from the same private environment file as normal development:
`SKYTTEL_DEV_ENV_FILE`, or `.devcontainer/.env` when it is not set.

```sh
umask 077
SKYTTEL_BROWSER_CASE_DIR=$(mktemp -d /tmp/skyttel-browser-case.XXXXXX)
printf 'SKYTTEL_DATABASE_PATH=%s/skyttel.sqlite\n' \
  "$SKYTTEL_BROWSER_CASE_DIR" > "$SKYTTEL_BROWSER_CASE_DIR/case.env"
env -u SKYTTEL_DATABASE_PATH \
  node --env-file="$SKYTTEL_BROWSER_CASE_DIR/case.env" scripts/develop.mjs
```

Open a fresh private browser window on the host, sign in and create the
requested household. If two profiles are required, use two separate browser
profiles, both signed in as the same configured administrator. Session
cookies are profile-local. Keep any downloaded synthetic archives in a
separate private folder on the host.

For a restart within the check, press Ctrl+C, wait for both development
processes to stop, and run only this command in the same terminal. It uses
the same database, sessions, and household:

```sh
env -u SKYTTEL_DATABASE_PATH \
  node --env-file="$SKYTTEL_BROWSER_CASE_DIR/case.env" scripts/develop.mjs
```

Reload the browser after startup. Do not rerun the directory-creation block
or `db:setup` during a persistence check. When finished, stop the server,
close the test browser windows, remove downloaded test archives, and delete
only this temporary directory in the same terminal:

```sh
rm -r -- "${SKYTTEL_BROWSER_CASE_DIR:?}"
unset SKYTTEL_BROWSER_CASE_DIR
```

Start the ordinary environment again with `npm run dev:all`. For another
isolated check, create a fresh directory with the first block.

## Verify real identity providers separately

If you are new to provider registration, start with the
[local authentication walkthrough](../../development/devcontainer.md#set-up-local-sign-in).

For a manual Codex CLI connection inside the devcontainer, use the
[local assistant setup](assistants.md#manual-local-codex-cli-setup).
It reuses development Google credentials with the port-3301 callback and a
disposable database. Normal development login uses the port-5173 callback
on the same Google client. This live-client check is excluded from CI and
pull request workflows; do not add provider secrets or a Codex login to run
it there. Automated tests retain their synthetic identity providers.

Use a private verification installation with its own persistent disk, secret,
and provider registrations. Register the correct callback URLs and authorize
Google test accounts if its consent screen requires them. Do not post tokens,
subjects, personal email addresses, screenshots with identity details, or
household data in public evidence.

1. Configure a controlled Google identity as first administrator. Complete the
   actual Google redirect and consent flow, create a synthetic household,
   sign out, and sign in again.
2. Restart the production container and confirm that the same household and
   provider identity are retained.
3. Repeat in a separate installation with a personal Microsoft account as
   first administrator. An organizational Microsoft account alone does not
   verify personal-account support.
4. Confirm that another authenticated identity cannot create or access the
   household, including direct API requests. If using matching email
   addresses across providers, confirm they do not merge automatically.
5. Verify logout, denied consent, and a provider error. Confirm that the page
   gives a usable retry path and technical logs contain no secret or identity
   detail.
6. Open **Inloggningssätt**, prove the existing login, then link a controlled
   identity from the other provider. Include a personal Microsoft account.
   Check the verified result, sign out, and sign in with each provider.
   Confirm the same Skyttel user ID and household access. Repeat with denied
   consent and an identity already owned by another Skyttel user; earlier
   access must remain intact.

Record the date, image digest, provider, Microsoft account category, scenarios,
and pass/fail result in private release evidence. State explicitly which
checks are deterministic and which use a real provider. Passing the automated
suite alone is not a claim of live Google or Microsoft sign-in success.

Verify the deployed HTTPS origin and callback URLs before release. Local
HTTP checks do not verify hosted ingress or provider policies for that
deployment. Test physical mobile devices separately when they are part of
the release's target platforms; browser viewport emulation is insufficient.
