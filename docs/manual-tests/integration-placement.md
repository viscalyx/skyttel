# Integration coverage and technical evidence

This record helps test maintainers choose a suite, preserve regression
boundaries and compare verification costs. Manual cases remain the source
for public UI actions and observable outcomes.

## Technical case dispositions

[The case ledger](../../tests/coverage-disposition.json) identifies every
expanded technical case by source title, destination selector, disposition
and preserved boundary. Its baseline is commit
`eb3bcff9b1e6fb6a3bbda2172c64777349e4b4b8`: 847 integration tests in 141 files,
including 86 technical cases and 761 functional cases. The ledger also
identifies the three archive migrations already present at this baseline,
accounting for all 89 technical cases in the earlier inventory.

- 62 cases run in Vitest's server project with real HTTP clients,
  disposable SQLite installations, processes or TCP sockets. Their
  assertions and synthetic provider boundaries remain intact.
- 23 cases run in the separate Playwright technical browser suite. Actual
  Chromium cookie delivery, page-executed recipes and launcher-controlled
  browser interactions require that boundary. Node owns the installations
  and child processes; these are supporting evidence, not manual cases.
- One theme ownership case consolidates into the existing server theme
  test. Both protect anonymous denial, origin and malformed-input rejection,
  account isolation and ownership independent of household membership.
  TEMA-01 separately protects real browser persistence, restart and another
  client. This is the only deletion of a tagged technical case.

The existing linking, browser-binding and remembered-login server tests
use the application request interface. The migrated transport tests retain
real redirects, cookie jars, delayed delivery, concurrent authority and
restart. Similar endpoint assertions do not establish equivalent transport
coverage. The existing export-stream test retains interruption of an actual
HTTP transfer on both demotion and revocation.

Preparation variants retain distinct preconditions: an empty household
detects assumptions about seeded content; a seeded household detects damage
to existing work. Voice preparation uses only empty desktop and seeded
short-screen combinations. The launcher commands, literal browser recipes,
fault responses and cleanup stay coupled to their actual consumers.
Existing server tool tests cover independent launcher and transport APIs.

Mapping validation rejects technical tags anywhere in integration,
including area-scoped validation. Technical browser and server evidence
cannot serve as ordinary counterparts. Gate tests exercise discovery without
executing hooks, missing evidence and attempted exemptions.

## Functional review and retained variants

The review covers all functional source definitions, including generated
variants and delegated helpers. Counts alone and the absence of inline
locator calls do not classify a journey. The following decisions identify
the failure purposes of retained matrices and the reductions.

<!-- markdownlint-disable MD013 -->
| Area | Decision and distinct failure purposes |
| :-- | :-- |
| PLACERING-15/16 | Keep desktop and dense mobile system-setting journeys with light ocean. The seven-motif freeze/resume/reset matrix runs in Chromium scene tests at both widths. Desktop protects the broad canvas; mobile protects reachable navigation and settings with little free background. |
| BAKGRUND-03/04 | Keep light/dark selection, focus, theme isolation, restart, reload and second-client persistence. Keep object reading at 16/80 objects and 1440/390 pixels because label density and panel reachability differ. Shader colour/direction and stillness checks run separately once per theme and width, not in five persistence capture passes. |
| LISTA-05 | Use 46 objects and no relationships: the last named row still requires more than 500 pixels of scrolling and hidden controls at 320 × 250. Preserve focus, uncovered hit targets, both scroll positions and returns through settings, map and details. STORKARTA-01 retains 500 objects and 1,500 relationships. |
| TYP-11/18–22 | Keep TYP-11 at desktop/light, TYP-20 at mobile/dark and TYP-21 at 320/light. Retire TYP-18 into TYP-11, TYP-19 into TYP-20 and TYP-22 into TYP-21. Separate component tests cover property input and type-selector contrast and reflow at all three widths in both themes. Theme does not change the save boundary. |
| Background appearance, stability and accessibility | Keep keyboard selection, persistent choices, table fallback, graphics recovery and short responsive navigation. The existing compositor contrast matrix remains technical. No additional credit is claimed for that earlier migration. |
| Spatial map, selection, camera and personal placement | Keep geometry that verifies visible selection, hit targets, focus rectangles, popup reachability, movement and keyboard/touch access. Graphics-unavailable and canceled gesture cases protect different input and recovery paths. Existing occlusion and camera mathematics stay in browser technical tests. |
| Images and property forms | Keep real upload/staging rejection, private versus saved images, historical reading, type changes, restart and revoked access. Small generated image buffers are inputs; decoding and archive completeness remain server evidence. Narrow form geometry verifies that real actions stay reachable. |
| Conflict, save and draft workflows | Keep map/table entry points, saved/proposed choices, object/relationship/definition conflicts and lost-before/lost-after delivery. These differ in authority, available recovery controls or resulting private work. Width variants protect modal versus panel reachability and focus after disappearance of the last conflict. |
| Export, import, erasure and recovery | Keep actual download/upload, explicit ownership assignment, destructive-action confirmation and interrupted recovery through UI. File/stream/archive assertions remain supporting evidence at real transfer or server boundaries. Responsive variants protect the long review, assignment and error controls. |
| Account, membership, storage and theme | Keep browser forms, first visits, competing tabs, browser locks, cookie refusal, focus and uncertain-result recovery. HTTP-only authorization moves to server coverage; delayed cookie delivery remains a technical browser contract. |
| Conversation, context and voice controls | Keep UI delegation through helpers, text/voice continuity, queue and cancellation, context thresholds, held responses, microphone state, notices and consent. Desktop keyboard, narrow desktop and coarse-pointer variants protect distinct controls and input paths. Preparation launcher correctness is separate from these journeys. |
| Lists, search, reading and workspace navigation | Keep sorting/pagination, independent map/table filters, composition input, graphics fallback, native form protection and recovered focus. Short-height, narrow-width and coarse-pointer variants protect different hidden controls, scrolling and input events. |
| Settings, help, notices and feedback | Keep public open/change/close flows, focus return, disabled/saving states and readable feedback. Embedded contrast/geometry assertions support the visible outcome of that flow; standalone rendering matrices stay technical. |
<!-- markdownlint-enable MD013 -->

The three retired type IDs remain reserved in the area document. Their
duplicate persistence executions are removed; their widths and both themes
remain covered. No security, revocation, transfer, restart or upgrade
boundary is intentionally lost. Theme-specific interaction across the full
type-change workflow is sampled at the three retained combinations, while
the complete theme/width presentation matrix runs at the component boundary.

## Measurement and verification

Baseline execution on 2026-10-31 selects all 86 technical cases plus
PLACERING-15/16, BAKGRUND-03/04 and LISTA-05. All 91 pass. Playwright reports
488.50 seconds elapsed. Summed test durations are 168.31 seconds for technical
cases, 104.14 for ocean, 97.27 for reduced motion and 114.83 for table return.
This local run uses the existing application build and default fonts,
Chromium and one worker. The application source is unchanged by this work.

After migration, discovery and measured verification are recorded with the
completed run results. Local suite times do not measure the hosted workflow
critical path: CI includes setup, builds, coverage, containers and parallel
integration groups. The technical browser suite runs after unit coverage,
so its cost belongs to that job when comparing actual CI completion times.
No hosted workflow speedup is inferred from fewer integration cases.
