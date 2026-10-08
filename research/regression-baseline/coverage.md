# Regression coverage inventory

Evidence for the decision **Establish current regression coverage and
resource-cost evidence**. Read-only source inspection; no tests or builds
run by this inventory agent. Expanded test discovery is supplied by the
parent session at `integration-discovery.json`.

## Limits and counting rules

The discovery has **737 tests in 107 specs**. Every `.spec.ts` source under
`tests/integration` appears in discovery. There are **493 distinct case
IDs**, carried by 690 expanded tests; 47 expanded tests have no case ID.
The source has 47,477 lines. None of these numbers establishes quality,
coverage equivalence, execution time, or redundancy. A simple source
regex sees 533 literal/template test calls, but misses computed titles
and cannot expand generators; use Playwright discovery for test counts.

This inventory reads titles, scenario bodies, representative assertions,
support boundaries and manual cases. It is not an assertion-by-assertion
proof for all 737 scenarios. All overlap, gap and possible layer movement
judgments are provisional and require an explicit protected-behavior
comparison before changing a test.

Repository policy requires scenario IDs in functional Playwright titles
and a spec link plus exact title in the matching manual case. Equivalent
isolated fixtures may differ from manual data, but must preserve roles,
state and access boundaries. Pixel geometry belongs in automation;
functional workflows and observable accessibility belong in manual cases.

## Family protection matrix

File names in this matrix omit `.spec.ts`; the expanded per-spec appendix
below records the exact discoverable scenarios. Each entry describes
observable protected behavior and the regression it can expose.

- **Access and onboarding** (`access`, `access-onboarding`, `bootstrap`,
  `usability`): first administrator, authenticated household creation,
  malformed/cross-origin rejection, identity collision resistance,
  denied/expired/outage login recovery, keyboard onboarding and lost
  bootstrap replies. Fails if an outsider acquires identity/membership,
  setup partially commits, a failed creation is falsely reported, or
  revoked/logout clients retain protected work. Representative state and
  HTTP checks: `access.spec.ts:5`, `:38`, `:88`, `:122`; these lower-level
  tests are not equivalent to browser onboarding focus checks.
- **Membership and identity linking** (`invitations`, `membership-ui`,
  `linking`): one-time recipient codes, replacement/revocation, expired
  attempts, two-provider proof, last-administrator protection, role
  boundaries, real/manual clipboard fallback and retirement of an open
  workspace. Fails on code replay, wrong identity linking, cross-household
  administration or inaccessible multi-step recovery. HTTP authority and
  UI/focus are separate evidence even when they share a story.
- **Startup and seed administration** (`startup`, `database-setup`):
  redacted invalid configuration, occupied listener, clean signal shutdown
  and SQLite reopen, safe configuration before reset, reset rollback,
  deterministic configured Google/Microsoft administrator. Fails on
  secret diagnostics, damaged prior database/session or unintended access.
- **External assistants** (`assistants`, `assistant-work`,
  `assistant-advanced`): OAuth, explicit household/AI consent, scoped
  neighborhood reads, private drafts, stale requests, revoked tokens,
  retained historical type meanings, unknown MCP save outcomes and fresh
  whole-draft saves. Fails on information exposure, assistant mutation
  without authority, partial/duplicate save or forged historical actions.
- **Complete object and relationship forms** (`object-dialog`,
  `relationship-dialog`, `relationship-dialog-accessibility`,
  `relationship-outcome-absence`, `object-actions`): one full staging
  mutation, validation/focus for closed sections, explicit field loss,
  pending-send guards, rejected/unknown/absent outcomes, duplicate
  relationships, current-basis retry, unsent loss protection and truthful
  current outcomes. Fails when retained local values are lost, a stale
  attempt overwrites later work, or focus/controls become unreachable.
- **Basic household facts and workflows** (`map`, `map-workflows`,
  `family`, `draft-creation`): Swedish search, equal-name identities,
  identified/unspecified/unresolved distinctions, families with separate
  service/account/subscription/payment objects, directed edges, atomic
  draft/save and restart. Fails on false identification, identity merging,
  lost independent facts or missing edges. `family.spec.ts:32` uses public
  HTTP assertions for eight objects and a durable relationship receipt;
  `draft-creation.spec.ts:23` uses complete UI forms and new private types.
