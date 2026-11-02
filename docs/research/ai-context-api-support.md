# API support for smaller context and fewer model rounds

For maintainers assessing changes to Skyttel's shared text and voice
conversation. Sources checked 2026-11-02; repository baseline:
`8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625`. This documents mechanisms and
limits, without choosing an architecture. No billable API calls are involved;
account access, actual cache hits, quality and latency remain unmeasured.

## Separate the effects

<!-- markdownlint-disable MD013 -->
| Mechanism | Less context sent by Skyttel | Less repeated processing or smaller context | Fewer sequential model rounds |
| --- | --- | --- | --- |
| Prompt caching | No | Reuses matching prefix computation; context still exists | No |
| Stored response/conversation reference | Yes | History remains model input and is billed | No |
| Responses WebSocket continuation | Yes, while connection state survives | Reuses connection state; no context reduction guarantee | No |
| Compaction | Yes, after replacing/pruning input correctly | Smaller subsequent context | No guarantee; standalone compaction adds a request |
| Encrypted reasoning replay | No; replay carries additional items | Preserves compatible reasoning, without guaranteeing less work | No guarantee |
| Multiple function calls in one response | Not inherently | Not inherently | Can combine independent calls before the next model response |
| Skyttel's read cache | No | Avoids repeated underlying reads | No |
<!-- markdownlint-enable MD013 -->

The table is an interpretation of the mechanisms below, not a performance
measurement. Reduced transport, reused computation, billed input and model
round count must be measured separately.

## Current application behavior

