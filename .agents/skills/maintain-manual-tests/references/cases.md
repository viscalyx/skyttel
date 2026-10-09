# Manual cases

## Case writing

Resolve [area template](../templates/area.md) links from the destination under
`docs/manual-tests/`.

- Write concrete Swedish UI actions and observable outcomes. State the
  failure purpose of each bounded variant.
- Keep technical assertions (requests, identifiers, receipt replay, archive
  inspection, pixels, and geometry) in automation or separately runnable
  preparation. Separate preparation commands, required inputs, expected setup,
  and reset steps from the UI procedure.
- Reuse existing fault tools at the actual failure boundary. A lost reply after
  a committed transaction requires control of response delivery; taking the
  browser offline alone does not establish that failure.
- Verify current controls, content, and outcomes in both manual cases and
  matching specs. When retiring UI, describe and assert the resulting workflow
  and remove checks whose sole purpose is confirming the old element's absence.
  Keep functional absence checks for filtering, permissions, and state
  transitions such as closing a dialog.

## Mapping and identity

### Counterparts

Give each ordinary case one discovered functional counterpart. Compare its UI
actions and protected outcomes with the test's actual actions and assertions;
a request-only check cannot establish browser-form behavior. Isolated fixtures
may differ from manual data when roles, state, and access boundaries are
equivalent. Exact test-title transcription in manual prose is optional.

Tag request-only or archive-only integration tests with `{ tag: '@technical' }`.
They require no manual UI case and cannot serve as ordinary counterparts.
Browser workflows stay functional even when they also assert technical facts.

### Identity lifecycle

Keep one stable ID per ordinary scenario and discovered functional test.
Prefix the Playwright title with `CASE-ID:`; generated scenarios each need
their own ID. Functional title IDs must be unique and agree with their manual
case.

Preserve IDs across renames and moves. Split distinct surviving workflows into
new IDs, update index and links together, and record retired IDs with their
survivor or accepted coverage loss in the affected area. Retired IDs remain
unavailable for reuse.

### Metadata

Place one JSON block fenced as `manual-mapping` beneath each `### CASE-ID: ...`
heading. Enclose only the fenced block in an HTML comment (`<!--` and `-->`)
to hide metadata in rendered Markdown. Keep required configuration,
preparation, steps, outcomes, and human observations in visible case prose.
Use the template's ordinary or human-observation branch. Supply:

- `reference`: selected configuration and bounded variants, including their
  failure purpose where several variants share one discovered test.
- `outcomes`: a nonempty array of protected observable results.
- Exactly one `counterpart` object or `humanObservation` object.
- `counterpart`: repository-relative `spec` path and exactly one `caseId` or
  `title`. A `title` selects an exact discovered name; use
  `describe title > test title` when a describe path disambiguates it.
  A `caseId` selects the stable ID prefix. Either selector must resolve to one
  test after generated definitions expand.
- `humanObservation`: `kind` and a concrete `observation` the human must perform.
  Kinds are `screen-reader`, `physical-microphone-audio`, `os-permission`,
  `physical-input`, `visual-symbol-recognition`, and `external-client`.
  Name the actual speech, device, permission, physical action, symbol meaning,
  or external-account/client compatibility required. Paid or nondeterministic
  execution alone is not a human exception.
- Optional `evidence` array: each item has `kind` (`overlap`, `technical`, or
  `real-provider`), a `spec`, exactly one `title` or `caseId`, and `purpose`.
  Integration overlap and technical references resolve by discovery.
  Real-provider references verify the file and selector structure without
  loading or executing that separate suite. Record actual provider execution
  separately from human observation and synthetic integration.

Evidence never adds a second ordinary counterpart. Human-observation cases may
cite nearby automation as evidence without claiming it performs the human
observation.