- **Object definitions and presentation** (`object-types`,
  `object-sections`, `object-builtins`, `type-change`): shared editable
  definitions, four field kinds, zero/false versus unanswered, configured
  ordering/labels, private section arrangement, hidden answers,
  historical type meaning, confirmed loss on repeated type changes and
  rejection of newly invalid/concurrent values. Fails on value loss,
  misinterpretation, private disclosure or partial save.
- **Relationship definitions and presentation** (`relationship-types`,
  `relationship-fields`, `relationship-sections`): directed names from
  both endpoints, arbitrary endpoints, fields and hidden sections,
  same-identity duplicates, opposite direction, conflicting definitions
  and whole-draft rejection. `relationship-types.spec.ts:369` checks a
  409 stale save and unchanged draft; `:655` onward protects concurrent
  duplicate identity and independent work. Object-type cases cannot
  substitute for these endpoint/direction invariants.
- **Definition retirement** (`definition-removal`): reviewed removal of
  unused custom/prefilled types/fields, used/ended/private-draft guards,
  historical reads without resurrecting definitions or private disclosure.
  Fails on automatic cleanup, removing a needed definition, or leaking
  another user's private dependency.
- **Financial contracts** (`contract-forms`, `contract-relationships`,
  `contracts`): optional rent, dated debt, credit limit versus utilization,
  separate financing/insurance/payment/ownership roles, old draft upgrade,
  whole-save validation/conflicts and historical reading. Fails on
  invented financial facts, conflated roles, partial saves, invalid
  upgraded draft or loss of independent financial values.
- **Draft reading and removal** (`draft-review`, `draft-removal`): full
  before/proposed values, validity/status separation, hidden labels,
  accessible readers, independent removal, real dependent proposals,
  stale confirmation, terminal-row focus and lost discard outcomes.
  Fails when a removal silently consumes unrelated proposals, unknown
  outcomes replay a mutation, or reading misses relevant values.
- **Draft save and feedback** (`draft-save`, `draft-status`, `operations`,
  `transport-controls`): one durable save/receipt, private pending attempts,
  lost reply recovery, reopen/restart, stale-draft rejection, readable
  legend/status/toasts, explicit checks and later-focus preservation.
  `operations.spec.ts:14` and `:78` distinguish after-commit lost replies
  from before-commit interrupted pending attempts. Transport controls
  deliberately hold real form requests and real committed replies.
- **Conflict base and property choices** (`draft-conflicts`,
  `conflict-properties`): four content kinds, explicit independent
  property choices, saved/current/proposed values, saver attribution,
  invalid combinations, stale comparisons, no implicit shared-map save.
  Fails on partial resolution/save, lost unrelated proposals, wrong
  attribution or an obsolete choice being accepted.
- **Conflict continuity and special cases** (`conflict-continuity`,
  `conflict-special`, `conflict-external-corrections`,
  `conflict-definition-restoration`): choices across reopen/background
  save, stale guards per property, applied versus unsent lost replies,
  endpoints/duplicates/removals, ordinary correction of missing types,
  historical answer labels, reviewed restoration authority and fresh
  review after import generation replacement. Fails on replay, false
  private success, unauthorized restored identity or focus theft.
- **Map camera and interaction** (`spatial`, `map-camera`,
  `map-navigation`, `map-selection`, `map-selection-details`): independent
  selection/detail/navigation, empty-space gestures, direct neighbors,
  camera history, personal rotation/placement, six movement directions,
  mouse/keyboard/touch/trackpad and graphics/access loss. Fails on camera
  jumps, unintended mutation, lost personal view, unreachable text
  alternatives or unprotected unsent forms.
- **Search, tables and text reading** (`object-search`, `map-exploration`,
  `object-list`, `object-list-flow`, `household-table`,
  `household-reading`, `large-map`): Swedish word normalization/custom
  fields, combined filters, direct versus transitive context, separate
  map/table restrictions, natural sorting/paging, full historical/proposed
  values, graphics-free relationship chains and focus after vanished rows.
  Large-map protection reaches all 500 objects and 1,500 relationships;
  `large-map.spec.ts:95` onward checks actual Chromium accessibility-tree
  relationship controls on ten pages. Table/filter tests also assert that
  read-only navigation leaves map/draft state unchanged.
