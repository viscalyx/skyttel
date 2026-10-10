# Evaluation run support

## Prepare a paid run

Read `scripts/model-evaluation/catalog.json`, `judge-controls.json` and
`profiles.json` for the approved scenarios, controls and provider profiles.
Use the catalog's exact ordered utterances, full fixture and whole-state
expectations. Older model tests supply diagnostics, not this catalog's oracle.

Resolve each model's provider from the user's selection or verified provider
metadata. Ask the user when the choice is ambiguous. Inspect the runner's
adapters and profile schema to confirm support for every selected provider,
including the content judge and voice provider. If an integration is missing,
stop and explain the missing capability; preserve the user's selection.

Verify model IDs, supported effort settings, context/input/output limits,
service tier and all applicable input/cache-read/cache-write/output prices
against that provider's official documentation. Refresh `profiles.json` when
needed. Record unavailable profiles without substituting a model or provider.

### Credentials

Find each provider adapter's credential configuration and verify that the
required key or token is readable by the evaluation process. Check presence
without printing its value. If it is missing, stop before any paid call and
explain the provider-specific setup: where to obtain the credential, the exact
environment variable or secret setting the adapter reads, and how to make it
available to this session.

Use the private environment-file workflow in
[`docs/development/devcontainer.md`](../../../../docs/development/devcontainer.md)
when the adapter reads environment variables. Load the configured file into
the evaluation process, or explain which environment reload or session restart
is needed. Give instructions for the selected provider rather than an assumed
provider. Keep credential values out of chat, reports and committed files.

### Spending

Credentials and opt-in flags are configuration. Require explicit authorization
for the complete dollar ceiling, including prior calls and outstanding holds.
Verify prior consumption from original usage evidence. Account for a documented
conservative reservation in full, distinguishing it from estimated actual
spending. Unknown prior charges block payment.

Verify exact token counting for the complete outgoing payload and its fee
before supplying `EvaluationPlan.counting`. Reserve and settle counting fees
through the same ledger. Without verified counting, leave dependent summary
steps unrun; independent scenarios can proceed when conservative whole-context
reservations fit. Byte-based estimates, assumed cache hits and missing fees
cannot establish that a request fits.

Run focused evaluation application, budget, provider, report, audio and voice
integrity tests through npm before payment. Require real isolated SQLite/MCP
save receipts and history, plus observed rejected unsolicited saves. Record
commands and evidence in `localVerification`.

## Use the runner

Create a distinct `model-evaluation` run issue before payment. Record a run
identifier, timestamp, commit, selected scenarios, repetitions, profiles,
authorization, catalog provenance and previous comparable runs.

Call `evaluateModels` through `npm run test:env -- tsx` using a temporary
agent-written driver. Supply the user's selected `textProfiles`, an explicit
`voiceProfile` when evaluating voice, the application's `baselineProfiles`,
a separately verified `judgeProfile`, authorization, verified prior spending,
local verification and eligible recorded `references`. Read `EvaluationPlan`
in `scripts/model-evaluation/evaluate.ts` for the current interface. Keep raw
requests, observations, reports and the persistent atomic ledger in ignored
`model-evaluation-results/<run-id>` artifacts. Keep raw transcripts and
credentials private.

The judge is a separate model that assesses semantic response requirements
that fixed application-state checks cannot decide. Choose and record its model
and effort in the run configuration. Its calibration must pass before its
verdicts can support a comparison. Check recorded references against the current
`judgeSha256`, which identifies the judge provider, model, effort, instructions
and controls.
The runner executes 19 independent human-approved judge controls first, using
one call to the selected judge per control and requiring all 21 expected
outcomes. A control deviation, missing usage or failed local gate stops
comparison. Selected text profiles use all 14 text scenarios; selected voice
profiles use eight voice scenarios. Alternate supplied profile order between
repetitions.

Enable `EvaluationPlan.escalateEffort` only for a requested effort survey.
Explicitly supplied profiles run directly at their requested effort.
Within a survey, escalate a supplied model to medium, then high, only
after a confirmed behavior failure in a complete lower-effort round. Repeat
all text scenarios at each effort. Errors, timeouts, inconclusive judgments
and budget stops provide no basis for escalation or retries.

Preserve the application, assistant, MCP, write guards and SQLite. Select one
backend/summary profile and its context capacity per run. Summary scenarios use
the internal ordinary-summary hook, preserve eight neutral historical posts
and prove that the price turns are outside the tail. Keep context limits and
usage authentic; summaries come from the selected model.

For voice, verify the checked-in audio's SHA-256, frame count, reference text
and PCM mono 16-bit 22050 Hz format. Keep ordinary dialogs connected, close
before final judging and summary, then reopen after summary installation.
Use the actual audio path rather than replacement speech or injected
delegations/transcripts.

Reserve complete request maxima and remaining active dialog time before each
paid call. Account for failures, interruptions, reasoning, cache writes and
open judge waits. Unknown usage retains its hold and stops new calls. Close
active voice sessions promptly on stop. The authorized ceiling stays fixed.

## Preserve and publish evidence

Private observations retain fragment/delegation/request IDs, offsets, arrival
times, actual backend text, MCP calls/results, commentary and output
transcripts. Label missing or ambiguous links; diagnostics cannot establish
success without the required evidence.

Judge each step once in one tool-free call covering all requirements. Keep
backend text and spoken transcript as separate sources. Missing required
content in complete text fails; incomplete collection without proof is
inconclusive. Stop dependent steps after fail, error, aborted or inconclusive
outcomes. Unrun steps have no judge result.

Timing starts at text submission or reference-audio end and finishes at the
later of correct state and the final required response fragment. Preserve
negative voice times. Report the two-second quiet observation separately,
along with startup, first backend/result and individual MCP timings. Failed
attempts retain observed stop/error times without successful completion times.

Publish all returned records on the run issue with their embedded versioned
JSON intact. Group related records into readable comments when useful.
For multiline GitHub text, write an exact temporary file with an editing tool,
then issue a separate literal
`gh ... --body-file /absolute/path` command. Verify real newlines in the issue
body and retrieved comments. Publish corrections as new comments referencing
the original records.

When evaluator or fixture defects invalidate a run, explain the cause and
affected evidence, remove its `model-evaluation` label and close the issue.
Treat a calibration stop before candidate testing the same way. Retain the
records and charges for diagnosis and spending reconciliation. Correct the
cause before starting a new run; keep valid candidate failures in evaluation
history.

Present correctness first. Qualification requires every fixed/content check
to pass in all three repetitions. Report equally weighted scenario medians,
min/max, each repetition's total, costs and regressions. Label comparisons in
text as well as red/yellow/green. A timing-based switch requires at least 10%
and one second improvement, with lower totals in every repetition. A failed
reference and qualified candidate may support a correctness recommendation
without comparable speed. Three repetitions do not establish a statistically
certain ranking.

Even on stop, report missing attempts, remaining budget, a new conservative
completion estimate, comparison limitations and a recommendation. Identify a
single repetition as preliminary and an unfinished evaluation as incomplete.
