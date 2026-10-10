# Decisions classifier prototype

This throwaway experiment asks whether a separate fixed-choice decision
helps with Skyttel's missing relationship direction, current save intent
and request routing. It compares Luna Decisions, Luna Responses high
and Sol 6.1 Responses high on the same Swedish cases and choices.
Direction cases use both general ambiguity guidance and an explicit
direction rule. Expected outcomes stay outside provider requests.

Obtain explicit authorization before making paid requests. Run through
the repository's shared test lock, with credentials available privately:

```sh
SKYTTEL_DECISIONS_EXPERIMENT_AUTHORIZED=yes \
  npm run test:env -- node scripts/decision-prototype/run.mjs \
  /tmp/skyttel-decisions-experiment
```

The destination must not exist. The flag records configuration, not consent.
One failed request or unknown usage stops further cases; in-flight requests
finish and retain their records. The driver makes no retries.
Calls retain paired start/end records, actual usage and prices privately.
Provider input contains only invented information. Keep raw provider records
out of Git. The result is a classifier experiment, not full application
qualification or an end-to-end latency comparison.

The published [classifier results](results/classifiers.json) contain only
choices, confidence, request metadata, usage and cost. The
[manifest](results/classifiers-manifest.json) includes the exact fixtures
and source hash. The original driver is captured at commit `3878cf77`;
later formatting and credential-path changes do not describe that run.

For the separate prompt experiment, use a checkout of the evaluation
implementation from #341 at commit `7f7cc2e3` as the source root:

```sh
SKYTTEL_DECISIONS_EXPERIMENT_AUTHORIZED=yes \
SKYTTEL_EVALUATION_SOURCE_ROOT=/path/to/evaluation-checkout \
  npm run test:env -- node --import tsx \
  /path/to/prototype/scripts/decision-prototype/application.mjs \
  /tmp/skyttel-direction-prompt-experiment
```

The unmerged #341 tooling is a separate prerequisite. Run this command
from that evaluation checkout. It calibrates the existing
content evaluator, then runs the unchanged two-turn relationship-direction
scenario once with Sol high and once with Luna high. A general direction
rule is appended to the application's outgoing instructions. Inputs,
tools, provider replies, expected results and checks stay unchanged. Each
model uses a fresh temporary installation. No production map is touched.
The manifest and private observation/call records preserve the experiment.
This focused experiment does not qualify either model for deployment.

The [application results](results/application.json) and
[manifest](results/application-manifest.json) capture four passing steps
and 19 matching evaluator controls. The experiment driver is captured at
commit `823ec814`. Public results omit raw provider payloads and detailed
observations; those remain in the private runtime files.

The 2026-10-10 pilot supports clearer direction instructions: both Sol high
and Luna high pass the original application scenario after the general
direction rule is appended. Decisions is available to the project and
fast, but its 40/45 classifier results include wrong directions. Luna high
and Sol high each match 44/45 classifier outcomes. Treat Decisions as a
candidate for advisory routing or conservative fallback, not independent
write or save authority. Its 17/17 save-intent and routing outcomes are
preliminary, with one attempt per case and no held-out calibration.

Production integration, broader direction regression, repeated evaluation,
held-out confidence calibration, complete fallback cost and voice latency
remain open. Jev and Laya are not tested by this prototype. No production
behavior changes here, and the original #354 result remains valid history.

Open [the single-file demo](demo.html) directly in a browser.
Load the experiment's `report.json` to use actual returned choices.
Without that file it uses clearly labelled illustrative reference choices.
The simulated gate refuses unresolved direction and withdrawn save intent;
it also makes a wrong classifier choice visible. It makes no API requests
and changes no real household data.

Sources checked on 2026-10-10:

- [Decisions guide](https://developers.openai.com/api/docs/guides/decisions)
- [Responses pricing](https://developers.openai.com/api/docs/pricing)
- [Sol model](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [Design question](https://github.com/viscalyx/skyttel/issues/187)
- [Application failure](https://github.com/viscalyx/skyttel/issues/354)
