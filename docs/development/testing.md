# Run Skyttel tests

Prepare dependencies and Chromium with the
[development environment guide](devcontainer.md). Run these commands from
the repository root. Automated tests create temporary databases and
synthetic identities; they need no provider credentials or running
`npm run dev:all` process.

## Unit tests

Run the complete Vitest suite:

```sh
npm run test:unit
```

Run one file, or filter its test names with a regular expression:

```sh
npm run test:unit -- tests/unit/server/config.test.ts
npm run test:unit -- tests/unit/server/config.test.ts -t 'default listener'
```

For repeated edits, start watch mode and leave the terminal running:

```sh
npx vitest watch tests/unit/server/config.test.ts
```

Vitest reruns affected tests after changes. Press Ctrl+C to stop watching.
The npm `test:unit` script uses `vitest run`, so it exits after one run.

Use `--project server`, `--project client` or `--project graphics` to select
one configured project. Graphics tests use headless Chromium with WebGL 2:

```sh
npm run test:unit -- --project graphics
npm run test:unit:coverage
```

Coverage checks every TypeScript and TSX file under `src`. The thresholds
are 85% for statements, lines and functions, and 90% for branches. The
coverage command prints its summary and writes an HTML report under
`coverage/`. Unit tests do not need an application build first.

## Integration tests

Playwright starts isolated application installations and drives the browser
and public HTTP endpoints against real SQLite. External provider responses
are controlled. Rebuild before running browser tests so their client bundle
matches the current source:

```sh
npm run build
npm run test:integration
```

Run one spec, or select tests by a title fragment or case ID:

```sh
npm run build
npm run test:integration -- tests/integration/bootstrap.spec.ts
npm run test:integration -- --grep 'ACCESS-01'
```

List selected tests without executing them:

```sh
npm run test:integration -- tests/integration/bootstrap.spec.ts --list
```

`npm test` builds the application, then runs all unit and integration tests.
The ordinary suites do not make billable provider calls. Keep their inputs
synthetic and do not point fixtures at an existing household database.

## Investigate browser failures

Playwright retains traces for failures under `test-results/`. Generate an
HTML report for a focused run and open it on port 9324:

```sh
npm run build
npm run test:integration -- tests/integration/bootstrap.spec.ts --reporter=html
npm run test:report
```

In the devcontainer, open the forwarded port from VS Code's **Ports** panel.
The report contains the failed assertion, error context and retained trace.
Stop the report server with Ctrl+C when finished. Keep reports and traces
local; fixture inputs must contain only synthetic data.

For interactive reruns in a host browser, start Playwright's UI on the same
forwarded port after stopping any report server:

```sh
npm run build
npm run test:integration -- --ui --ui-host=0.0.0.0 --ui-port=9324
```

Keep the forwarded port private. Select the affected spec or test in the UI
and inspect its actions and assertions. Rebuild after changing application
client code before rerunning. If your environment has a graphical display,
`--debug` instead opens the Playwright Inspector with a visible browser.

For controlled provider delays and failures in a manual browser session,
use the [local text-assistant launcher](../manual-tests/setup/text-assistant.md).

## Complete the development checks

After focused tests pass, run the full repository check:

```sh
npm run check
```

This runs typechecking, Biome, documentation checks, workflow gate tests,
the build, unit-test coverage and Playwright integration tests. It does not
run the optional container or real-provider checks below.

Run an individual check while correcting its findings:

```sh
npm run typecheck
npm run lint
npm run lint:fix
npm run lint:docs
npm run test:gates
```

`lint:fix` applies Biome's fixes. Review the resulting changes and rerun the
relevant check. Markdown lint and spelling checks are separate from Biome.

## Container and environment changes

With a running Docker daemon, run the check matching the changed inputs:

```sh
npm run test:container
npm run test:devcontainer
```

`test:container` builds the production image with disposable storage and
synthetic configuration. It checks startup, permissions, migrations and
persistence across restarts, then removes its test containers and volumes.
It does not deploy the image or verify a live provider registration.

`test:devcontainer` checks both development profiles using isolated storage,
including restart and container recreation. See the
[state and rebuild guidance](devcontainer.md#state-and-rebuilds) when changing
development configuration.

Run `npm run measure:map` separately from other suites. Its
[measurement plan](../manual-tests/large-map-performance.md) defines the
dataset, network conditions, readiness boundaries and report options.

## Optional checks with real providers

These commands require explicit private configuration:

- `npm run test:real-model`: model interpretation through MCP. Follow the
  [model evaluation guide](../manual-tests/real-model-tests.md).
- `npm run test:real-voice`: recorded Swedish speech through WebRTC, Live
  and Terra. Follow the
  [speech evaluation guide](../manual-tests/real-voice-tests.md).
- `npm run test:installation`: read-only checks of HTTPS, deployed version
  and security monitoring against actual Render images. Follow the
  [monitoring guide](../operations/security-monitoring.md#automated-live-verification).

Missing configuration fails these commands. It is not a passed or skipped
verification. Record the tested commit and actual result separately from
discovery and tests using provider substitutes. Ordinary CI does not use
live accounts or call paid providers.
