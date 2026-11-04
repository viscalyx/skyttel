# Application optimization evaluation preparation

This contract is for evaluation maintainers preparing and reporting a paid
comparison. Preparation does not authorize payment. All model, judge, voice,
recognition and context-counting attempts remain unrun. Local controlled tests
verify evaluator contracts; they do not establish model or voice quality.

## Versions and reproducibility

Compare the original application at
`8529cf04d6e5e1c42373bd7c14f46ca75185588c` with the proposed application at
`2f4dd4ad694aa0030ef2b1d6f64b00e8abacc073`. Keep both in clean worktrees.
Both use sequential work mode. The common evaluator is a separate clean,
committed revision containing the final combined preparation. Freeze its full
commit after composition, then generate the preparation manifest with the
driver. Do not use an evaluator worktree's application as the proposed version.

The manifest freezes exact bytes of the catalog, judge controls, audio manifest,
profiles, comparison plans and context module. The runner independently checks
the loaded evaluator commit, application commits, clean source, common scoring
contract and alternating order before calibration. The original application
uses consent version 3; the proposed application uses version 4. The existing
adapter reads each version from its own committed source. Controlled HTTP and
SQLite preparation exercises both; no compatibility shim is necessary.

The four result combinations are Terra/high/text, Terra/high/voice,
Sol/high/text and Sol/high/voice. Each contains both application versions. Exact
backend IDs are `terra-6.1-high-668` and `sol-6.1-high-668`; their models are
`gpt-6.1-terra` and `gpt-6.1-sol`. Preserve the historical `terra-high` alias,
which identifies another model. Do not substitute it. Both exact backends use
high effort, default service tier, a 1,050,000-token context and the verified
128,000-token maximum output, including reasoning. The 922,000-token normal
input reservation is context minus maximum output, not a separately published
input limit. The common Sol/high judge retains its 4,096-token output cap.

`optimization-campaign-profiles.json` records current official source URLs,
retrieval date, source SHA-256, exact rates and remaining billing gaps. Source
snapshots belong in private evidence. Account access remains untested. Check
credentials by presence only; keep secrets out of manifests and reports.

## Ordinary comparison

Use the unchanged catalog: 18 text scenarios with 26 ordinary steps; eight
voice scenarios with 14 ordinary steps. Separate 11 everyday scenarios, two
long-conversation scenarios and five complex scenarios. Use the same isolated
start data, complete state, save receipts, history and assistance policy for
both versions. Keep all mandatory correctness checks in advanced groups too.

For each model and modality, run five repetitions in this version order:
original/proposed, proposed/original, original/proposed, proposed/original,
original/proposed. Each combination uses one persistent ledger including its
43 calibration controls and all repetitions of both versions. Across both
models this plans 360 text scenario attempts and 160 voice scenario attempts,
with 520 ordinary text step attempts and 280 ordinary voice step attempts.
Conditional replies and separate context supplements are additional attempts.
Dependent work after failure remains unrun; planned counts are not successes.

Text target scenarios are `everyday-question`, `everyday-change` and
`everyday-follow-up`. Voice targets are `change-price-payment` and
`relationship-direction`. Accept speed only after mandatory correctness passes.
For each model and modality separately, target median ratios must be at most
0.8 and other everyday ratios at most 1.1. Relative min/max range divided by
median must be at most 0.2 in both versions. Missing evidence or excessive
variation is inconclusive. Five repetitions do not establish a statistically
certain ranking. Report advanced groups separately from these thresholds.

Enable the catalog's conditional replies. Preserve each direct verdict; select
one uniquely matching approved reply at most once and verify the entire waiting
state and response before sending it. Additional instructions, prompt tuning,
verdict retries and invented replies are outside the contract. Clarification
does not repair an independent failure. Report direct and assisted completion
separately, including extra calls, cost, wall time and evaluator gaps. A correct
voice question can be accepted handling while completion remains unverified.

Measure text from submission to correct state and the complete required answer.
Voice includes final rendered audio and independent captured-audio assessment.
First text, tool success or a backend answer alone cannot establish full wait.
Failed, aborted, inconclusive and unrun attempts have no successful completion
time. Preserve observed stop/error time and all charges. Record actual model
and MCP counts/durations, input/cache/output/reasoning tokens and context usage;
separate work, summary, content judging and voice recognition costs. Never infer
cache reuse from repeated prompts: use observed cache-read/write usage.

Use only the existing approved Marin audio and conditional replies. Verify all
21 manifest clips against their text, SHA-256, PCM format, frames, declared
sample rate and existing listening provenance. Integrity verification does not
create new listening approval. Ordinary dialogs remain connected; close before
final judging and summary, then reopen after summary installation.

## Actual context limits

The existing summary hook and eight neutral retained posts test summary
behavior. They do not establish an actual model boundary.

