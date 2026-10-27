# LangSmith pre-rollout scope checkpoint

This checkpoint helps the installationsansvarig and maintainer decide whether
an enabled release is ready. It is an implementation readiness record, not
authorization to configure production, deploy, upload household content,
execute the assessment or invoke billable providers. Follow the
[rollout runbook](langsmith-rollout.md) before those separately authorized steps.

## Implemented scope

- Normal application startup selects the real pinned LangSmith sender through
  explicit optional configuration. Configured sending defaults on; missing or
  invalid settings leave household startup available with honest sender state.
- Original conversation information version gates text and voice evidence.
  Later acceptance cannot upgrade an older conversation. Current disclosure
  names the processors and permitted exact content; raw audio, credentials,
  transport headers and unrelated provider metadata stay excluded.
- One backend task owns model/MCP evidence. Separate voice roots and creation,
  lifecycle and delegation children have explicit links. Backend summary,
  recover, retry and accepted no-op operations retain their own identities.
  Application outcomes, saves, receipts and cost accounting remain authoritative.
- The installation operator controls sending independently of household
  administration and individual consent. Opt-out and quota/credential
  suspension persist in the existing database. Recovery requires an explicit
  decision; buffers never replay. Health is ephemeral and resets on restart.
- Delivery is memory-only with whole-event loss, event/byte/age/concurrency,
  timeout and retry bounds, plus a two-second shutdown delivery bound. There
  is no diagnostic disk recorder, database payload archive or replay spool.
- Account preparation, Render ordering, first possible voice upload,
  configuration, forward recovery, rotation, removal and asynchronous cleanup
  have operator instructions. The bounded natural-failure assessment continues
  to distinguish its window from trace retention and product lifetime.

## Local non-billable evidence

Authenticated HTTP checks use real SQLite and authentication, controlled
external identity/model/Live providers and actual SDK ingestion on loopback.
They exercise the ordinary configured composition, rather than relying only
on an exporter-factory override. They cover exact text/voice evidence, original
consent version, linked summaries/recovery/retries/no-ops, default-on state,
durable disable/suspension/recovery, safe missing/invalid configuration,
failure isolation, exclusions, bounds, costs and shutdown without replay.

Validation date: 2026-10-27. The runtime and unit-test snapshot is
`b8c32f9ef058ff319ae5f9fec31b870b9af88dee`. The later test synchronization
snapshot is `0c272d7ce0a8970a910d776fbb5a61e6792da5fd`; its only change is four
lines in one browser case. It preserves the runtime and unit coverage inputs.

- `npm run check` passes 2,538 tests across 243 files: 93.42% statements,
  90.03% branches, 92.85% functions and 95.42% lines. The branch gate remains
  90%. Typecheck, lint, documentation/spelling, 241 workflow gates, build and
  full mapping pass. Mapping covers 859 manual cases and 2,430 discovered tests.
- All 39 selected browser journeys have passing evidence for controls,
  consent, text/save recovery, voice/errors and context summaries. Chromium
  uses validated CI fonts, one worker and no retries. The initial run has
  38 passes and one recovery-notice failure. After synchronizing that case
  to the deliberately failed request, its isolated run and predecessor pair
  pass with the original five-second notice assertion and scenario limit.
  Other passing cases remain valid; they have no changed inputs.
- All nine compiled production-container checks pass at the later snapshot.
  They cover startup, authentication, persistence/replacement, erasure,
  assistant access/consent, recovery, cost storage and archives using synthetic
  data. They make no Live or text-provider calls.
- Three local terminal probes execute the exact account-setup snippets with
  synthetic metadata endpoints: agent readback, legacy project read and
  creation. They verify prompts, hidden credentials, destination selection
  and the independently checked API contracts without account access.
- Fresh typecheck, lint and full mapping pass after the browser-only change.
  Both independent review axes have zero actionable findings on the repaired
  runtime and setup guidance. Original failures and repair evidence remain
  in the release verification record; later documentation does not change
  those runtime/test inputs.

Two timing uncertainties remain separate from passing verification. The
earlier healthy voice-domain polling timeout has later focused/full passes
without a confirmed cause; preserve phase/revision/model-count diagnostics
if it recurs. The selected browser failure starts its notice assertion before
delegation/save readiness; the failed request arrives near that assertion's
deadline. Synchronizing the failure boundary passes the bounded checks, but
the reason preparation reaches recovery later remains unconfirmed. On
recurrence, retain utterance, recovery-request, failed-request and notice
times plus backend phase/revision before another bounded investigation.

Automated keyboard/focus, contrast and reflow checks support the installation
controls and consent paths. They do not establish full WCAG conformance or
substitute for screen-reader and physical-audio observations. No actual
LangSmith cloud trace, household upload, account change, deployment,
assessment execution or billable provider call is part of these local checks.

## Required operator evidence before enabling

Record each outcome privately with release, environment, date and responsible
operator. Use sanitized shared status; do not copy payloads or credentials.

- [ ] Actual default personal organization is free, has no payment method and
      uses one developer. Record current allowance, remaining quota and reset
      date. Stop if compliance would require payment or new unapproved scope.
- [ ] Correct regional endpoint, workspace and pre-created destination are
      verified. Runtime tracing-only key is separate from setup/read/delete
      access. Expiry, recovery and rotation are prepared.
- [ ] Actual destination uses rolling 14-day base retention without upgrades,
      evaluator automation, datasets or bulk export. Cleanup permission and
      asynchronous follow-up are verified; retained metadata limits are known.
- [ ] Users receive current information before the first enabled release,
      end active conversations and pause starts during rollout. Preserve the
      durable disabled guard before configuration and automatic deployment.
      If controls are absent, first deploy the completed release without
      diagnostic settings and verify **Inte ansluten** before this preparation.
- [ ] Review the release's required application/security checks and outstanding
      [security acceptance evidence](security-checks.md#cookie-and-storage-release-evidence).
      Verify actual providers, hosted HTTPS/proxy, physical browser restart,
      human accessibility/audio and controlled backup/recovery as applicable.
- [ ] Separately authorize deployment, activation, live uploads and any
      billable text/voice checks. Verify deployed health, release identity,
      household access, renewed consent and sending state in that order.
- [ ] Verify actual cloud rendering and text/voice identity navigation in the
      correct destination using permitted content. Review exact outcomes and
      exclusions. Record gaps without treating accepted ingestion as a complete
      trace or successful household work.
- [ ] Designate the sanitized assessment record and start date only after
      authorized rollout. Preserve the first-ten/14-day/48-hour/30-minute
      procedure, independent verification and stop conditions. Do not add
      automatic shutdown at day 14 or the tenth case.

Primary-document checks dated 2026-10-27 support the runbook, not these account
or infrastructure outcomes. Missing human, cloud or account evidence remains
visible until the operator supplies it. There is no arbitrary implementation
time cap or automatic substitution of paid services for an unmet requirement.
