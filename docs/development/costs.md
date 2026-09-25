# Installation cost accounting

Use this guide when changing usage recording, prices or the operator API.
The [operator guide](../operations/costs.md) explains deployment assumptions
and recovery; the [user guide](../users/costs.md) explains the screen.
The [controlled local setup](manual-costs.md) exercises the full application
with synthetic provider responses and no paid model calls.

## Boundaries and persistence

`installationCosts(database)` owns the ledger, monthly assumptions and
aggregation. Its `model` and `live` callbacks accept content-free provider
attempt metadata. Its `read` and `update` methods serve the operator routes.
`cost-estimates.ts` owns the pure estimation rules and versioned rate card.

Migration `016_usage_costs.sql` adds three installation-wide tables:

| Table | Purpose |
| :-- | :-- |
| `cost_coverage` | The start of recording coverage for this database |
| `cost_attempt` | Attempt metadata, measurements and price snapshots |
| `cost_assumptions` | Append-only monthly Render and SEK assumption revisions |

These rows have no household, user or historical-owner references. They
contain no map text, prompts, transcripts, audio, credentials, provider
response IDs or raw errors. The model adapter projects effective model and
tier into supported values, `unsupported` or missing; arbitrary provider
strings never enter the ledger.

Household export, import, replacement and permanent erasure leave the global
ledger unchanged. Archive schema versions 14, 15 and 16 remain supported;
the archive never contains these tables. A new installation receiving a
household archive starts its own coverage and does not claim the old usage
as zero. A normal restart preserves attempts, assumptions and coverage.

## Recording and uncertainty

Record the initial attempt synchronously before dispatching a billable
provider request. The start row and initial monthly assumptions share one
SQLite transaction. Failure aborts dispatch. Live's required ledger callback
is separate from its optional diagnostic observer, whose errors stay isolated.
Terra also records before dispatch; both adapters protect completed map work
from later recording failures.

Updates replace cumulative values for the same randomly generated attempt
ID. They do not add snapshots together. A new provider attempt receives a
new ID and is counted separately. The first insert fixes the start month
and model rate card; later updates cannot move or reprice it. The voice
lifecycle freezes usage after bounded finalization, including missing-final
timeouts, so late provider events cannot silently alter a finalized record.

A failed terminal write leaves the initial or latest persisted values
unknown or provisional. A process-wide warning remains until restart even
if later writes succeed. Restart clears that warning, but does not repair
unfinished rows. Provider cancellation, missing metadata and an interrupted
process therefore retain visible uncertainty. Initial write failure creates
no billable dispatch; the process warning exposes the recording outage.

Token counts must be nonnegative safe integers; Live seconds may be
fractional. Invalid counts become missing. Unknown duration is not replaced
by the minimum charge. Known partial amounts may be shown, with explicit
missing, provisional and unpriced attempt counts. Earlier recording gaps
make the total incomplete even when the measured subtotal is empty.

## Price and assumption rules

All provider attempts belong to their UTC start month. For a known Live
duration, estimate `max(seconds, 15) / 60 * 0.05` USD. The 15-second credit
is part of that minimum, not an extra charge. Show reported and estimated
billable seconds separately. Missing final usage remains provisional.

Terra input includes ordinary input, cache reads and cache writes. Price
ordinary input as `input - cached - cacheWrite`; price each cache category
once. Reasoning is already part of output. Input over 272,000 tokens selects
the long-context rates for the entire request. Inconsistent partitions or
unsupported effective models or tiers remain unpriced. A missing effective
model explicitly assumes the requested Terra model; a missing tier explicitly
assumes Standard. Missing cache detail leaves input unpriced while known
output can still contribute, provided input length selects the rate band.

The checked date and official sources live in `currentRates`. To revise
model prices, verify those sources, add a new rate ID and date, update the
new-attempt defaults, and test boundary arithmetic. Preserve existing
attempt snapshots; do not update historical rows to a new price card.

The first measurement or authorized view of a month captures the current
Render and SEK defaults as revision 1. This is not operator approval or
automatic deployment detection. An explicit update appends a revision and
recalculates that month's Render baseline and displayed SEK conversion,
including earlier attempts. It does not change their USD rate cards or
other months. Preserve all revisions. No exchange-rate fetch, provider
billing connection, budget stop or invoice reconciliation is implied.

## Operator HTTP interface

Every request requires the verified account designated by the existing
first-administrator configuration, including its explicitly linked logins.
Household membership or administrator status alone is insufficient. The
bootstrap `operator` flag exposes this capability independently of household
access. Bearer grants and MCP tools do not grant cost access.

- `GET /api/operator/costs?month=YYYY-MM` returns `CostMonth`, including
  coverage, category measurements, estimates, rate sources, assumptions and
  revision history. An invalid month returns 400.
- `POST /api/operator/costs/assumptions` accepts strict JSON with `month`,
  the displayed `version`, and all `CostAssumptions` fields. It requires the
  configured Origin. An atomic version mismatch returns 409 without writing.
  Invalid input returns 400; missing or insufficient access returns 401/403.

The client keeps unsent edits during ordinary refreshes, rejects stale
responses using request epochs, and clears protected data on access loss.
An uncertain write requires a fresh read before another save.

## Verification

Run `npx vitest run tests/unit/server/costs.test.ts` for public HTTP, actual
provider-adapter and SQLite checks, including storage faults, restarts,
erasure retention and pricing boundaries. Client tests cover the rendered
state and request races. The mapped Playwright cases exercise the local
launcher, actual voice delegation into Terra and restart persistence.
The production container check verifies migration, access, assumptions and
restart without calling a provider. Run `CI=1 npm run check` for all gates.