- **Personal choices and workspace continuity** (`personal-view`,
  `workspace-shell`, `workspace-panels`, `household-work`,
  `settings-profile`): display choices, personal/private positions,
  stale personal mutations, toolbar/theme focus, limited-space work,
  retained conversation/form/draft across navigation, and retirement
  after revocation/replacement/erasure. Fails on lost work, disclosure,
  focus theft, hidden active work with retired authority or blocked controls.
- **Images and icons** (`profile-images`, `profile-image-types`,
  `profile-image-work`, `object-icons`): whole-form text/icon/image staging,
  valid/invalid upload, cancellation, replace/remove/history, access checks
  and readable icon search/focus in narrow/short themes. The 19-type
  `BILD-06` generator asserts a single complete proposal and matching
  receipt (`profile-image-types.spec.ts:111`, `:139`), and verifies invalid
  staging leaves the previous draft intact. Fails on partial fields,
  restoring an old image accidentally, or image access without membership.
- **Lifecycle** (`lifecycle`): ended versus removed content, known elapsed
  dates, independent statuses, connected removal and historical reading,
  overlapping object/relationship IDs and accessible status. Fails on
  automatic false ending or removal, conflated identities or misleading
  old/proposed edge descriptions.
- **History** (`history`): latest completed receipts only, full historical
  values/definitions/icons, direct links, preserved unsent work/table
  search and retry/focus during delayed reads. Fails on exposing private
  rejected/pending attempts or describing old values using new meanings.
- **Export/import/recovery** (`household-export-ui`,
  `household-export-content`, `household-import-ui`,
  `household-import-history`, `household-import-definitions`,
  `household-import-recovery`, `household-import-settings`,
  `household-import-discovery`, `household-import-cancel`,
  `household-recovery`, `household-recovery-accessibility`,
  `household-owners-ui`): real archive download/restoration, all identity,
  image/history/private content, authorized explicit replacement,
  cancellation cleanup, exact uncertain attempt across navigation or a
  newer import, administrator handover, local storage failure, fresh
  review after restart and assignment of historical private ownership.
  Fails on data loss, applying an old attempt to a new generation,
  retaining export files after revoke, or private ownership disclosure.
  `household-recovery.spec.ts:9` constructs source, destination and third
  installations, so its portability path is distinct from same-household
  import UI. `household-import-recovery.spec.ts:5` explicitly verifies
  unavailable staged data leaves content unchanged before fresh review.
- **Permanent erasure** (`household-erasure`): reviewed exact scope,
  cancellation, changed-scope rejection, restart cleanup, cross-admin
  recovery, exact known attempt, unrelated content/private work, image
  history, local storage failure, retired replies and focus/contrast at
  short/narrow sizes. Fails on erasing more than reviewed, reporting
  success from the wrong attempt, or losing continued cleanup authority.
- **Conversation authority** (`conversation-consent`,
  `conversation-settings`): explicit per-user/household consent, text/voice
  intent, session versus remembered consent, revocation across devices,
  changed text version, revoked member rejoin, preserved private work and
  already registered saves finishing. Fails on unauthorized start/data
  processing, silent retained consent or lost work during revocation.
- **Conversation execution** (`text-assistant`, `assistant-map`,
  `voice-assistant`, `voice-box`, `microphone-press`, `voice-errors`,
  `conversation-queue`, `conversation-voice-text`, `save-check`): controlled
  providers produce tool requests, private whole-draft work, late/negative
  replies, exact durable save recovery, microphone startup/stop/interrupt,
  FIFO queues, voice/text handover and truthful verified spoken save
  status. Fails on late mutation, duplicate receipt/playback, recording
  after interrupted start or claiming save from provider prose alone.
- **Conversation surfaces and context** (`conversation-context`,
  `conversation-capacity`, `conversation-summary`,
  `conversation-notices`, `conversation-audit`,
  `conversation-accessibility`, `conversation-questions`,
  `conversation-draft`, `conversation-help`, `conversation-widths`,
  `mobile-conversation`, `text-view`, `text-button-status`): shared
  ephemeral context through modes/restarts/errors, truthful percentage
  thresholds, automatic summarization, queued recorded speech, notice
  priority/identity, accessible announcements, unread/work/question
  markers, draft readers, personal widths and mobile visible height.
  Fails on stale context, lost draft/recorded speech, repeated announcement,
  obscured controls or unconfirmed prose becoming receipt evidence.
