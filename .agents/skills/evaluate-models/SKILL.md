---
name: evaluate-models
description: Evaluate supplied Skyttel models and recommend a model using comparable evidence.
disable-model-invocation: true
---

# Evaluate models

Determine whether the models supplied by the user meet Skyttel's requirements
and whether the evidence supports choosing them over the application model.
Evaluate correctness first, then response time and cost. Deliver a
recommendation backed by reproducible results in a GitHub issue labelled
`model-evaluation`.

## Establish the comparison

Use the user's models, intended text or voice use, and authorized total spending
limit. Ask for missing models or payment authorization before making paid calls.
Resolve the provider for each supplied model; ask the user when it is unclear.
Confirm that the selected providers are supported and their required credentials
are available to this session. If a key or token is missing, stop paid execution
and explain how to configure it using the credential guidance in
[run support](references/run-support.md).
Identify the model currently used by the application from its effective
configuration. Its corresponding result in a `model-evaluation` issue is the
baseline for comparison. Reuse that result; run the application model or any
previously tested model again only when the user explicitly supplies it.

Test each supplied model at its requested effort directly. A supplied high
profile starts at high; lower-effort results are not prerequisites. Explore
other efforts only when the user requests an effort survey.

Search open and closed `model-evaluation` issues in `viscalyx/skyttel`,
including corrections. Identify comparable results by catalog, fixture, commit,
profile, scoring configuration, modality, limits and repetitions. Explain gaps
that prevent a comparison. One repetition is preliminary; three passing
repetitions qualify a model.

## Gather evidence

Before paid execution, read [run support](references/run-support.md) for the
runner interface, local verification, provider verification and cost accounting.
Create a new run issue recording the agreed comparison, references and budget.
Use `scripts/model-evaluation/evaluate.ts` to exercise the real application
against the checked-in catalog. The runner owns scenario ordering, fixtures,
audio, timing and result collection; keep those consistent across runs.

Use the catalog and approved scoring controls as the evaluation contract.
Preserve real MCP writes, receipts and history. A failed calibration or unknown
charge stops paid comparison. Record failures and missing evidence as observed;
never retry a verdict to improve it or count an unrun attempt as successful.
Keep every paid layer within the authorized total, including prior spending.

## Deliver a decision

Publish the runner's versioned results on the newly created run issue, using
the publication guidance in [run support](references/run-support.md). Compare
qualified models with the application's recorded baseline.
Recommend a model when correctness and the comparison rules support it;
otherwise explain which evidence is missing. Report regressions and costs
alongside any response-time improvement. Leave production model selection to
the user.

The work is complete when the issue accounts for every selected attempt and
contains the recommendation, its evidence and limitations, actual spending,
remaining budget and any work needed to finish qualification. A stopped run
still needs that report; it remains an incomplete evaluation.
