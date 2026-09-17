# Develop in the devcontainer

The configuration copies Kravhantering's devcontainer and adapts it to
Skyttel's Node.js and SQLite stack. Docker Compose runs one `app` service,
with the repository mounted at `/workspace`. The development image is
separate from the production image. SQLTools uses its SQLite driver;
SQL Server, Keycloak, HSA, Kong, and Podman are excluded. The reference
Docker feature provides Docker CLI, Compose, and Buildx through the host
Docker engine, so developers and agents can run temporary containers.

## Agreed verification scope

The scope in [issue #33](https://github.com/viscalyx/skyttel/issues/33)
excludes automated devcontainer unit, integration, and lifecycle tests and
a dedicated CI smoke workflow. Developers manually verify rebuilds,
startup, tools, persistence, and application use in their normal development
workflow to cover the environment's practical nuances.
Application unit tests use Vitest; application integration tests use
Playwright. These tests and CI remain independent. Creation and startup
never run those checks.
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
3000 for the API, 3001 for the compiled application, 5173 for the client,
and 9323 for Playwright reports.
Keep host port 5173 free because the sign-in origin uses that port. Ctrl+C
stops both development processes; source edits reload them.

To build and run the compiled application on port 3001, use:

```sh
npm run dev:prodlike
```

This command builds once, then serves the Vite client and API through the
production Hono server at [port 3001](http://localhost:3001). It uses the same
database and provider credentials as normal development. Its public origin
uses the configured host and protocol with port 3001. For real sign-in, add
the corresponding port-3001 callback URLs to the dedicated provider
registrations. Source edits require another build. Keep host port 3001 free.

`SKYTTEL_DEV_ENV_FILE` selects another private environment file. Exported
environment values take precedence over file values. Compose also loads
`.devcontainer/.env`, so recreate the container after changing a value it
exports. `NODE_ENV` and the three .NET telemetry/workload settings retain
the reference defaults and support host environment overrides. The default
database is `/data/skyttel.sqlite`.
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
On Linux hosts, Dev Containers can match the container user ID and group ID
to the developer. Creation repairs ownership in container-owned volumes
without following symbolic links or changing the host Codex mounts. The
current full `codex-state` volume is retained for normal developer use; no
Codex state migration or volume deletion is part of this change.

## Tools and updates

The base is `mcr.microsoft.com/devcontainers/base:2.0.5-ubuntu-24.04`.
The reference Git, common-utils, and Zsh features and generic editor settings
are retained. Python with pip, venv, YAML support, and the `python` alias,
a C/C++ compiler,
Make, SQLite tools, Bubblewrap, and socat support application and agent work.
The Biome and Vitest editor extensions support the project lint and unit
test commands.

The image also includes mkcert and NSS tools for future local HTTPS work,
such as microphone development on a phone. These tools alone do not create
an HTTPS endpoint or install a trusted certificate on the host or phone.
Normal development still uses HTTP on localhost. dotenv-linter and Lychee
remain excluded because this project has no checks that use them. Markdown
lint and spelling checks remain available.

Both profiles install Node and npm during the image build. The Dockerfile
reads the exact Node version from `.node-version`, downloads the official
Linux binary for AMD64 or ARM64, and checks its release SHA-256 checksum.
The shared `scripts/install-repository-npm.mjs` installer reads
`packageManager` from `package.json` and installs that exact npm version.
The versions are currently Node.js 24.21.0 and npm 12.0.2. The tools are
available on the system PATH before any lifecycle commands run; creation
only installs project dependencies with `npm ci`. Neither profile duplicates
the version pins or installs a Node version manager.
Rebuild after changing either version source. CI uses the same version
sources, and production builds use the shared npm installer.
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

Codex CLI, its VS Code extension, and global Playwright intentionally use
the latest available releases on rebuild. Identical versions of these
rolling tools across rebuilds are not required; application dependencies
and application Playwright continue to use the committed npm lockfile.
Record actual installed versions when
reporting problems. Keep `.node-version`, the package engine range,
and production Node images compatible with application CI.
After tool updates, rebuild and start normally, then run relevant application
checks explicitly. Inside the container:

```sh
npm run typecheck
npm run lint
npm run lint:docs
npm test
npm run test:gates
dotnet gitversion /output json
```

Check rolling tool versions with `codex --version` and
`"$HOME/.local/bin/playwright" --version`. Use
`npx --no-install playwright --version` for the project's locked Playwright
version. In VS Code's
Extensions view, select the installed Codex extension to see its version.

See [development testing](testing.md) for focused application checks and
the explicit `npm run purge:install` dependency-maintenance command.

## Temporary containers

The reference Docker feature connects to the host engine. For example:

```sh
docker run --rm alpine echo ready
docker compose version
docker buildx version
```

The temporary container is removed when its process exits. Containers and
images use the host engine and appear in Docker Desktop. Bind-mount paths
refer to the Docker host, so use named volumes or `docker cp` for files that
exist only inside the devcontainer. The application `test:container` command
uses Docker copy and exec to work in both environments.

Both profiles use the repository root as their build context.
`.devcontainer/Dockerfile.dockerignore` restricts it to the development
Dockerfile, installers, `.node-version`, and `package.json`. Dev Containers
generates a Dockerfile for features and uses the root `.dockerignore`, which
also permits application build inputs. Both allowlists exclude private
environment files and Codex state. The whole repository remains
available at `/workspace`, including for application `docker build` commands.

## Codex permissions and remaining verification

The copied config merger preserves other personal settings while managing
the reference approval, workspace-trust, and permission settings in
`~/.codex/config.toml`. The adapted `skyttel-development` profile allows
workspace writes and local networking; its domain list contains only
`localhost`, `127.0.0.1`, and `::1`. The managed approval policy is `never`.
Repository Codex configuration is layered on top of this user configuration.

Use the normal profile first. It includes the host Docker socket through
the reference feature. Host Docker access lets commands manage host
containers; use it for trusted development work. The normal container has
no added Linux capabilities or device mappings. The copied elevated configuration
is an explicit opt-in for investigating container restrictions, not the
recommended starting profile. It adds `SYS_ADMIN` and relaxed sandbox-related
Linux settings `seccomp=unconfined` and `systempaths=unconfined`.
Do not disable the Codex sandbox to work around a failure.

Docker/Linux privileges, Codex command permissions, and Codex approvals are
separate controls. The mounted Docker socket supplies host engine access;
a Codex command
approval does not change Linux capabilities. An expected denial of an
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
