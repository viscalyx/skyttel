# LangSmith free-plan limits for a synthetic diagnosis pilot

Research date: 2026-10-24.

This report helps maintainers decide whether to plan a small synthetic text
and voice tracing pilot. It establishes documented service limits, not
diagnostic value or permission to implement or run the pilot. No account
inspection, trace upload or provider call is part of this research.

## Finding

A bounded pilot has a documented free route: one person reviews ordinary
base traces in a personal Developer organization without a payment method.
The plan should exclude experiments, automatic evaluation, retention
upgrades and bulk export. Actual account settings remain a prerequisite
before any later execution.

The [pricing page](https://www.langchain.com/pricing)
lists Developer at $0 per seat/month, one seat maximum and 5,000 base traces
per month. A trace can contain multiple model calls and other steps; the
allowance is not a model-call allowance. Text and voice therefore share the
same tracing budget according to the root traces the integration creates.
This last point is an inference from the trace definition, not a verified
integration result. The page does not establish diagnostic usefulness.

The [billing guide](https://docs.langchain.com/langsmith/billing)
limits personal organizations to 5,000 traces/month until a card is added.
Adding a card removes that cap and enables charges for excess traces.
Manually creating another organization requires Plus. Use the default
personal organization without adding payment details. Project retention is
configurable; confirm base retention before sending anything.

## Retention, feedback and ingestion

The [usage and billing reference](https://docs.langchain.com/langsmith/usage-and-billing)
documents these limits and behaviors:

- Base retention is 14 days; extended retention is 180 days. Expired traces
  disappear from UI/API; payload deletion follows, while some metadata can
  remain indefinitely for analytics and billing.
- Experiments create extended-retention runs by default. Online evaluators
  and automation rules extend retention by default, with opt-out settings.
- UI feedback, notes and manual annotation queues preserve the retention
  tier. API/SDK feedback extends it only when explicitly requested.
- Dataset inputs and outputs persist indefinitely.
- Without payment details, ingestion permits 50,000 create/update events
  and 500 MB per UTC clock hour. Updates count again; payload bytes count
  again. A trace supports at most 25,000 runs.
- The monthly 5,000-trace cap resets at the calendar-month boundary in UTC.
  Exceeding applicable limits returns HTTP 429. Temporary overload retries
  cannot cure an exhausted monthly allowance.

These are independent ceilings. A low root-trace count alone does not prove
that a voice event stream fits. Keep the proposed volume well below all
ceilings and preserve local artifacts when cloud tracing is unavailable.

The [SDK feedback guide](https://docs.langchain.com/langsmith/attach-user-feedback)
supports feedback on roots and child runs. Manual feedback can mark a
suspect model or tool step without replacing Skyttel's own verdicts.
Whether annotation improves diagnosis remains a pilot design question.

## Export and deletion

The [query guide](https://docs.langchain.com/langsmith/export-traces)
documents SDK retrieval of project runs and their structured fields. This
provides a documented route for a small local export before trace expiry;
no account-specific entitlement check or download verifies it here.

The [bulk export guide](https://docs.langchain.com/langsmith/data-export)
restricts bulk export to Enterprise for customers signing up after
2026-08-03. Earlier customers can use Plus or Enterprise until 2027-02-01.
Developer is excluded in either case. Do not make bulk export a prerequisite
for the free pilot.

The [dataset guide](https://docs.langchain.com/langsmith/manage-datasets)
documents CSV, JSONL and fine-tuning-format downloads. It also explains
that changes create dataset versions and that public sharing exposes
examples and related experiments, runs and feedback. Dataset export is
distinct from trace export; the bounded pilot does not need datasets or
public sharing.

The [purging guide](https://docs.langchain.com/langsmith/data-purging-compliance)
documents trace deletion by IDs/project, up to 1,000 traces per request,
and metadata-based deletion. Related feedback, aggregates and statistics
are included. Processing is asynchronous; the guide describes weekend jobs
and requires querying again to verify removal. Dataset soft deletion
preserves historical versions. Hard deletion removes example payloads and
metadata across versions. Thus deleting a trace is not a substitute for
cleaning any dataset copies. No immediate physical-deletion guarantee is
established here.

## Conflicts and account checks

The [older recovery support article](https://support.langchain.com/articles/8458147520-can-i-recover-deleted-traces-in-langsmith)
still describes 400-day extended retention and Plus bulk export. The
current usage and export guides give the dated changes above; use those
more specific rules for a new pilot. The
[custom-retention support article](https://support.langchain.com/articles/2922388695-how-do-i-delete-traces-and-runs-in-langsmith-based-on-custom-retention-periods)
describes deletion taking hours and possible undo, while the recovery
article denies recovery and the purging guide describes weekend processing.
Do not promise a deletion deadline or recovery. If either is essential,
resolve it with the provider before execution.

The pricing page includes paid usage language, while the billing guide
describes the no-card cap. These are compatible: attaching payment details
changes the account's spending exposure. The reviewed sources do not
establish that extended traces are included in the free base-trace
allowance, or how every extended feature behaves on a no-card account.
The bounded route avoids depending on that behavior.

Before later execution, inspect the intended account for:

1. Developer status, default personal organization, one seat, no payment
   method, remaining monthly quota and any trial or legacy settings.
2. Base project retention and absence of rules/evaluators that extend it.
3. Availability of manual trace navigation, permitted feedback and small
   SDK exports; confirm effective limits shown for the account.
4. A cleanup procedure and verification step consistent with the agreed
   synthetic trace contract.

These are future prerequisites, not requests to create an account now.
Provider charges for Skyttel models, voice and any judge remain separately
subject to explicit authorization. A free observability subscription does
not establish that those calls are free.

## Consequence for the pilot plan

Pricing does not rule out a small manual diagnosis comparison. Plan to
inspect synthetic text and voice failures within the base retention
window, keep existing local artifacts authoritative, and stop cloud
ingestion when limits are reached. Select exact cases, thresholds, trace
fields and instrumentation in the remaining decisions. There is no
evidence yet that LangSmith saves diagnosis time or that the integration
meets the required isolation contract.
