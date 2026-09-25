# Text assistant setup and boundaries

This guide is for developers and operators enabling Skyttel's own text
assistant. For reproducible faults without credentials or charges, use
the [controlled local launcher](manual-text-assistant.md).
The [voice setup guide](voice-assistant.md) covers the same assistant with
microphone input and spoken output.

## Enable real provider access

Create a project API key in the
[OpenAI API dashboard](https://platform.openai.com/api-keys). Keep project
access and billing under the operator's control. Add `OPENAI_API_KEY` only
to the server's private environment. For local development, edit the
private file selected by `SKYTTEL_DEV_ENV_FILE`, normally
`.devcontainer/.env`. On Render use the service's private environment
settings and restart with the same persistent disk and authentication
secret. Never put the key into a `VITE_` variable, browser setting, command
history, image layer, screenshot or test report. No key is needed in CI.

Missing configuration leaves normal map editing and external MCP clients
available. The text panel explains that the own assistant is unavailable.
An invalid key, quota problem or provider outage gives an assistant error;
it does not disable the map. Correct or rotate the key in private settings
and restart. Do not print request objects or provider error bodies.

For later real-model checks, use the
[disposable browser installation](testing.md#disposable-local-browser-session)
with invented data and the optional key in the private environment file.
In the map, approve both choices under **Skyttels textassistent** and select
**Starta textassistenten**. Each user makes their own AI choice.
All human execution is deferred to
[#97](https://github.com/viscalyx/skyttel/issues/97); preparation and
deterministic checks do not establish real model interpretation quality.

## Provider and MCP contract

The server uses the pinned OpenAI SDK, the Responses API, `gpt-5.6-terra`,
low reasoning and `store: false`. MCP schemas use `strict: false` so their
optional fields and open custom-value records retain their meaning.
Continuation replays normalized output items, including encrypted
reasoning, plus tool results. It does not depend on stored response IDs.
See the official [model](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
[reasoning](https://developers.openai.com/api/docs/guides/reasoning) and
[function calling](https://developers.openai.com/api/docs/guides/function-calling)
contracts.

A separately consented session performs normal dynamic client registration,
PKCE, signed consent and token exchange. Its server-only OAuth grant calls
the actual `/mcp` HTTP handler through same-origin in-process dispatch.
It initializes the SDK client and discovers the current tool catalogue;
there is no alternate map storage path or fixed list of household types.
`show_map_object` is an additional browser display request: its content
lookup still uses MCP and its result waits for the actual browser display.

Every content tool checks current MCP authority. The extra first-party
guard binds work to the current browser session, cancellation, task
revision and content generation at the synchronous MCP access point.
Public external clients without that guard retain their existing rules.
Each mutation also checks the captured draft version; unexpected versions
stop the task. Fresh MCP authorization is required after memory loss,
access loss or household replacement. Conversation memory and tokens are
not exported household content.

Each submitted message includes the draft and content versions from the
rendered review. A newer background poll cannot silently expand an older
save instruction to additional proposals. Late poll responses cannot replace
a newer task, cancellation or displayed review.

Only a conservative clear save command in the current user's message
enables save tools. Model-provided approval fields have no authority.
Quoted, negative, hypothetical and deferred requests are rejected. This
is a bounded Swedish command check, not independent proof of arbitrary
natural-language intent. Ambiguous phrasing needs a new clear command.
The application status comes from receipts and browser acknowledgements;
ordinary model prose is separately labelled and is not a truth verifier.

Save preparation records a stable operation before execution. Unknown
results block new work until checked through MCP. Restart recovery reads
the persistent operations through a newly authorized connection; retries
use the original operation, draft and content versions. Stopping a task
does not undo a completed save.

## Lifetime and technical metadata

Conversation and grant memory lasts at most 30 minutes, bounded by OAuth
expiry, and is cleared on stop or graceful application shutdown. Leaving
the map requests a stop; an interrupted browser can rely on expiry.
Each task allows at most 48 provider iterations and 500,000 characters of
continuation context. A provider request times out after two minutes.
The SDK makes no hidden retries. Limits and provider failures leave the
persistent draft available to normal forms.

`createApp` accepts a `modelUsage` callback with typed `TextModelAttempt`
metadata for the cost feature. A locally generated attempt ID is emitted
before dispatch, then finalized using that same ID. Each actual request
gets a new attempt. UTC start/end times, model, provider request/response
IDs and bounded input, cached, cache-write, output and reasoning counts
are included when known. Missing measurements remain `null`; completeness
is explicit. The consumer upserts by attempt ID and owns persistence.
No conversation, map values, audio, images or credentials enter this
callback. An interrupted request can finish with unknown usage.

The test fixture replaces only external provider fetch and identity
responses. Public HTTP, browser, OAuth/MCP and real SQLite still run.
Production has no arbitrary provider URL, test login or model selector.
