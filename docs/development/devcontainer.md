# Develop in the devcontainer

The configuration copies Kravhantering's devcontainer and adapts it to
Skyttel's Node.js and SQLite stack. Docker Compose runs one `app` service,
with the repository mounted at `/workspace`. The development image is
separate from the production image. SQLTools uses its SQLite driver;
unrelated reference services, Podman, and host Docker access are excluded.

## Agreed verification scope

The scope agreed on 2026-09-16 excludes automated devcontainer unit,
integration, and lifecycle tests and a dedicated CI smoke workflow. Ordinary
developer build, startup, and application use are sufficient validation.
This narrows the original automated environment-verification criterion in
[issue #33](https://github.com/viscalyx/skyttel/issues/33). Existing application
tests and CI remain independent. Creation and startup never run those checks.
Authenticated Codex client verification remains in issue #25.

## Prepare and start

Use a running Docker engine and VS Code with the Dev Containers extension.
Before the first container creation, prepare the private environment file:

```sh
cp .devcontainer/.env.example .devcontainer/.env
openssl rand -base64 48
```

Put the generated value in `BETTER_AUTH_SECRET` in `.devcontainer/.env` and
keep it stable across rebuilds. This ignored file is the default environment
for `npm run dev:all`. The synthetic provider values display the sign-in page
but cannot complete real sign-in. Configure dedicated provider registrations
and a first administrator using the
[installation guide](../operations/installation.md) when real sign-in is
needed. Keep credentials and identity values out of Git and public logs.

The reference's host Codex mounts are retained. Ensure the host directories
`~/.codex/sessions`, `~/.codex/plugins`, `~/.codex/skills`, and
`~/.codex/rules` exist. `~/.codex/auth.json` must be an existing regular file
from your host Codex authentication setup. An empty placeholder is not usable
authentication. These mounts share their actual contents with the container;
changes to a shared directory also affect the host. The container does not
copy authentication into its image or the repository.

Select **Dev Containers: Reopen in Container** and choose the normal Skyttel
configuration. Creation runs `npm ci`, `dotnet tool restore`, Playwright
installation, the Codex installer, and the reference Codex configuration
merge. Startup starts the reference Codex app-server daemon, retrying once
after five seconds if its first readiness wait expires. A second failure
stops startup visibly. It does not start the application or run tests.

Start the client and server in a container terminal:

```sh
npm run dev:all
```

Open [the development client](http://localhost:5173). Vite proxies `/api`
and `/healthz` to the server on container port 3000. VS Code forwards ports
3000 for the API, 5173 for the client, and 9323 for Playwright reports.
Keep host port 5173 free because the sign-in origin uses that port. Ctrl+C
stops both development processes; source edits reload them.

`SKYTTEL_DEV_ENV_FILE` selects another private environment file. Exported
environment values take precedence over file values. Compose also loads
`.devcontainer/.env`, so recreate the container after changing a value it
exports. The default database is `/data/skyttel.sqlite`.
SQLite runs inside the app and migrates when the app starts; there is no
separate database service or startup database script.

For terminal access through the default configuration, run on the host:

```sh
npm ci
npx devcontainer up --workspace-folder .
npx devcontainer exec --workspace-folder . zsh
```

The CLI does not provide VS Code's port-forwarding UI. Use the attached
editor when opening the application through its forwarded ports.

## State and rebuilds

Compose keeps independent named volumes for the following state:

<!-- markdownlint-disable MD013 -->
| Volume | Container path and purpose |
| --- | --- |
| `skyttel-data` | `/data`: development SQLite database and journal files. |
| `codex-state` | `/home/vscode/.codex`: installed runtime, configuration, and remaining Codex state. |
| `codex-tmp` | `/home/vscode/.codex/tmp`: container-local runtime wrappers. |
| `config` | `/home/vscode/.config`: personal tool settings. |
| `vscode-server` | `/home/vscode/.vscode-server`: remote editor settings and extensions. |
| `node-modules` | `/workspace/node_modules`: Linux dependencies isolated from the host. |
| `worktrees` | `/home/vscode/worktrees`: Git worktrees outside the checkout. |
<!-- markdownlint-enable MD013 -->

The host Codex bind mounts override their corresponding paths inside
`codex-state`; their contents remain on the host. Source and the private
`.devcontainer/.env` remain in the repository's host bind mount.

Restarting or rebuilding the same Compose project retains its volumes.
The normal `skyttel-devcontainer` and opt-in `skyttel-devcontainer-elevated`
projects have separate named volumes; they share the same host bind mounts.
Compose uses its own volume names; earlier non-Compose volumes are not
automatically reused. Changing the Compose project name selects different
volumes. Removing volumes, including `docker compose down --volumes`, deletes
their state. Volumes provide persistence, not a backup service.

Use `/home/vscode/worktrees` for additional worktrees and install their
dependencies separately. Keep the main `/workspace` path stable because
worktree metadata refers to it. Applications and tools run as `vscode`;
the reference supplies passwordless `sudo` for development installations.
UID remapping is disabled; Linux host files must be writable by UID/GID 1000.

## Tools and updates

The base is `mcr.microsoft.com/devcontainers/base:2.0.5-ubuntu-24.04`.
The reference Git, common-utils, and Zsh features and generic editor settings
are retained. Python, a C/C++ compiler, Make, SQLite tools, and Bubblewrap
support the native packages and sandbox tools.

Node.js 24.21.0 and npm 11.19.0 are selected through the Node feature.
The .NET feature selects 8.0; `.config/dotnet-tools.json` pins GitVersion
6.8.2. GitHub CLI and Git use their feature update policies. The root npm
lockfile pins Dev Containers CLI 0.89.0, application Playwright 1.63.0, and
Sharp 0.35.4. VS Code manages the Codex and other editor extensions normally.

The copied Codex installer resolves the latest stable standalone release
and verifies the installer against its release SHA-256 digest. It runs in
the image build and again after mounts are available during creation.
Creation also installs global `playwright@latest`, Chromium, Firefox, WebKit,
and Linux browser libraries, then the browsers matching the application's
locked Playwright version. The reference Chrome executable link is retained.

Rolling tools can change on rebuild; record actual installed versions when
reporting problems. Keep `.node-version`, the package engine range,
production Node images, and the Node feature compatible with application CI.
After tool updates, rebuild and start normally, then run relevant application
checks explicitly. Inside the container:

```sh
npm run typecheck
npm run lint:docs
npm test
npm run test:gates
dotnet gitversion /output json
```

See [development testing](testing.md) for focused application checks.

## Codex permissions and remaining verification

The copied config merger preserves other personal settings while managing
the reference approval, workspace-trust, and permission settings in
`~/.codex/config.toml`. The adapted `skyttel-development` profile allows
workspace writes and local networking; its domain list contains only
`localhost`, `127.0.0.1`, and `::1`. The managed approval policy is `never`.
Repository Codex configuration is layered on top of this user configuration.

Use the normal profile first. Its container has no extra capabilities,
device mappings, or host Docker socket. The copied elevated configuration
is an explicit opt-in for investigating container restrictions, not the
recommended starting profile. It adds `SYS_ADMIN` and relaxed sandbox-related
Linux settings `seccomp=unconfined` and `systempaths=unconfined`.
Do not disable the Codex sandbox to work around a failure.

Docker/Linux privileges, Codex command permissions, and Codex approvals are
separate controls. Neither a command approval nor its absence grants host
Docker access or additional Linux capabilities. An expected denial of an
out-of-scope write does not justify switching profiles.

[Issue #25](https://github.com/viscalyx/skyttel/issues/25) owns signed-in CLI
and VS Code extension verification, actual backend versions, sandbox denial,
approved commands, and session persistence across rebuilds. It determines
minimum additional rights per client only if normal-profile evidence calls
for them. These signed-in client checks are not performed here. A daemon
start or version command alone is not a full client test.

## Troubleshoot startup

Use **Dev Containers: Show Container Log** for build and lifecycle failures.
Fix a missing host Codex mount, failed installation, or daemon error before
assuming startup completed. For application errors, inspect its terminal,
the environment file, `/data` permissions, and `/healthz`. Synthetic provider
credentials cannot complete sign-in. Preserve data when investigating a
migration failure. Run `npm ci` inside the container for missing or
incompatible native packages; never copy host `node_modules` into Linux.

Record exact errors, host OS/CPU, Docker version, profile, and tool versions.
Keep authentication, session content, and household data out of public logs.
