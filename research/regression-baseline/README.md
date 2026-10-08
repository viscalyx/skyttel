# Regression coverage and resource evidence

Evidence for
[Establish current regression coverage and resource-cost evidence](https://github.com/viscalyx/skyttel/issues/265)
within
[Resource-conscious regression testing policy and suite review](https://github.com/viscalyx/skyttel/issues/264).
This is a planning asset. It proposes no test removal or resource limit.

## Findings that affect the next decisions

- Playwright discovers 737 cases across 107 files. The inventory identifies
  their protected behavior and failure modes, with all exact titles and
  locations retained. Counts alone do not measure protection or cost.
- Full image workflows repeat across 19 object types. Several full
  workflows also repeat across viewport/theme matrices. These are review
  candidates; equivalent behavior and replacement coverage remain unproved.
- Similar lost-response, focus and family workflows cross different
  authority, persistence, native-browser and lifecycle boundaries. Their
  shared names or fixtures do not establish redundant protection.
- The suite called unit includes pure rules, real app/authentication/SQLite,
  actual HTTP, jsdom and real Chromium/WebGL. Its label is not a resource
  classification. Browser coverage checks mechanisms replaced in jsdom.
- Current measurements expose failures: 1,603 of 1,612 Vitest cases pass;
  nine graphics cases fail. The browser sample and workflow gates pass.
  Resource observations from the failing run include failure waits and
  must not be presented as a passing baseline.
- Branch coverage is close to its gate. The current coverage map has
  12,552 of 13,951 branches covered, or 89.97%, below the configured 90%.
  Moving a check outside Vitest can change this metric even when behavior
  remains covered. This needs an explicit policy decision.
- Some table scenarios lack runnable manual-case mappings. This is a
  traceability finding; it does not establish missing automated assertions.
- Native Mac and CI process-tree resource measurements remain unavailable.
  The attached measurement procedure makes those observations reproducible.

## Version, environment and method

Initial source and clean working tree:
`020273b1d3dc2fc7eb7428480fd62b29d060a0e5`.
A concurrent commit,
`3fe4a187597f1ff5b4adf2a611e5be91d74d46e9`, changes one manual-documentation
line only. Its tested source, tests, scripts, lockfile and configuration are
identical. That change is preserved; the original checkout remains clean.

The measurement host is a Linux aarch64 container on LinuxKit, with 10
available CPUs, about 23.43 GiB RAM visible through `/proc/meminfo` and
1 GiB system swap. Its cgroup exposes no CPU quota or memory maximum.
These are VM/container observations, not the user's Mac specification or a
GitHub runner specification. The cgroup includes unrelated VM work.

Installed tools: Node 24.21.0, npm 12.0.2, Playwright 1.64.0, Chromium
156.0.8078.4, Vitest 5.0.3, TypeScript 7.0.2 and Vite 8.3.3.
The build and all measured test commands
use repository npm scripts and the shared process lock. Measurements set
`CI=1`; Vitest and browser integration use the existing CI font profile.
Concurrency, retries, fixture code and application code are unchanged.
Dependencies and browser binaries are already installed; installation cost
is excluded. A fresh application build precedes integration execution.

Playwright retains one worker, no retries and sequential execution. Vitest
retains one worker and sequential files. Its configuration requests
graphics/server/client groups, and the guide describes that order, but
this run's timestamps show server/client/graphics. The projects are
sequential in the measured run; the requested order is not demonstrated.
See [project observations](unit-project-observations.json).

[environment.json](environment.json) retains configuration/lockfile hashes,
selected nonsensitive environment settings, source identity, VM limits,
manual-document hashes and built-client hashes. Exact commands, completion
times, exit codes and methods live in each measurement JSON.

The sampler reads process descendants once per second and excludes its own
Python process. Summed RSS can double-count shared pages. PSS apportions
shared pages and is captured when readable. Samples can miss brief
processes and peaks; all maxima are observations, not resource limits.
Sampled CPU records accumulated process user/system ticks and can miss
short-lived work. Child CPU accounting also omits some browser descendants;
it must not replace tree sampling. Cgroup counters cannot be attributed
solely to these commands.

## Measured commands

<!-- markdownlint-disable MD013 -->
| Command scope | Result | Wall seconds | Peak tree RSS, GiB | Peak tree PSS, GiB | Peak sampled CPU cores | Peak processes |
| --- | --- | --- | --- | --- | --- | --- |
| Application build | Pass | 2.02 | 0.81 | 0.72 | 3.00 | 7 |
| Full Vitest with coverage | 1,603 pass; 9 fail | 655.82 | 2.73 | 2.29 | 1.88 | 14 |
| Selected browser integration | 56 pass; 0 fail | 136.25 | 2.04 | 1.55 | 2.25 | 15 |
| Workflow gates | 154 pass; 0 fail | 4.03 | 0.46 | 0.22 | 0.51 | 9 |
| Ten fixture cycles, including command startup | Pass | 2.02 | 0.41 | 0.28 | 1.15 | 6 |
<!-- markdownlint-enable MD013 -->

Short build/gate/fixture commands are particularly under-sampled. For
example, gates record only 0.62 sampled CPU seconds but 4.15 seconds of
child CPU accounting. The long Vitest and integration runs record 479.81
and 147.15 sampled CPU seconds respectively; integration child accounting
reports only 52.65 seconds. Neither method proves complete tree CPU usage.

No cgroup OOM events or quota throttling occur. The Vitest interval adds
about 33 milliseconds to cgroup memory-stall counters. The cgroup's broad
scope and uncapped limits prevent a conclusion about acceptable headroom
on either supported target. This observation does not diagnose resource
pressure as the cause of any failure.

These runs occur sequentially. There is no full current integration run,
container run or devcontainer run in this local measurement. The selected
56 cases are a deliberate sample of nine files, not a statistical sample
or evidence that the other 681 cases pass. Selection does not establish
future test-selection policy. Exact selected cases are in
[integration-selected-cases.json](integration-selected-cases.json).

## Family cost evidence and its limits

Vitest executes 854 server/shared cases, 661 client cases and 97 graphics
cases across 75, 61 and 8 files respectively. The first-to-last-case windows
are about 192, 285 and 172 seconds. Summed case durations are about 155,
251 and 170 seconds; setup/import/report time makes these different from
command wall time. Maximum observed RSS/PSS within those windows is about
1.84/1.51 GiB, 2.36/2.02 GiB and 2.73/2.29 GiB. These are command-tree
observations during each project, not isolated per-file allocations.

The largest Vitest case-duration totals include client map (78.23 seconds),
server voice (26.95), server text (26.37), client conversation workflows
(25.92), client native HTTP workflows (22.67) and household boundaries
(22.47). Graphics spatial uses 117.52 seconds with seven failures, so it
cannot be ranked as normal passing work. Durations help locate follow-up
investigation; they do not prove high memory or low regression value.
See [all file durations](unit-file-durations.json).

Within the browser sample, the 19 image-type cases total 41.31 seconds,
connected workflows 20.55, save 16.85, spatial 24.24, large map 10.50,
icons 7.68, onboarding 10.06, recovery 2.09 and export content 0.62.
This shows observable repeated work without estimating savings from
removal. The ten-second large-map case checks all 500 objects and 1,500
relationships; a long duration alone does not make it low value.
See [case results](integration-case-results.json) and
[file totals](integration-file-durations.json).

Ten sequential fresh installation/seed/close cycles measure startup at
23.86–60.41 milliseconds (median 24.98), demo seeding at 55.23–67.75
milliseconds (median 59.60) and close at 4.46–12.71 milliseconds (median
6.01). Dependencies remain warm. No browser, authentication flow, archive,
image work, active HTTP polling or restart is included. These numbers
cannot be multiplied into a full-suite setup estimate: not every case
uses the same seed or fixture. See [individual cycles](fixture-cycles.json).

[layers.md](layers.md) identifies setup/cleanup mechanisms: migrations,
auth schema verification, HTTP drainage, browser contexts, image encoding,
explicit waits, polling, subprocesses and Docker lifecycle work. It
distinguishes a timeout ceiling from an actual wait. None of the source-only
cost drivers is assigned an unmeasured memory or CPU cost.

## Failures and historical CI evidence

The current nine failures are all in graphics:

- Seven spatial cases use a status selector that matches both their
  scenario status and the application's status region. Strict matching
  fails; this does not by itself establish broken domain behavior.
- Consent-box placement expects a lower bound of 525.80 but observes 521.
- A landscape toolbar case times out while clicking a control.

[unit-results-slim.json](unit-results-slim.json) preserves exact failed
titles, errors and all results. It excludes the large raw coverage map;
[unit-coverage-summary.json](unit-coverage-summary.json) preserves aggregate
counts calculated from that map. The command exits 1 because tests fail.
The branch percentage is below the configured threshold, but this JSON
reporter emits no separate text threshold-failure message. No production
or test fix is made in this planning task. No failing check is treated as
a retirement recommendation.

A recent sample of 25 CI runs has 15 successes, 8 failures, 1 cancellation
and 1 run still in progress when queried. They use different commits and
include dependency and functional changes. That is not a flake-rate
estimate. Four failures are inspected:

- [Dependency-update coverage failure](https://github.com/viscalyx/skyttel/actions/runs/37768953908):
  all 1,606 tests pass, but 89.99% branches fails the 90% gate.
- [Provider-update sign-in failure](https://github.com/viscalyx/skyttel/actions/runs/37759268497)
  and [another update failure](https://github.com/viscalyx/skyttel/actions/runs/37764012910):
  expired-provider verification fails to show the expected login alert.
  Repetition across changed commits does not establish a flaky test.
- [Functional-change failures](https://github.com/viscalyx/skyttel/actions/runs/37744618942):
  manual voice fixture, provider startup error checks and diagnostics
  expectation fail. The evidence is insufficient to classify each cause
  as product regression, test maintenance or environment variation.

[A successful older CI run](https://github.com/viscalyx/skyttel/actions/runs/37785717739)
uses `9e98f3e545741faf5adcdab0f55f4147877e948a`: 1,607 Vitest cases pass
with 90.10% branches, and 730 integration cases pass using one worker.
Its unit step spans 18m01s and integration 31m03s. Logs identify Ubuntu
24.04.5 runner images; unit and integration use different image revisions.
They provide no process-tree memory/CPU baseline. Job timestamps also show
dependency/browser installation, repeated builds, container checks and
devcontainer work; aggregate runner time is distinct from the longest job.
[CI metadata](ci-success-jobs.json), [run sample](ci-runs.json) and
[narrow log excerpts](ci-excerpts.json) retain the primary evidence.

The historical 719-case/two-worker verification report in the repo is
separate evidence at its stated source version. It is not a current
resource baseline. The current-head CI run remains in progress at the
recorded query and is not counted as a current success.

## Coverage, traceability and unresolved evidence

[coverage.md](coverage.md) maps every integration file to behavior/failure
families. [expanded-tests.json](expanded-tests.json) retains all expanded
titles, source lines and suite ancestry. The inventory is representative
assertion inspection, not an assertion-by-assertion proof for every case.

The traceability audit finds 493 distinct case IDs in 690 expanded tests,
47 tests without IDs, and 662 titles found literally in normalized manual
Markdown. A title in a verification report is not a runnable manual case;
base titles with documented variants also need interpretation. The audit
does not reduce this to a pass percentage.

Table cases are a concrete mapping gap: some IDs/titles appear only in a
verification report, while others have no exact ID occurrence. Multiple
automated scenarios can share a stable case ID; future mapping must retain
that relationship. See [traceability.json](traceability.json).

Remaining evidence and decisions:

- Native Mac RAM/headroom, swap, pressure, thermal effects and responsiveness.
- Actual CI process-tree CPU/memory under its recorded runner environment.
- A passing full Vitest resource baseline after the exposed failures are
  addressed in a separate implementation effort; effects of coverage
  instrumentation and reporter choice remain unmeasured.
- Full current integration peaks, production/container resource cost,
  fixture allocation attribution and repeat-run variation.
- Assertion-level equivalence before simplifying type/width/theme variants,
  and deliberate replacement or loss of coverage for any proposed change.
- The policy role of global coverage thresholds when checks move layers.

[MEASUREMENT.md](MEASUREMENT.md) gives a small native Mac and Linux/runner
procedure using the attached Python samplers and unchanged npm scripts.
Native Mac sampling is provided but not executed. No real-model or
real-voice suite, billable provider call, physical-device test or human
screen-reader test is performed. Resource policy, test-layer choices and
retirement decisions remain for their human-in-the-loop tickets.
