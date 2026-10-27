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

The release verification record must identify its exact revision, full npm
check result, selected browser scenarios, production-container checks, manual
mapping validation and both independent review axes. Keep original failures
and explain any reused evidence. A passing later run does not establish the
cause of an earlier intermittent failure. The existing healthy voice-domain
polling timeout remains historically unresolved despite later focused and
full passes; preserve phase/revision/model-count diagnostics if it recurs.

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
