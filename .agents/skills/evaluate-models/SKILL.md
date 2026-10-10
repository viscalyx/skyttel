---
name: evaluate-models
description: Evaluate Skyttel's text and voice models and record comparable results.
disable-model-invocation: true
---

# Evaluate models

- Read `scripts/model-evaluation/catalog.json`, `judge-controls.json` and
  `profiles.json`. Use the catalog's exact ordered
  utterances, full fixture and whole-state expectations. Older model tests
  are diagnostics, never this catalog's oracle.
- Credentials and opt-in flags are not payment authorization. Obtain
  explicit authorization for the
  complete dollar ceiling, including prior calls and outstanding holds.
- Search open and closed issues labelled `model-evaluation` in
  `viscalyx/skyttel`. Read their versioned manifest, attempts, controls and
  corrections before selecting a reference. Compare matching catalog,
  fixture, commit, profile, limits, modality and repetition plans.
- Require one or more models from the user. Run only those models; do not
  add historical reference models, previously tested models or a voice
  baseline. Reuse their recorded issue results when comparable. Rerun a
  previous model only when the user explicitly supplies it for this run.
- Create a distinct run issue with label `model-evaluation` before payment.
  Link the catalog's provenance and previous comparable runs. Record an identifier, timestamp,
  commit, selected scenarios, repetitions, profiles and authorization.
- Verify model IDs, effort support, context/input/output limits, default
  service tier and all input/cache-read/cache-write/output prices against
  official OpenAI documentation. Refresh `profiles.json` when needed;
  document unavailable profiles without substituting another model.
- Verify prior consumption from original usage evidence. When only a
  documented conservative reservation is available, account for that full
  amount and distinguish it from estimated actual spending. Unknown prior
  charges block payment; available credentials do not resolve them.
- Verify exact token counting for the complete outgoing payload, including
  instructions, tools, previous responses, summaries and current draft.
  Confirm its fee before supplying `EvaluationPlan.counting`. Reserve and
  settle any counting fees through the same ledger. Without verified
  counting, leave the dependent summary steps unrun and continue independent
  scenarios only when conservative whole-context reservations fit. Never
  use bytes divided by three or assume cache hits or zero missing fees.
- Before payment, run the focused evaluation application, budget, provider,
  report, audio and voice integrity tests through npm. Require real isolated
  SQLite/MCP save receipts and history, plus observed rejected unsolicited
  saves. Record commands and evidence in `localVerification`.
- Call `evaluateModels` in `scripts/model-evaluation/evaluate.ts` through
  `npm run test:env -- tsx` using a temporary agent-written driver. Use an
  ignored `model-evaluation-results/<run-id>` directory for raw requests,
  audio observations, JSON reports and the persistent atomic cost ledger.
  Do not commit run results or publish raw transcripts/credentials.
- Run the selected text profiles over all 14 text scenarios and selected
  voice profiles over eight voice scenarios. Run 19 independent
  human-approved judge controls first,
  one Sol high call per control, requiring all 21 expected outcomes.
  A control deviation, missing usage or failed local gate stops comparison.
- Escalate a model to medium, then high, only after a confirmed behavior
  failure in a complete lower-effort round. Repeat all 14 scenarios at each
  effort. Provider errors, timeouts, inconclusive judgments and budget stops
  do not authorize escalation or retries.
- Use one repetition for an explicitly requested initial survey, and three
  for qualification. Alternate the order of the supplied profiles between
  repetitions. Compare against recorded qualified references without
  rerunning them. Qualification requires every selected fixed/content check to pass
  in all three repetitions. A single repetition is preliminary.
- Preserve the real application, assistant, MCP, write guards and SQLite.
  Select one backend/summary profile and its context capacity per run.
  Use only the internal ordinary-summary hook; no production HTTP hook,
  canned summary, inflated usage or altered context limit. Preserve eight
  neutral historical posts and prove the price turns are outside the tail.
- Reuse the checked-in audio after SHA-256, frame count, PCM mono 16-bit
  22050 Hz and exact reference-text checks. Keep ordinary dialogs connected;
  close before final judging and summary, then reopen after installation.
  Do not generate replacement speech or substitute delegation/transcripts.
- Keep all layers under the user's authorized total ceiling.
  Reserve complete request maxima and remaining active dialog time before
  each paid call. Include failures, interrupted work, reasoning, cache
  writes and open judge waits. Unknown usage retains its hold and stops new
  calls. Close active voice sessions promptly on stop. Never increase the
  authorized ceiling automatically.
- Preserve all observed fragment/delegation/request IDs, offsets, arrival
  times, actual backend text, MCP calls/results, commentary and output
  transcripts in private observations. Label missing/ambiguous links;
  diagnostics cannot turn missing evidence into a successful attempt.
- Judge each step once, all requirements in one tool-free call, keeping
  backend and spoken transcript sources separate. Full text missing content
  fails; incomplete collection without proof is inconclusive. Stop dependent
  steps after fail, error, aborted or inconclusive outcomes. Do not judge
  unrun steps or retry a verdict to improve it.
- Use text start or reference-audio end as the main timing origin; completion
  is the later of correct state and final required response fragment. Keep
  negative voice times. Report the two-second quiet observation separately,
  plus startup, first backend/result and individual MCP timings. Failed
  attempts have observed stop/error times, no successful completion time.
- Publish every generated Markdown artifact from the returned paths as a
  comment on the run issue, with the embedded versioned JSON intact. For
  GitHub multiline text, write an exact temporary file with an editing tool,
  then use a separate literal `gh ... --body-file /absolute/path` command.
  Verify actual newlines with `gh issue view --json body --jq .body` and
  comment retrieval. Corrections are new comments referring to old records.
- Present correctness first, then scenario medians with equal scenario
  weight, min/max, every repetition's total and costs. Label comparisons in
  text as well as red/yellow/green. A timing-based switch needs at least 10%
  and one second improvement and lower totals in every repetition. A failed
  reference and qualified candidate may justify a correctness recommendation
  without inventing comparable speed. Show regressions and cost differences.
- End even a stopped run with missing attempts, remaining budget, a new
  conservative completion estimate, comparison limitations and recommendation.
  Do not call a partial run a completed baseline or change production models
  automatically. Three repetitions do not establish statistical certainty.
