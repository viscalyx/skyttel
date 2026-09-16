# Develop in the devcontainer

The devcontainer supplies the Linux development tools for Skyttel. Its image
and build context are separate from the production image. Open the repository
with VS Code and the Dev Containers extension, using a running Docker engine,
then select **Dev Containers: Reopen in Container**. The repository appears
at `/workspaces/skyttel` inside the container.

The normal profile runs as `vscode`, with UID/GID 1000. It does not mount the
host Docker socket or request additional Linux capabilities. Automatic UID
remapping is disabled so that the named volumes retain consistent ownership.
On Linux, the host checkout must permit UID/GID 1000 to write; check that
permission before opening the container.

## Agreed verification scope

The implementation scope agreed on 2026-09-16 excludes automated
devcontainer unit, integration, and lifecycle tests, and a dedicated CI
devcontainer smoke workflow. Ordinary developer build, startup, and
application use are sufficient validation of this configuration. This
decision narrows the original automated environment-verification criterion
in [issue #33](https://github.com/viscalyx/skyttel/issues/33).

Existing application tests and application CI remain independent and are
run explicitly. Container creation and startup never run those checks.
Authenticated Codex client verification remains in issue #25.

## Start the application

Creating the container installs the project's exact locked dependencies with
`npm ci`. Starting it prepares private configuration and the editor extension.
Neither lifecycle step runs the CI checks or project tests. Start the client
and application server explicitly from a container terminal:

```sh
npm run dev:all
```

Open [the development client](http://localhost:5173). Port 5173 serves Vite
and proxies `/api` to the application server on port 3000. Port 3000 exposes
the server directly; its [readiness endpoint](http://localhost:3000/healthz)
reports whether the database and migrations are ready. Both ports are
forwarded by the devcontainer configuration. Stop both development processes
with Ctrl+C in their terminal. The server and client reload as source files
change.

VS Code requires local port 5173 to be free because the configured sign-in
origin uses that port. If forwarding reports a collision, stop the conflicting
development process before opening the client.

The local environment file is
`/home/vscode/.config/skyttel/development.env`. The first creation supplies
synthetic provider settings, a development authentication secret, origin
`http://localhost:5173`, and database `/data/skyttel.sqlite`. Existing settings
are preserved. These defaults let the application start and display its
sign-in page; synthetic provider credentials cannot complete a real sign-in.
Set `SKYTTEL_DEV_ENV_FILE` to use a different private environment file with
`npm run dev:all`. Existing exported environment variables take precedence
over values loaded from the file.

For real sign-in, configure your own dedicated provider registrations and
first administrator in that private environment file. Use the development
origin and callback URLs described in the
[installation guide](../operations/installation.md). Keep credentials and
identity values out of committed files, image build arguments, terminal
history, and public logs. The [first-time setup guide](../operations/first-time-use.md)
describes the provider registration and administrator steps. Use synthetic
household content for development and verification.

## Run checks explicitly

Run these commands in the devcontainer when you want to verify a change:

```sh
npm run typecheck
npm run lint:docs
npm test
npm run test:gates
dotnet-gitversion /output json
```

The image includes the Playwright browser binaries and their Linux libraries.
`npm test` builds the application and runs the existing browser and public
HTTP checks with isolated synthetic data. Focused test commands and the
separate production-image check are described in
[development testing](testing.md).

For a terminal-only workflow, create and enter the devcontainer from the
**host**, where Docker is available:

```sh
npm ci
npx devcontainer up --workspace-folder .
npx devcontainer exec --workspace-folder . bash
```

The locked Dev Containers CLI uses the same configuration and lifecycle
commands as VS Code. CLI execution does not open an editor or configure its
port-forwarding UI. Use VS Code port forwarding when opening the application
from the host. Successful ordinary build, startup, and application use are
the development-environment verification workflow; there is no separate
automated devcontainer test suite.

## Preserve development state

Docker named volumes keep these concerns separate:

<!-- markdownlint-disable MD013 -->
| Container path | Persistent contents |
| --- | --- |
| `/data` | Development SQLite database and its journal files. |
| `/home/vscode/.codex` | Codex authentication, configuration, sessions, and work state. |
| `/home/vscode/.config` | Private application environment and personal tool settings. |
| `/home/vscode/.vscode-server` | Remote editor settings and extension state. |
| `/workspaces/skyttel/node_modules` | Linux dependencies, isolated from host dependencies. |
| `/home/vscode/worktrees` | Additional Git worktrees outside the main checkout. |
<!-- markdownlint-enable MD013 -->

Volume names include the Dev Containers identifier. Reopening, restarting,
or using **Dev Containers: Rebuild Container** for the same workspace retains
these volumes. Rebuild after changing the image, tool versions, or container
configuration; `npm ci` refreshes dependencies from the lockfile during
creation. Rebuilding the image does not reset the database or Codex settings.

Changing the workspace's host location can change its identifier and select
new volumes. Removing volumes explicitly, including a broad Docker volume
cleanup, removes the stored state. Keep the original volume names when
moving an environment that must retain its data. These volumes are
persistence, not a backup service.

The repository bind mount keeps source changes on the host. Create Git
worktrees outside `/workspaces/skyttel`, in `/home/vscode/worktrees`. A
worktree does not automatically share its own dependency installation with
the primary workspace; run `npm ci` in it before development. Worktree
metadata refers to `/workspaces/skyttel`, so keep that mount path stable when
recreating the environment.

## Tool versions and updates

The devcontainer Dockerfile pins Node.js 24.21.0 with the same base-image
digest as the production Dockerfile. npm 11.19.0 comes from that pinned
Node image.
Debian packages resolve against snapshot `20260915T000000Z`, including
Python, Make, a C/C++ compiler, SQLite tools, Git, and browser libraries.
The remaining pins are:

<!-- markdownlint-disable MD013 -->
| Tool | Version and source |
| --- | --- |
| Dev Containers CLI | 0.89.0 in the root npm lockfile. |
| Playwright | 1.63.0 in both npm projects; Chromium, Firefox, and WebKit in the image. |
| Sharp | 0.35.4 in the root npm lockfile. |
| Codex CLI | 0.154.0 in `.devcontainer/tools/package-lock.json`. |
| Codex VS Code extension | 26.908.40401, with architecture-specific VSIX checksums. |
| GitHub CLI | 2.101.0, with archive checksums. |
| .NET SDK | 8.0.425, with archive checksums. |
| GitVersion | 6.8.2 from the versioned .NET tool package. |
| VS Code Server installer CLI | 1.138.0 at a fixed commit, with archive checksums. |
<!-- markdownlint-enable MD013 -->

The pinned VS Code Server provides the extension installation command in the
image. The user's VS Code application manages its own remote server when
attaching. The Codex extension is installed from the verified local VSIX
during image creation and startup; automatic extension updates are disabled
for this workspace. Record the actual remote server and extension backend
versions for client verification. The CLI version does not establish the
extension's backend version.

The image download pins and architecture-specific checksums are in
`.devcontainer/install-tools.sh`. The image supports Linux AMD64 and ARM64.
Sharp is available for native-library use; the application does not yet
expose image handling.

Keep the Node version in `.node-version`, the package engine range, both
production-image base references, and the devcontainer base reference
compatible. Update the Playwright package, lockfile, and image browser
installation together in both npm projects so the driver and browser
revisions match. Update other image tool pins and artifact checksums
together, and advance the Debian snapshot when updating OS packages. Rebuild
the devcontainer, start the app, and run the relevant existing application
checks before accepting a base-image or native-toolchain update. Run
`npm run test:container` separately when production-image inputs change.

The build context contains only `.devcontainer` files. Project dependencies
are installed from the workspace after the image is built. Neither source
checkout secrets nor personal configuration are copied into the image.

## Troubleshoot startup

Use **Dev Containers: Show Container Log** in VS Code to inspect build,
dependency-installation, and lifecycle failures. A failed lifecycle command
must remain visible; do not continue on the assumption that the environment
is ready. After fixing configuration, rebuild the container or rerun the
relevant lifecycle command from the container terminal:

```sh
bash .devcontainer/post-create.sh
bash .devcontainer/post-start.sh
```

The first command reinstalls dependencies. The second preserves the private
environment file, checks writable state directories, and installs the pinned
extension. Errors remain in lifecycle output. Do not clear a persistent
volume to hide a startup failure.

If the application does not become ready, inspect the development terminal
output and check that `/data` is writable and the private environment file
contains all required values. A provider error with synthetic defaults is
expected when attempting sign-in. A database migration failure keeps
`/healthz` unready; preserve the database when investigating it.

If a native dependency cannot load, run `npm ci` inside the container. The
separate `node_modules` volume prevents macOS or Windows binaries from being
used on Linux. Do not copy a host dependency directory into the container.

## Codex permissions and remaining verification

Run `codex` in the container terminal to start the
[Codex CLI](https://learn.chatgpt.com/docs/cli), or open the
[Codex sidebar](https://learn.chatgpt.com/docs/ide) in the attached VS Code
window. Sign in inside the chosen client. The clients start their own
backends; container startup does not start a separately managed daemon.
The [app-server protocol](https://learn.chatgpt.com/docs/app-server) supports
client-spawned processes. Inspect the client's terminal or VS Code output
when its backend fails to start.

Three independent controls apply: Docker/Linux capabilities constrain the
container; Codex sandbox policy constrains commands inside it; and Codex
approval policy controls which exceptional commands require consent. Host
Docker-engine access is a separate capability. An approval inside Codex does
not add Linux capabilities or grant access to the host Docker engine.

Use the normal profile first. No elevated fallback profile is supplied.
Do not disable the Codex sandbox to work around a container limitation.
Capture the exact error and whether it concerns namespaces, `/proc`,
seccomp, the app-server, authentication, network access, or command policy.
A sandbox denial of an out-of-scope write is expected protection and does
not itself justify elevated container privileges.

[Issue #25](https://github.com/viscalyx/skyttel/issues/25) owns the authenticated
functional verification separately for Codex CLI and the VS Code extension.
It records actual backend versions, verifies that the extension runs inside
the container, and checks reading and editing a probe file, running a project
test, and starting the app through each client. It also verifies an expected
sandbox denial, a specifically approved command, and session/authentication
persistence after restart and rebuild. Only evidence of a container
restriction justifies investigating the minimum additional Linux rights
for the affected client.

An ordinary devcontainer start does not perform those signed-in client
sessions and does not establish that both clients have identical permission
needs. A successful version command or app-server handshake is not a full
client test. Record actual host OS, CPU architecture, Docker and client
versions, profile, exact error, and result when reporting verification. Keep
credentials and private session contents out of that evidence.
