# Voice assistant setup and boundaries

Voice uses the existing [text assistant setup](text-assistant.md) and its
server-private OpenAI key. The approved providers are `gpt-live-1` with
`marin`, WebRTC and client delegation, and `gpt-5.6-terra` with low reasoning
for map work. There is no model selector or separate voice key in the browser.
The production dependency on `ws` supplies the SDK's server sideband transport.

## Enable and operate

Keep the normal HTTPS application origin in production. A localhost browser
can use the [disposable development setup](testing.md#disposable-local-browser-session).
A remote browser needs a secure origin for microphone access; plain HTTP on a
remote machine is insufficient. Permit outbound HTTPS and WebSocket access to
OpenAI from the server and WebRTC media connectivity from the user's browser.
The browser exchanges its SDP offer with Skyttel; it never receives the API key
or the server's OAuth token. Existing Content Security Policy stays in effect.

Approve the separate AI and map-work choices, then select **Starta talsamtal**,
or **Starta röst** in an active text conversation. These explicit actions
request microphone access.
The microphone remains disabled until both the connection and Live protocol
are ready. Autoplay restrictions show **Spela upp ljud**. A denied microphone,
failed provider, broken connection or audio error leaves text and forms usable.
Stop capture immediately on disconnect; allow three seconds for a transient
connection interruption, then close. There is no automatic reconnection.
**Pausa mikrofon** disables the existing microphone track without stopping
it or the Live session; remote audio remains available. Transient connection
recovery respects the paused state. **Återuppta mikrofon** enables that same
track only after both the connection and protocol are ready.

Use only invented household information for real-provider acceptance. The
[manual cases](../manual-tests/voice-assistant.md) distinguish real Swedish
speech and hardware from the [controlled local launcher](manual-voice-assistant.md).
The [automated speech check](real-voice-tests.md) sends a recorded Swedish
request through the real providers. Human listening and physical equipment
assessment remain in [#97](https://github.com/viscalyx/skyttel/issues/97).
Automated substitutions and earlier platform prototypes do not establish
device support; previously deferred device checks remain deferred.

## Authority and conversation lifetime

The actual OpenAI SDK creates the Live session with `store: false`. A server
sideband is the single delegation executor. Browser data-channel capabilities
permit closure, lifecycle events, both transcript streams and delegation
boundaries; they do not execute map tools. The browser accumulates dialogue
in memory, labels both speakers and preserves short-pause continuations using
audio timestamps when available. The visible clock follows the current work
phase and revision, outside the live announcement region.
Reflected audio is ignored. The server holds raw input/output transcript
fragments with timing in bounded memory, preserving words across deltas.
A metadata-only delegation event uses the complete new user fragments before
its timeline boundary. A pause or partial fragment alone executes nothing.

Each delegated request goes through the existing text HTTP service, actual
MCP catalog and current OAuth authority. It retains draft/content versions
captured when the first new input fragment arrived. Previously spoken context
is data; only the current new user's words can authorize saving. Negative,
quoted, hypothetical, deferred or ambiguous save phrases need a fresh clear
instruction. A correction and explicit save can be one current utterance.
The command check is conservative, not proof of arbitrary language intent.

New user input immediately invalidates associated pending work. The internal
HTTP request carries that cancellation signal, including before acceptance;
an accepted voice task also has an exact revision guard. Independent newer
text tasks are not canceled by an older voice task. Stops do not undo committed
saves. Unknown operations use normal receipt recovery; **Slutför samma
sparförsök** retries the one pending operation with its original identity and
versions. A new connection after restart discovers those operations through
fresh normal MCP authorization.

Completion uses `session.commentary.append` and the actual delegation ID.
Its text is bounded to 480 UTF-8 bytes, below the provider's 500-token limit.
Confirmed save and selection messages derive from durable receipts and the
browser's actual selection acknowledgement. Commentary separates
**Skyttels resultat** from **Modellens obekräftade samtalstext**. Provider
conversation is bounded and quoted as unverified input, never added to the
verified result. Useful questions remain conversation rather than proof.
The browser also explains that AI speech can be wrong. Ordinary model prose
cannot set application success state. Commentary acceptance is not proof
of audible speech
or exact spoken wording. See the official
[client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
and [server controls](https://developers.openai.com/api/docs/guides/voice-server-controls)
contracts.

The browser sends a heartbeat every 500 milliseconds. Ten seconds without it
ends the server voice session and its associated work. Task execution has a
two-minute bound. Context retains at most 40 fragments and 8,000 serialized
characters, with at most 4,000 characters in a new request. Session event and
delegation limits stop unusually long sessions; restart voice to continue.
Stopping voice clears the server's transcript memory. The browser keeps the
visible dialogue until the text conversation ends, access is lost or the page
reloads. Closed status is retained for one minute
for reply recovery, then removed. No audio or conversation is household content,
export data, technical logs or restored authentication state.

## Usage and closure

The server sends `session.close` and retains the sideband for up to two seconds
to receive final `session.closed` usage before releasing the transport. A lost
final event leaves the last known seconds provisional, or `null` if unknown.
Cumulative updates of 12 then 15 mean 15, not 27. Final totals cannot decrease.

`createApp` accepts a `liveUsage` callback containing `LiveUsageAttempt`:
local attempt ID, provider session ID when available, model, UTC start/end,
seconds, finality and outcome. Emit before dispatch, then upsert the same attempt
as usage arrives. Failed or interrupted calls do not become certain zero.
No actor, household, transcript, audio or credentials enter this callback.
The operator cost feature owns persistence and pricing; voice does not calculate
bills. The provider's credited startup minimum is not an added duration.