The [request wrapper](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant-model.ts#L95)
sends instructions, tools and accumulated input through Responses with
`store: false` and `parallel_tool_calls: false`; it records input, cached,
cache-write, output and reasoning usage separately. The
[conversation loop](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L1450)
appends all response output through `toResponseInputItems`, including
non-message items, then adds serialized tool results.

The [read cache](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/assistant-read-cache.ts#L17)
reuses successful reads only while dependency revisions match, including a
check after asynchronous loading. It returns the result value, not a model
reference. Consequently a hit still becomes tool-result content when the
loop appends it; it does not automatically shorten model context.

The [summary installation](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L613)
replaces provider input atomically with a historical summary, recent dialogue
and any continuation. The
[summary generator](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/conversation-summary.ts#L7)
uses ordinary text, shareable between Responses and Live; large sources need
several model calls. Summary text carries no authority to change or save data.

## Prompt caching

OpenAI reuses KV states for an identical rendered prefix, including hidden
instructions, developer content, tool definitions and history. Skyttel must
still supply its input. Changed tools, ordering, schemas, instructions,
reasoning effort or compaction can break matching from the changed point.
Stable content belongs before changing data.

For GPT-5.6 and later, including the documented Sol/Terra cache rates:

- Minimum prefix: 1,024 visible input tokens.
- Implicit caching is default; explicit breakpoints are supported. Top-level
  `instructions` cannot contain a breakpoint; a developer `input_text` can.
- `prompt_cache_options.ttl`: `30m` default or `12h`, both minimum lifetimes.
  Writes cost 1.25 or 2.5 times uncached input respectively; Sol/Terra reads
  cost 0.05 times uncached input. One-off writes can therefore cost more.
- A 30-minute read refreshes coverage to at least 30 minutes after the read;
  it does not restart a 12-hour lifetime. Eligibility does not guarantee
  physical KV reuse or lower latency.
- `prompt_cache_key` can separate accounting; it is unnecessary for routing
  optimization on these models. Older retention parameters differ.

Source: [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

## Context references and transport

Responses can chain `previous_response_id`, or use a durable Conversations
object instead of resending every item. Previous input remains billable.
Stored responses have a default 30-day lifetime; conversation items do not
have that TTL. This is a storage change from Skyttel's current stateless HTTP
requests. Source:
[OpenAI conversation state](https://developers.openai.com/api/docs/guides/conversation-state).

Responses WebSocket mode explicitly supports `store: false` and Zero Data
Retention (ZDR). Send incremental items with `previous_response_id`; recent
state stays in a connection-local memory cache. With no persisted fallback,
a missing ID returns `previous_response_not_found`: restart with a null ID
and full context. A failed same-lane continuation evicts the referenced ID.
Connections last at most 60 minutes; closing them loses the cache. Application
recovery must retain enough history to replay it. This reduces transport
without removing dependent model rounds. General WebSocket support does not
prove every model/parameter combination works for the installation. Source:
[OpenAI WebSocket mode](https://developers.openai.com/api/docs/guides/websocket-mode).

## Compaction and reasoning at store: false

Server-side `context_management` with `compact_threshold` compacts inside a
normal Responses request and emits an opaque encrypted compaction item. It
supports `store: false`. With manual input chaining, preserve output items;
after the latest compaction item, earlier items can be dropped. With ID
chaining, do not manually prune.

The separate `/responses/compact` endpoint is stateless and ZDR-friendly.
Its input must still fit the model window. Pass its entire returned window
to the next request unchanged: retained items can accompany the encrypted
item. This output rule differs from server-side compaction. Neither mode
guarantees preservation of every detail or fewer total model passes.
Source: [OpenAI compaction](https://developers.openai.com/api/docs/guides/compaction).

Current documentation returns `encrypted_content` in reasoning output by
default when `store: false` or ZDR applies; the legacy
`include: ["reasoning.encrypted_content"]` remains accepted but unnecessary.
For supported `reasoning.context: "all_turns"`, replay all output items and
complete history in order. Tool-call reasoning must accompany tool results.
Only compatible reasoning within a model family is reusable; encryption is
not a portable text summary. Sol is explicitly named for `all_turns`; the
effective mode is returned as `reasoning.context`. Skyttel already preserves
output items, so the missing legacy include flag alone establishes no defect.
Source: [OpenAI reasoning](https://developers.openai.com/api/docs/guides/reasoning).

## Function calls and ordering

The API can emit several function calls in one response; applications must
return each result using its `call_id` and retain associated reasoning items.
`parallel_tool_calls: false` restricts output to zero or one call. Enabling
it permits multiple calls, without guaranteeing that the model chooses them
or that application execution becomes concurrent. Built-in tools cannot be
part of a parallel function-call batch. Source:
[OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling).

Independent reads could therefore share a model round. A read whose arguments
depend on another result still needs that result first. Skyttel's
[ordered execution](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L1614)
and [version/save guards](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L1807)
make indiscriminate parallel writes unsafe. Its existing `submit_changes`
batch requires a sole call and already groups ordered operations; removing
the flag alone does not redesign those contracts.

## Storage and model boundaries

`store: false` is not a promise that all processing leaves no retained data.
Ordinary abuse logs can retain content for up to 30 days, subject to stated
exceptions. Prompt-cache encrypted GPU state has a 24-hour maximum; a cache
TTL is a minimum, not deletion timing. Server-side compaction retains no data
when `store` is false. Conversations are retained until deleted and are not
ZDR eligible. Source:
[OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
  and [GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra)
  document Responses function calling and prompt caching, with 1,050,000
  context tokens and a separate 922,000 input maximum. Neither supports Live.
- The [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model)
  describes compaction and persisted reasoning at family level. The examined
  pages do not provide a complete per-model matrix for compaction thresholds,
  parallel-call combinations or Terra's `all_turns` setting. General mechanisms
  are not installation-specific verification.
- **GPT 6.1 Luna:** no official exact-name search result or model page is
  available in this investigation; `/models/gpt-6.1-luna.md` returns 404.
  Its compatibility remains unknown. GPT-6 Luna is a different documented
  identity and is not substituted here.
- [GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1)
  supports Live sessions, not Responses. Backend reasoning/tools are separate.
  Responses cache, encrypted reasoning and compaction items are therefore
  not established as Live inputs.

Live's own
[session management](https://developers.openai.com/api/docs/guides/live-conversations)
uses a 128,000-token context, including invisible audio tokens. Above 90%, a
replacement engine receives original instructions and up to 8,192 history
tokens, potentially including a summary. Details may disappear. Stored-session
forking requires an explicitly stored completed recording; storage defaults
to false and is unavailable under ZDR. Skyttel's
[Live startup](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/voice-assistant.ts#L540)
instead uses `store: false`, client delegation and text history.

## Remaining design questions

1. Which independent reads can share a model round while preserving revision,
   access and save checks, including concurrent changes by other clients?
2. Should smaller transport depend on connection-local state, with a complete
   replay path, or on persisted provider state with different retention?
3. How will a compacted Responses context coexist with Live's text history
   and application-owned pending work, receipts and summary authority rules?
4. Which exact model and parameter combinations need a separately authorized
   provider compatibility check, especially Terra and the unresolved Luna ID?
5. How much input is transmitted, reused, newly written to cache and billed per
   completed request, and how many model rounds remain after each change?

These questions require design and measurement beyond documentation research.