- **Connected end-to-end work** (`connected-work`): two complete family
  journeys from login through conversation, ordinary correction, settings,
  durable single receipt, history, private continued work and second-member
  boundaries. Voice and text/no-graphics/no-audio are distinct modes.
  `connected-work.spec.ts:235`, `:297`, `:488`, `:511` assert private
  proposals before save, unchanged shared values, retained other-user work
  and exactly one receipt; this is interaction evidence, not only happy-path
  button clicking.
- **Costs and accessibility infrastructure** (`costs`,
  `accessibility-measurements`): operator-only monthly costs, incomplete
  usage without double counting, error/restart/unknown settings save and
  focused details. Six contrast-helper checks validate RGB/sRGB/OKLCH,
  color mixing and rejection of nonopaque surfaces. They protect the
  accuracy of other accessibility assertions, not application workflows.

## Generated variants and repeated work

Expanded repetition is not a complete cross-product of every behavior and
every browser/role/device. Some dimensions generate separate tests, others
are loops inside one test with a single installation.

- `BILD-06`: 19 complete image workflows, one per 18 built-in object types
  plus a custom type. Each creates its own installation and real images,
  then stages/saves/replaces/checks invalid upload/removes. Candidate
  repeated setup/workflow; equivalence requires proving every type uses
  the same behavior plus testing any real type-specific boundary.
- `RADERING-06`: five viewport pairs times light/dark = 10 tests; pairs
  are 1280×900, 390×900, 320×900, 640×500, 320×250. All run reduced motion
  and an actual review/cancel/explicit erasure sequence. Geometry/focus
  varies; the destructive state transition repeats.
- `KARTA-09`, `KARTA-08`, `TYP-11`: 1280/390/320 widths times light/dark =
  six complete workflows each, with staging/save/restart. This is visible
  repetition across responsive/theme matrices, not proof it can be reduced.
- `BILD-04`: four viewport pairs times two schemes = eight rejected-image
  complete-form workflows. `BILD-05`: three width variants.
- `TEXTMOBIL-01`: eight device/size variants; `TEXTMOBIL-02`: four heights/
  device variants. Touch/mobile configuration matters in addition to width.
- `NOT-07`: six viewport variants; `NOT-08`: three. No-ID notice fitting
  generates four configurations: desktop, phone, wide touch and short
  touch. No-ID voice-box placement generates desktop/wide-touch/narrow.
- `UTKAST-53`: 10 expanded tests across multiple scenario declarations,
  including surface, chosen side and responsive width. This count combines
  distinct state transitions as well as variants; it must not be treated
  as ten interchangeable copies of one assertion.
- Other generators vary object/relationship/definition kinds, applied
  versus unsent outcomes, map/table surface, microphone state, failure
  class, key combination/OS or Google/Microsoft identity. These dimensions
  frequently alter authority or outcome rather than appearance.
- Internal loops also multiply work without discovery multiplication:
  `conversation-consent.spec.ts:291` tests two themes, contrast of each
  text/control, multiple initiating buttons and narrow widths in one
  case; `conversation-settings.spec.ts:164` visits different membership
  roles within one scenario; `large-map.spec.ts:95` traverses all ten
  pages and relationship controls. Counting tests alone misses this cost.

Common repeated setup motifs: isolated installation, synthetic sign-in,
household creation, public-HTTP seed mutations, browser navigation;
family object/relationship creation; draft staging followed by durable
save, server restart and reread; second-user/context creation; real image
encoding; archive export and reimport. These are hypotheses about where
time/resources are spent. Profiled runtime/process measurements are needed
before assigning cost or deciding to share setup (which can alter isolation).

## Traceability audit

Whitespace-normalized exact title search finds **662 of 737** expanded
titles somewhere in top-level manual Markdown. That is a coarse locator,
not a requirement-conformance measure: a title can occur in an evidence
report instead of its actual runnable case. Variant docs sometimes list
one base title followed by dimensions; that intentionally does not match
every expanded title literally.

