# LangSmith coverage for synthetic text and voice diagnosis

This report helps maintainers decide the instrumentation scope of a small
synthetic evaluation pilot. It identifies a documented integration route,
the evidence already available, and gaps that need explicit handling.

Research date: 2026-10-24. No integration, trace upload, SDK installation or
provider call establishes runtime compatibility in this investigation.

## Finding

A single pilot can cover both text and voice. Voice delegates work to the
same text assistant and MCP/backend path. Its extra Live session needs
explicit event correlation and lifecycle instrumentation. A wrapper around
the text model alone cannot produce that complete timeline.

An adapter over evaluation observations and provider records is a credible
first candidate. It can preserve the existing evaluation verdicts and cost
accounting while selecting synthetic fields before export. A model wrapper
can add rich model rendering, but does not replace the adapter's semantic
events, task identity or voice lifecycle work. These are engineering
inferences from the source coverage below, not verified pilot results.

## Source baseline and compatibility

Local source links use Skyttel commit
`6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d` throughout. The
[lockfile](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/package-lock.json)
resolves OpenAI JS `7.43.0`; LangSmith is absent from the dependencies.

LangSmith JS source uses revision
`290f06a628dffb2ca690e389dc48b629f5623312`. Its
[package manifest](https://github.com/langchain-ai/langsmith-sdk/blob/290f06a628dffb2ca690e389dc48b629f5623312/js/package.json)
declares version `0.10.9`, an optional OpenAI peer dependency of `*`, and
an OpenAI development dependency of `^6.18.0`. That manifest does not prove
that this revision is a published package, or that Skyttel's OpenAI version
passes its compatibility tests. A later implementation must select a
published exact version and check its corresponding source.

The pinned
[OpenAI wrapper implementation](https://github.com/langchain-ai/langsmith-sdk/blob/290f06a628dffb2ca690e389dc48b629f5623312/js/src/wrappers/openai.ts#L419)
wraps chat completions, legacy completions and available Responses methods,
including `responses.create`, `parse` and `stream`. It has no Live or
sideband instrumentation. It binds the original Responses resource method,
which suggests the existing model transport can remain in use, but does
not prove cancellation, errors or subclass behavior with Skyttel's client.

The official
[OpenAI tracing guide](https://docs.langchain.com/langsmith/trace-openai)
documents `wrapOpenAI` alongside custom traced functions. It does not
establish automatic instrumentation of an authenticated application tool
implementation merely because a model emits a tool call.

## Existing evidence and missing coverage

<!-- markdownlint-disable MD013 -->
| Path | Existing evidence | Additional work for a complete timeline |
| --- | --- | --- |
| Text model | Responses payloads, results and attempt records | Correlate each call to its evaluation step and task |
| Model actions | Function name, arguments and call ID | Retain action identity without inventing model latency |
| MCP | Start, result, name, arguments and start time | Pair calls, distinguish returned tool errors from transport failure |
| Voice delegation | Transcript fragments, delegation, backend request/result, commentary | Join the Live session and shared task; represent cancellation |
| Live transport | Startup and usage handling exist outside the observation stream | Capture session start, finalization, close/error and incomplete capture |
<!-- markdownlint-enable MD013 -->

### Text and MCP

The
[text model](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/text-assistant-model.ts#L42)
uses `ModelClient.responses.create`, with retries disabled, caller
cancellation and `store: false`. Its attempt records include start/end,
outcome, provider identifiers and usage. The
[custom transport](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/model-client.ts)
deliberately preserves long-running requests and cancellation. Tracing must
not change those semantics.

The
[evaluation provider](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/scripts/model-evaluation/provider.ts#L141)
already records each Responses attempt with a unique ID, request, response,
timestamps, outcome and scenario/step/modality/repetition context. It also
owns budget reservation and settlement. These records can supply LLM spans
without wrapping the SDK; their existing cost calculations remain the
authority. They do not by themselves contain application task or voice
delegation identity.

The
[assistant's MCP boundary](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/text-assistant.ts#L489)
emits `mcp_started` before the actual call and `mcp_completed` after it,
including `startedAt` in the latter. An exception or intervening guard
failure can leave a start without a completion. A returned error result
can emit completion before the application raises its error. An exporter
must distinguish both outcomes. Cached reads may bypass the actual call
and therefore do not represent new MCP executions.

[Model actions](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/text-assistant.ts#L1149)
are emitted after a model response and subsequent draft validation. They
are semantic action evidence, not complete model request spans. A provider
failure or failed validation can therefore have no `model_action` event.

### Voice and shared backend work

The
[voice startup](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/voice-assistant.ts#L400)
creates a Live session with WebRTC and attaches `SidebandWS`. Its
[dispatch boundary](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/voice-assistant.ts#L517)
forwards work into the shared assistant routes. The
[voice executor](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/voice-work.ts#L267)
emits a backend request with delegation and request IDs, sends transcribed
text and context to `messages`, polls asynchronous work, and emits a backend
result after completion. Canceled or stale work can return without that
result event.

[Transcript and delegation handling](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/voice-work.ts#L405)
already emits selected voice events. However,
[sideband errors, usage and session closure](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/voice-assistant.ts#L464)
have their own handlers without equivalent observation events. This stream
is not a recording of every provider or browser event.

[OpenAI's server control guide](https://developers.openai.com/api/docs/guides/voice-server-controls)
confirms that the primary connection and sideband share one Live session.
It recommends one owner for each action to avoid duplicate execution,
early attachment when complete observation is required, and collecting
final usage before cleanup. A sideband does not establish when the user
hears output. Consequently a timeline can compare server behavior without
claiming acoustic playback evidence.

## Correlation and representation

The shared
[observation schema](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/assistant-observation.ts)
provides event time, application conversation ID, optional task/revision
and a typed event kind. Voice uses the same conversation ID, but currently
does not populate task/revision at the outer event level. The
[task executor](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/src/server/text-assistant.ts#L1750)
sets `taskId` from the accepted message ID.

A candidate mapping needs:

- An evaluation run/scenario/repetition identity and a root trace.
- Step/task children, and model/MCP spans attached to their actual task.
- An explicit mapping from voice delegation to backend request ID and
  shared task, plus the provider Live session identity.
- Stable exporter span IDs and an ingestion sequence for equal timestamps.
  MCP name and timestamp alone are insufficient if calls collide.
- A single owner for shared backend spans. Voice delegation events refer
  to that work rather than duplicating text model and MCP spans.
- Separate event receipt times from Live `start_ms`/`end_ms` media offsets.
  Preserve both; do not infer wall-clock precision from media offsets.

LangSmith's
[run schema](https://docs.langchain.com/langsmith/run-data-format)
supports parent IDs, trace IDs, hierarchical ordering, timestamps, events
and errors. Its `session_id` means tracing project identity, so do not map
Skyttel's conversation ID into that field. Use explicit metadata selected
by the synthetic data contract.

[Custom instrumentation](https://docs.langchain.com/langsmith/annotate-code)
supports explicit `RunTree` children and finishing runs, which fits events
that cross polling and callback boundaries. Function tracing propagates
nested context, but that alone does not establish the correct parent of
work queued beyond an HTTP response. Explicit task-to-span mappings remain
necessary. `RunTree` posting is not disabled by `LANGSMITH_TRACING`; the
adapter needs its own activation gate. SDK flushing before process exit is
documented, but a pilot needs a bounded export deadline.

If context must cross a genuine service boundary,
[distributed tracing](https://docs.langchain.com/langsmith/distributed-tracing)
supports trace headers and restoring a run context. The existing internal
dispatch and task mapping may avoid that complexity. Accept tracing
headers only from trusted internal callers; the guide explicitly warns
against trusting public caller context.

## Isolation, effort and unresolved evidence

Prefer collecting locally and exporting a selected, finite artifact after
an evaluation attempt. The
[retention helper](https://github.com/viscalyx/skyttel/blob/6d1999f022d5a18af6a99dcbf3f2b1c69a730d9d/scripts/model-evaluation/observations.ts#L6)
provides full payloads to the private recorder before reducing some
in-memory MCP data. Export must select fields before network ingestion;
neither private artifacts nor model request payloads are ready-made public
trace data.

Live export would require bounded queues, payload limits, separate retry
and timeout policy, and caught sink errors. Observation callbacks execute
inline and are not uniformly protected from throwing. A network call or
exception in such a sink could change evaluation behavior. The pinned
[LangSmith client](https://github.com/langchain-ai/langsmith-sdk/blob/290f06a628dffb2ca690e389dc48b629f5623312/js/src/client.ts#L1448)
defaults its HTTP timeout to 90 seconds; batching and `flush()` are not a
proof of the failure isolation this application requires. Export failure
must produce separate trace health, with original local artifacts intact.

Effort is moderate custom adapter work rather than a one-line wrapper:
map existing records, resolve task/delegation correlation, add or explicitly
mark missing lifecycle endings, and validate synthetic field selection.
Full voice lifecycle capture and model-wrapper compatibility add scope.
There is no measured time estimate or demonstrated LangSmith UI fidelity.

Later decisions must settle these precise choices:

- Is post-attempt export adequate, or must diagnosis include live export?
- Which gaps may be marked incomplete, and which require new local events?
- Which task/step trace boundary avoids double counting shared work?

The pilot's contract and final plan can answer these; no extra research
ticket is required by these findings. Before implementation, verify the
chosen published SDK with the OpenAI lockfile version, custom transport,
cancellation, duplicate events, missing completions and failing ingestion
using local stubs. Cloud rendering, actual failure-isolation behavior and
diagnostic value remain unverified until a separately authorized pilot.