`context-limit.ts` provides a separate bounded ordinary-message growth fixture
and concrete authenticated application adapter. It preserves real SQLite/MCP,
uses at most 2,048 growth messages of at most 3,900 characters each, and tests
recall of a declared early sentinel after a natural context transition. Every
turn checks unchanged state and saving safety. It stops on the first terminal
failure. This supplement records provider-measured input, request identities,
natural summary calls and context generation. Byte estimates, low-usage
summaries and controlled usage never establish a physical provider boundary.
Even a measured natural transition is an application boundary; the physical
maximum stays unverified.

The separate provider capability probe preserves a captured full application
request and appends deterministic bounded history. It requires an exact count
of that entire outgoing payload, with independently verified counting fee,
before provider dispatch. Its reservation uses the counted oversized input
and maximum output under the applicable worst input/cache-write and output
rates. It does not use the normal 922,000-input hold or change the published
context limit. The probe can establish an observed provider context rejection
only from an explicit provider `context_length_exceeded` response and request
identity. It cannot establish application correctness or successful latency.

Run capability probes last, separately from everyday timing, once per model
and application source request. Exact counting fee/support is unresolved, so
no probe is executable yet. Missing usage on a rejected request retains the
full hold and stops new payment; rejection is never assumed free. Preserve
unrun probes and any unresolved charge in the final report. A text backend
probe does not establish the separate Live context limit. Actual Live-boundary
execution remains unrun and requires a further approved-audio growth contract;
do not turn ordinary summary evidence into a substitute claim.

## Cost and execution gates

All prices are USD. For normal backend/summary requests, conservative maximum
holds are $3.265 Terra and $6.53 Sol. The judge maximum is $4.67144 per call;
43-control calibration has a $200.87192 maximum hold basis per independent
run. These are conservative reservations, not expected or actual charges and
not a user spending ceiling. Actual costs use verified provider usage. Calls
vary with checking, clarification, summaries and partial failures; do not
multiply by an invented fixed model-call count. Four comparison runs include
172 calibration calls before candidate attempts. Capability counting and probes
are additional paid layers and require their own explicit cost basis.

The proposed application explicitly selects a 30-minute cache lifetime. The
original application and judge omit that setting and explicit breakpoint
lifetimes; the official provider default is 30 minutes for these models. The
recorded cache-write rate is the total 1.25-times input rate, with the documented
long-context multiplier. Reject any later configuration using 12-hour writes
until its prices and reservations are updated.

Voice uses `gpt-live-1`, Marin output and the same backend in both versions, at
$0.05/minute billed by second. Session creation bills 15 seconds credited
against running duration; never add another 15 seconds to an established
session. The final short-session credit semantics remain unresolved. Failed
creation or missing final usage retains the hold and stops payment.

Independent playback recognition uses `whisper-1` at $0.006/minute. The official
examples do not establish a universal billing quantum. The exact profile keeps
the quantum null and the executable voice builder refuses it. Preserve the
recognizer identity; do not guess a quantum or substitute a different model.
Confidence and alignment settings are evaluation policy requiring calibration,
not facts established by pricing documentation.

No arbitrary cost ceiling applies. Supply one only if the user specifies it,
with its scope. Every ledger includes calibration, backend, summary, judging,
voice, recognition, paid counting and outstanding holds within its authorized
scope. Unknown usage, failed calibration or an unknown fee stops execution.
Historical results have different catalogs/scoring/source and cannot replace
the planned comparison. Earlier authorization does not authorize this campaign.

## Commands and reporting

Run all commands from the final clean common evaluator worktree. Replace the
commit and directory arguments with the frozen final identities. The output
preparation file must not exist; the driver writes with exclusive creation.

```bash
npm_config_cache=/workspace/tmp/npm-cache npm run test:env -- tsx scripts/model-evaluation/campaign-driver.ts prepare model-evaluation-results/optimization-preparation.json EVALUATOR_COMMIT ORIGINAL_WORKTREE PROPOSED_WORKTREE
```

Copy `optimization-execution-template.json` to private storage and fill one
exact profile/modality, a separately created result issue, its directory,
verified prior consumption and final local verification. Set authorization and
its source only after explicit approval for this comparison. Loading a private
environment file or setting opt-in flags grants no authorization. Then use:

```bash
npm_config_cache=/workspace/tmp/npm-cache npm run test:env -- tsx scripts/model-evaluation/campaign-driver.ts run model-evaluation-results/optimization-preparation.json PRIVATE_EXECUTION_JSON
```

The driver checks the frozen preparation before dispatch. The evaluator checks
clean source and calibrates before candidate work. Voice remains blocked by
the documented billing gaps. Never use a controlled test's synthetic price or
provider profile for paid execution.

Publish one result issue per model/effort/modality after authorization, with
sanitized versioned evidence and retrieved-content verification. Preserve all
attempts and unknown costs. Each description needs a readable conclusion,
correctness, before/after medians and ranges, percentage change, actual cost,
advanced limitations and unrun work. Separate automated product checks,
remaining human assessment and actual observed model/voice quality. Until the
required real runs and publication finish, the comparison is incomplete.
