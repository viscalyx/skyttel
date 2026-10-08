# Layer and fixture evidence

Source inspection only. No builds or tests run by this investigator. Runtime,
CPU, peak RSS, filesystem size and relative cost are not measured here.
Counts below are file discovery counts, not executed test-case counts.

## Current boundaries and distinct protection

- **Server/shared Vitest project:** 70 server test files and 5 shared files;
  node environment. Contains pure domain checks, actual SQLite/migrations,
  in-process application requests, and actual loopback HTTP installations.
  Calling all of this “unit” conceals substantial integration coverage.
  [Project discovery](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/vitest.config.ts#L25).
- **Server domain/persistence families:** map/drafts/conflicts/save receipts,
  types/sections/fields and their migrations, relationships/contracts,
  membership/authentication, profile images, export/import/erasure/recovery,
  assistants/conversation/voice/costs, manual fixture launchers and operation
  configuration. These protect stored values, validation, idempotency,
  authorization and migration outcomes independently of browser behavior.
  Example: migration application/reopen/file permissions, rollback after bad
  SQL, migration sequence/history drift:
  [Database tests](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/database.test.ts#L32).
  Archive compatibility parameterization covers schema versions 14 through 25
  while preserving content/history:
  [Import tests](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/household-import.test.ts#L85).
  Provider action combinations must not mutate drafts, questions must not
  grant saving authority, and receipts cannot be fabricated:
  [Provider contract tests](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/conversation-provider-contracts.test.ts#L60).
- **Shared families:** household names, type definitions, conversation
  commands, conflict-property/boundary helpers. Protect normalization and
  rule combinations without app setup, native rendering or network. Example:
  combined values reject absent endpoints and invalid section/property order;
  conflict rendering retains saved/proposed/historical field meanings:
  [Conflict boundaries](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/shared/conflict-boundaries.test.ts).
- **Client jsdom project:** 61 files. Covers App/navigation/shell,
  household work/read/forms/dialogs, drafts/save/conflict/leave ownership,
  conversation lifecycle/preferences/context/notices/recovery, voice input
  and transport, membership/administration, image/import/export/erasure,
  personal views/map controls and search. Mixes controlled fetch responses
  with public HTTP/real SQLite fixtures. Distinct protection includes precise
  race ordering, late reply suppression, retained unsent input, request
  ownership, retry semantics and compositional client logic. Example:
  [Network lifecycle](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/client/conversation-network-lifecycle.test.tsx#L47).
  Public HTTP-backed shell example tests a lost household-creation reply and
  recovery without a second household:
  [App shell HTTP](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/client/app-shell-http.test.tsx#L102).
  Native household workflows mount actual HouseholdMap/FormLeaveProvider,
  interact through public controls, and save through the real endpoint:
  [Unit workflow helpers](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/native-household-unit.tsx#L8).
- **Graphics Vitest project:** 8 Chromium files. Real WebGL,
  CSS/layout, native pointer/touch/wheel input, visibility/focus/modal and
  responsive constraints. These protect mechanisms deliberately absent or
  replaced in jsdom. Spatial-scene reads actual WebGL pixels and checks
  camera/placement/perspective/star behavior:
  [Spatial-scene tests](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/browser/spatial-scene.test.tsx#L102).
  Spatial tests include context loss/recovery, direction/labels, dense
  layouts, long press and reduced motion:
  [Spatial tests](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/browser/spatial.test.tsx#L1565).
  Selection acknowledgements require actual visible map and details, reject
  hidden/occluded/collapsed targets:
  [Assistant selection](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/browser/assistant-selection.test.tsx#L145).
  Household layout tests use real components/CSS but controlled fetch state;
  protect retained views, editor focus, native form loss, mobile geometry and
  dialog reachability:
  [Household layout](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/browser/household-layout.test.tsx#L66).
- **Playwright integration:** 107 spec files, real loopback installations,
  real authentication/session/database/app, built client asset, controlled
  external provider responses. Adds production client/server wiring and user
  flows to the assertions above. Can protect browser behavior and API
  persistence together; does not imply external providers or physical voice
  devices were validated.
  [Runner](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/playwright.config.ts#L5),
  [Installation fixture](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/installation.ts#L32),
  [Testing guide](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/docs/development/testing.md#L79).
- **Workflow gates:** 22 Node test files in script/release/security test
  directories. Protect lock inheritance after wrapper death, font-profile
  selection, useful retained failure diagnostics, CI failing pipeline status,
  devcontainer managed configuration, release planning/candidate/publication,
  deployment stale-candidate and migration/health/identity boundaries,
  operator-note gates, restore/acceptance, scan evidence, exceptions and image
  monitoring. These are tooling protection separate from household flows.
  Some invoke child processes or disposable directories/repositories; they
  are not all pure-function tests.
  [Lock tests](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/__tests__/test-process-lock.test.mjs#L12),
  [CI diagnostics](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/__tests__/ci-test-diagnostics.test.mjs#L24),
  [Deploy checks](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/release/__tests__/deploy.test.mjs#L138),
  [Image monitoring](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/security/__tests__/monitor-images.test.mjs#L140).
- **Container checks:** production image/runtime/native library assertions,
  non-root UID/GID, absence of package managers and test-auth endpoints,
  migration/readiness/identity logging, persistent drafts/saved content/
  receipts/images surviving restart and replacement; erasure, assistants,
  text/voice, costs and recovery extension checks. Unique protection includes
  actual Alpine/pruned sharp encode/decode and Docker volume/UID semantics.
  [Container checker](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/check-container.mjs#L162).
- **Devcontainer checks:** a separate Docker suite builds the developer image
  and exercises standard/elevated compose profiles with disposable storage;
  protects development tooling hooks/settings/storage persistence.
  [Devcontainer checker](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/check-devcontainer.mjs#L67).

## Factual setup and cost drivers

- Vitest config requests one worker, sequential files and
  graphics/server/client group order. The measured run executes
  server/client/graphics (see README). Playwright uses one worker, no
  retries and non-parallel tests. Gate script
  uses Node test concurrency 1. Local build/test scripts share a host flock;
  contention fails immediately with status 75. This limits overlap but does
  not measure or bound peak RSS of any one browser/process.
  [Vitest config](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/vitest.config.ts#L6),
  [Playwright config](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/playwright.config.ts#L7),
  [npm scripts](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/package.json#L35),
  [Process lock](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/testing/run-with-test-environment.py#L42).
- Static literal inspection: 30 server files and 6 client files mention
  createInstallation; 33 server and 13 client files mention
  applicationFixture. These categories overlap and omit indirect helpers;
  they are indicators of fixture use, not fixture execution totals.
- createInstallation creates a temporary directory/SQLite path, starts a
  loopback HTTP server, opens/migrates DB, constructs/verifies Better Auth,
  alters only social-provider adapters, then constructs the application.
  restart repeats stop/start on the same DB. close drains HTTP idle
  connections every 25ms until server.close completes, awaits app.close,
  closes DB and removes the directory.
  [Startup](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/installation.ts#L73),
  [Shutdown](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/installation.ts#L177).
- applicationFixture creates a temporary DB, optionally copies a snapshot,
  applies migrations/verifies auth and creates the application. Requests use
  app.request with a fixture cookie jar rather than a listening socket.
  close closes DB and deletes the directory; it does not invoke app.close.
  This observation alone does not establish a leak.
  [Application fixture](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/fixture.ts#L24),
  [Fixture close](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/fixture.ts#L133).
- HTTP-backed jsdom tests also allocate Playwright APIRequestContexts and
  adapt fetch using actual HTTP responses and cookies. They avoid Chromium
  rendering but retain server/database/auth cost. app-shell-http creates two
  contexts and can replace its first installation when installing a model.
  [HTTP adapter](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/authenticated-http-fetch.ts#L3),
  [Client setup](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/client/app-shell-http.test.tsx#L23).
- jsdom globally substitutes WebGLRenderer, scroll/layout APIs, matchMedia,
  ResizeObserver, dialog showModal/close and Web Audio. Browser checks cannot
  be discarded based solely on matching user-flow names because these native
  mechanisms are absent from jsdom.
  [DOM setup](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/client-dom.ts#L3).
- Image fixtures include sharp native PNG/WebP/GIF work and random-pixel
  images in profile-image/export/erasure suites, not merely copied bytes.
  [Images](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/profile-images.test.ts#L13),
  [Export images](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/household-export.test.ts#L366),
  [Erasure images](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/unit/server/household-erasure.test.ts#L81).
- Source-visible real waits include spatial long press 600ms; integration
  voice-box 3500ms/1500ms, microphone-press 200–1100ms,
  conversation-summary 3000ms and object-search 1700ms. Poll timeouts such as
  7000ms selection or 13000ms voice cleanup are upper bounds, not guaranteed
  elapsed duration. Fake timers exist in some lifecycle suites and should be
  distinguished from real waits before optimization.
  [Long press](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/browser/spatial.test.tsx#L1598),
  [Voice box](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/integration/voice-box.spec.ts#L179),
  [Microphone press](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/integration/microphone-press.spec.ts#L68),
  [Summary wait](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/integration/conversation-summary.spec.ts#L383),
  [Search wait](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/integration/object-search.spec.ts#L51).
- Manual costs helper spawns a tsx Node child with line-event protocol and
  10s failure timeout; shutdown sends quit then SIGTERM and waits for exit.
  Similar manual launcher/server tooling families require child processes.
  [Costs child](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/tests/support/manual-costs.ts#L4).
- Container check builds an image unless SKYTTEL_CHECK_IMAGE is supplied,
  creates two volumes and multiple containers, runs HTTP clients with Docker
  exec, repeatedly restarts/replaces containers, polls readiness up to 30s
  with 250ms delay, executes native image transformations inside runtime,
  then removes containers/volumes and its own generated image. Command
  timeout 60s is a limit, not actual elapsed cost.
  [Build/setup](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/check-container.mjs#L18),
  [Readiness](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/check-container.mjs#L115),
  [Native image check](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/check-container.mjs#L254),
  [Cleanup](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/scripts/check-container.mjs#L415).
- CI runs unit and integration in independent jobs, each installing npm,
  dependencies and Chromium and building first. application depends on both,
  also installs Chromium/builds, runs gates/typecheck/lint/docs and container
  checks; devcontainer and security are additional jobs. Therefore aggregate
  CI runner-minutes and longest-job wall time are separate measures. Locally
  npm test builds then unit then integration, whereas npm check runs gates,
  build and coverage but excludes integration/container/devcontainer.
  [CI](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/.github/workflows/ci.yml#L15),
  [npm composition](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/package.json#L35).
- Coverage instruments all src TS/TSX and emits text/HTML/lcov, enforcing
  85% statements/lines/functions and 90% branches. Costs and coverage effects
  of moving/removing a test need measurement; file count is not coverage.
  [Coverage](https://github.com/viscalyx/skyttel/blob/020273b1d3dc2fc7eb7428480fd62b29d060a0e5/vitest.config.ts#L42).

## Provisional overlap, not removal recommendations

- Same domain operations (draft save/retry/conflicts, forms, conversation
  ownership, import/export/erasure) appear at server, client HTTP, graphics
  and Playwright levels. They often protect different failure modes:
  persistence/authorization vs UI race ownership vs native behavior vs built
  wiring. A scenario/assertion comparison is needed before classifying a
  redundant check.
- Candidate seams for later decisions: isolate domain validation from repeated
  installation setup; preserve a small built-client/SQLite flow per important
  boundary while examining purely data assertions repeated in browser suites;
  distinguish genuine physical-time behavior from arbitrary settling sleeps;
  share deterministic immutable image inputs only where transformation itself
  is not what the test protects.
- Container persistence and profile-image checks overlap in outcomes with
  server suites but test actual production packaging/storage/native execution.
  Gate diagnostics overlap with CI configuration assertions but test failure
  evidence mechanisms. Neither overlap alone justifies deleting the layer.
- Unknown: current elapsed/CPU/RSS/disk ranking by family, repeated fixture
  time attribution, actual versus timeout waiting, assertion-level duplicate
  scenarios, and effects of coverage instrumentation/browser reuse.
