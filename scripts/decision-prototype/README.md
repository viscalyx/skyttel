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
Provider input contains only invented information. Keep runtime records
out of Git. The result is a classifier experiment, not full application
qualification or an end-to-end latency comparison.

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
