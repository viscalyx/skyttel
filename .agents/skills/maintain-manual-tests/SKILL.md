---
name: maintain-manual-tests
description: >-
  Maintain manual cases and their Playwright integration tests. Use when
  adding, changing, moving, renaming, or removing manual cases or integration
  tests; maintaining the manual-test index; or editing the testing guide.
---

# Maintain Manual Tests

## Workflow

For index-only or testing-guide-only work, use steps 5 and 6.

1. Identify the requested scenarios, accepted requirements, affected specs,
   and existing cases under `docs/manual-tests/`. Derive expected behavior
   from the requirements. Apply this workflow to scenarios in scope;
   backfill unrelated existing scenarios only when requested.
2. Classify each change. Synchronize functional scenario additions, changes,
   and removals with matching manual cases and Playwright coverage in the
   same change. Allow selector, flake, title, setup, and refactoring
   maintenance without production changes when behavior and coverage remain
   intact; update manual cases only when instructions or references change.
   Keep production fixes within authorized requirements and preserve valid
   assertions when a test exposes a defect.
3. For case additions or revisions, read
   [the area template](templates/area.md). Use its full structure for a new
   area file; reuse its case section within an existing area. Replace every
   placeholder with runnable Swedish instructions and observable results.
   Resolve template links from the destination file under
   `docs/manual-tests/`.
   Write concrete Swedish UI actions and observable outcomes. State the
   failure purpose of each bounded variant. Keep technical assertions
   (requests, identifiers, receipt replay, archive inspection, pixels and
   geometry) in automation or separately runnable preparation. Describe
   preparation commands, required inputs, expected setup and reset steps
   separately from the UI procedure. Reuse existing fault tools for the
   actual failure boundary; offline work cannot substitute for a lost reply
   after a committed transaction.
   In manual cases and matching specs, verify current controls, content,
   and observable outcomes. Exclude checks whose only purpose is to confirm
   that a removed or nonexistent UI element is absent, such as looking for
   an old button or panel. When retiring UI, remove those checks from both
   the manual cases and specs; describe and assert the resulting workflow.
   Preserve functional absence checks for filtering, permissions, and
   state transitions such as closing a dialog.
4. Complete [mapping metadata](#mapping-metadata) for each affected case.
   Give each ordinary case one discovered functional counterpart. Include
   its stable case ID in the Playwright title; generated scenarios each
   need their own ID. Exact title transcription in manual prose is optional.
   Compare the case's UI actions and protected outcomes with its counterpart;
   a request-only check cannot establish browser-form behavior. Isolated
   fixtures may differ from manual data when they exercise equivalent roles,
   state, and access boundaries. Mark actual human observations explicitly.
   Apply the identity lifecycle rules in the metadata reference below.
5. Group cases by application area, independent of demo fixtures or individual
   pages. Maintain `docs/manual-tests/README.md` as the area index; update its
   links and summaries whenever area files or their documented coverage
   change. Keep application test steps in manual cases. Keep
   `docs/development/testing.md` focused on test execution, without links to
   manual cases or their index.
6. Validate changed documents with the repository's Markdown and spelling
   checks, including new files outside the configured check list. Resolve
   local links and run `npm run test:manual-mapping` for complete migrations,
   or repeat `-- --area docs/manual-tests/<file>.md --area <other-file>`
   for affected areas during staged migration. The scoped command checks
   selected cases and global manual ID uniqueness; the full command also
   requires every functional discovered test to have one manual counterpart.
   For changes to test behavior or execution, run the affected integration
   tests using the repository's test guidance. For title-only changes, verify test
   discovery. Report updated cases, checks performed, and any remaining
   coverage gaps; report manual execution only when actually performed.

## Mapping metadata

Place one JSON block fenced as `manual-mapping` beneath each
`### CASE-ID: ...` heading. Use the area template for the ordinary or
human-observation branch. Supply:

- `reference`: selected configuration and bounded variants, including
  their failure purpose where several variants share one discovered test.
- `outcomes`: a nonempty array of protected observable results.
- Exactly one `counterpart` object or `humanObservation` object.
- A `counterpart` reference: repository-relative `spec` path and exactly
  one `caseId` or `title`. A title selects an exact discovered name; use
  `describe title > test title` when a describe path disambiguates it.
  A `caseId` selects the stable ID prefix. Both must resolve to one test
  after generated definitions expand. Functional title IDs must be unique
  and agree with their manual case.
- A `humanObservation`: `kind` and a concrete `observation` the human must
  perform. Kinds are `screen-reader`, `physical-microphone-audio`,
  `os-permission`, `physical-input`, `visual-symbol-recognition` and
  `external-client`. Name the actual speech, device, permission, physical
  action, symbol meaning or external-account/client compatibility required.
  Paid or nondeterministic execution alone is not a human exception.
- Optional `evidence` array: each item has `kind` (`overlap`, `technical`
  or `real-provider`), a `spec` and `title` or `caseId`, and `purpose`.
  Integration overlap and technical references resolve by discovery.
  Real-provider references verify the file and selector structure without
  loading or executing that separate suite. Record any actual provider
  execution separately from human observation and synthetic integration.

Tag genuinely request-only or archive-only integration tests with
`{ tag: '@technical' }`. They need no invented manual UI case and cannot
serve as ordinary counterparts. Browser workflows stay functional even
when they also assert technical facts. Additional evidence never adds a
second ordinary counterpart. Human-observation cases may cite nearby
automation as evidence without claiming it performs the human observation.

Keep one stable identity per ordinary scenario and discovered functional
test. Preserve IDs across renames and moves. Split distinct surviving workflows
into new IDs, update index and links together, and record retired IDs and their
survivor or accepted
coverage loss in the affected area. Retired IDs remain unavailable for reuse.
The structural command resolves identities and references; assess functional
equivalence by comparing the actual actions and assertions.