- `TABELL-03` and `TABELL-05` have no exact ID string anywhere in the
  top-level manual Markdown. `TABELL-04` appears only as `TABELL-04/05` in
  `workspace-verification.md:223`; its exact title is absent. Inspection
  of `object-lists.md` does not find a runnable TABELL case section;
  `TABELL-01`/`TABELL-02` links occur in the verification report at lines
  90–91. These are concrete mapping candidates, not evidence the automated
  scenarios lack assertions.
- The 47 no-ID tests comprise HTTP security/setup/identity/startup cases,
  two `map` regressions, three lower-level conflict cases, six
  contrast-helper tests, four notice-fit variants and three voice-placement
  variants. The contrast file explicitly says it is infrastructure rather
  than an application workflow. Some other no-ID checks are lower-level
  companions to a functional case; absence of IDs alone is not a reason to
  delete or duplicate them. Functional ones need deliberate mapping review.
- `RADERING-06`, `EXPORT-09` and `IMPORT-15` have base titles and dimensions
  in manual cases rather than all exact expanded names. Audit scripts must
  understand this convention before labeling each variant unmapped.
- Multiple scenario declarations deliberately reuse one ID (`UTKAST-53`,
  `UTKAST-50`, `UTKAST-55`, `KARTA-07`, etc.). An ID-to-single-test map loses
  evidence. A traceability model needs one case to many exact scenario
  names and one scenario to its assertions/variant configuration.
- Manual guide instructions ask for desktop/mobile, keyboard/touch, themes,
  200/400% zoom and human screen-reader/device checks in places. Browser
  viewport and DOM/live-region assertions do not establish actual device,
  speech understanding, physical microphone/speaker or screen-reader
  output. The ordinary controlled-provider suite is intentionally separate
  from billable real-model/real-voice suites and manual execution.

## Provisional overlap and gap judgments

1. **Strongest visible repetition candidate:** complete durability/image
   workflows repeated for all 19 object types, and full state transitions
   repeated across viewport/theme matrices. Establish true type/variant
   equivalence and retain targeted interaction/geometry checks before any
   consolidation; current evidence does not authorize removal.
2. **Lost save reply is repeated at distinct seams:** `operations`, `map`,
   `draft-save`, `text-assistant`, `voice-assistant`, `assistant-work`,
   `save-check`, `transport-controls`, `household-work`, plus conflicts.
   Shared invariants are one durable attempt/receipt and no replay. Unique
   evidence includes browser/modal focus, current draft authority, consent,
   voice playback, MCP token scope, lifecycle/navigation and generation.
   A common invariant test cannot replace these seam-specific assertions.
3. **Family workflows overlap by data but differ by guarantee:** `family`
   protects household entities/directed identity with HTTP; `text-assistant`
   and `voice-assistant` protect transport/tool orchestration; `connected-work`
   protects continuity among screens/forms/conversation/private users;
   `draft-creation` protects new private definitions used by complete forms.
   Overlap of names or fixture values does not establish redundant coverage.
4. **Focus restoration appears across many specs:** table rows, native
   readers, draft rows, modal follow-up, notices, navigation and settings.
   Each has a different disappearing opener or delayed-response boundary.
   Consolidate only if the implementation seam and observable behavior are
   demonstrably shared and one test still crosses each required integration.
5. **Confirmed traceability gap, unresolved behavior gap:** TABELL cases
   and functional no-ID scenarios need precise manual mapping review.
   No claim of missing automated assertions follows from ID/title absence.
6. **Known limits, not new defects:** discovery says no execution result;
   code asserts controlled provider behavior rather than real model
   comprehension; Chromium and simulated media/touch are not human assistive
   technology or real-device verification. Real provider suites are excluded
   unless explicitly authorized. No unit/browser companion-suite adequacy
   conclusion is made by this integration-only inventory.

## Machine-readable evidence

- Expanded source locations and suite ancestry:
  `expanded-tests.json`.
- Coarse case ID/exact-title audit:
  `traceability.json`.
- Literal source calls with assertion-mention counts:
  `coverage-index.json`.

Assertion-mention counts are a search aid only: helper assertions,
`expect.poll`, branching and repeated loops mean they are not independent
protected-behavior counts.

## Expanded per-spec scenario index

[expanded-tests.json](expanded-tests.json) retains all 737 exact titles,
source locations and suite ancestry across 107 files.
