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

If the provider rejects requests because of quota, credits or an enforced
account spending limit, stop paid execution and explain the provider's error
and the account setting needed to restore API access. Record untested models
as unrun and preserve the rejected request's evidence and cost accounting.

### Spending

Credentials and opt-in flags are configuration. Require explicit authorization
for billable calls. Apply a dollar ceiling only when the user specifies a
budget; otherwise execute the authorized scope without a cost ceiling.
For a specified budget, record its scope: per model run or combined campaign.
Include prior calls and outstanding holds within that scope. A per-run ceiling
covers calibration, backend, summary, voice and counting for that model's entire
run, rather than a new allowance for each scenario. Report campaign spending
separately; preserve historical ledgers when the authorization scope changes.
Verify prior consumption from original usage evidence. Account for a documented
conservative reservation in full, distinguishing it from estimated actual
spending. Unknown charges retain their holds and must be resolved before new
payment.

Use conservative whole-context reservations for every request, including
summaries. Exact counting is optional: verify the complete outgoing payload and
its fee before supplying `EvaluationPlan.counting`, then reserve and settle
counting fees through the same ledger. Missing counting support or fee evidence
does not block a run that uses whole-context reservations. With a specified
budget, a request must fit using its verified exact count or conservative
maximum. Byte-based estimates and assumed cache hits cannot establish that it
fits.

Run focused evaluation application, budget, provider, report, audio and voice
integrity tests through npm before payment. Require real isolated SQLite/MCP
save receipts and history, plus observed rejected unsolicited saves. Record
commands and evidence in `localVerification`.

## Use the runner

Before payment, create each model issue using
[issue templates](issue-templates.md). Each issue represents one model, effort
and modality at a specific evaluation revision. A voice profile also identifies
its backend model and effort selected from text evidence or supplied by the
user. Resolve that selection before creating the voice issue; include the
supporting text result or the user's explicit backend selection in its
description. Keep a separate directory and ledger
for each model run.

Call `evaluateModels` through `npm run test:env -- tsx` using a temporary
agent-written driver. Supply one selected text profile in `textProfiles`, or an
empty list and an explicit `voiceProfile` when evaluating voice. Supply the
application's `baselineProfiles`,
a separately verified `judgeProfile`, authorization, verified prior spending,
local verification and eligible recorded `references`. Include prior spending
in `priorUsd` only when it belongs to the authorized scope; explain that scope
in `priorSource`. Supply `limitUsd` only for a user-specified budget; omit it
for an authorized run without a ceiling. Read `EvaluationPlan`
in `scripts/model-evaluation/evaluate.ts` for the current interface. Keep raw
requests, observations, reports and the persistent atomic ledger in ignored
`model-evaluation-results/<run-id>` artifacts. Keep raw transcripts and
credentials private.

Set `voiceProfile.backend` to the selected text profile and `voiceProfile.id`
to the identity of that voice/backend combination. Keep the verified voice
provider's model, limits and pricing in the profile.

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
profiles use eight voice scenarios.

For a requested effort survey, schedule each effort in its own issue.
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
active voice sessions promptly on stop. Any user-specified ceiling stays fixed
within its ledger; a changed scope uses a separate ledger.

## Preserve and publish evidence

Private observations retain fragment/delegation/request IDs, offsets, arrival
times, actual backend text, MCP calls/results, commentary and output
transcripts. Label missing or ambiguous links; diagnostics cannot establish
success without the required evidence.

Stream private calls and observations to the runner's JSONL gzip files as they
arrive. Decompress concatenated gzip members to read the original records.
Keep full MCP payloads on disk and identity/timing metadata in memory.
Admission refused before any provider call is `not_run`, with no behavior
verdict or completion time. A stop after paid execution begins is `aborted`;
retain its charges and observed error time.

Judge each step once in one tool-free call covering all requirements. Keep
backend text and spoken transcript as separate sources.
Give the judge the actual state, receipt and history snapshot from the fixed
checks; use those facts to ground confirmations. Historical summaries describe
earlier context. Required response content must appear in its designated source.
Missing required content in complete text fails; incomplete collection without
proof is inconclusive. Stop dependent steps after fail, error, aborted or
inconclusive outcomes. Unrun steps have no judge result.

Timing starts at text submission or reference-audio end and finishes at the
later of correct state and the final required response fragment. Preserve
negative voice times. Report the two-second quiet observation separately,
along with startup, first backend/result and individual MCP timings. Failed
attempts retain observed stop/error times without successful completion times.

Preserve every returned record's original versioned JSON. Use
`scripts/model-evaluation/publication.ts` to prepare issue comments: ordinary
records retain their Markdown, while oversized records use lossless
`gzip+base64` transport with a SHA-256 of the original JSON. Group related
records into readable comments when useful; keep every comment within the
publication size limit.

Before using transported results, collect every part with the same hash in
part order, join the payloads, decode base64 and decompress gzip. Verify the
SHA-256 of the restored UTF-8 bytes before parsing the original record.
Transport parts represent storage, not additional evaluation attempts.
After publication, retrieve comments and verify ordinary JSON or restored
transported JSON against the local originals.
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

Even on stop, report missing attempts, remaining budget when applicable, a new
conservative completion estimate, comparison limitations and a recommendation.
Identify a single repetition as preliminary and an unfinished evaluation as
incomplete.
