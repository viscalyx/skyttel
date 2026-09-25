# Controlled local voice-assistant checks

Use this disposable fixture to check Skyttel's voice controls, delegation,
delayed backend work and recovery. The browser runs the actual application
and Live SDK; authentication, OAuth/MCP and SQLite are real. External identity,
Live and Terra responses are controlled substitutes. Browser microphone and
WebRTC resources are also substitutes, with silent synthetic media tracks.

**This fixture does not listen to your microphone or speak.** It does not test
speech recognition, Swedish pronunciation, actual browser permission prompts,
device audio or real-provider availability. The application's listening label
describes the simulated connection. Keep actual speech/device results separate.
Integration tests cover these controls; #97 does not require a manual
repeat. Use the [real speech check](../real-voice-tests.md) for automated
provider evidence. Human listening and equipment assessment remain separate.

## Start the isolated application

From the repository root in the devcontainer, run:

```sh
npm ci
npm run build
node --import tsx scripts/manual-voice.ts
```

The launcher accepts no origin, database or credentials. It uses a fresh private
temporary directory, ignores the normal private environment file, and makes no
real Google, Microsoft or OpenAI requests. Keep its terminal open.

Wait for `ready`, which prints `origin` and `directory`. Forward that random
port privately in VS Code's **Ports** panel, using the same host port.

For the prepared family case, enter `seed-family` in the launcher's terminal
**before opening the browser or signing in**. Wait for `seeded`. The household
is **TestHousehold**,
with Molnmusik, people, accounts, addresses, payment roles, a private draft
and a concurrent Lo-name conflict. This is the same synthetic setup as the
browser test. The command refuses any database with an existing user; it
never resets your current work. Use a new launcher for a different case.

Open the exact printed `http://127.0.0.1:PORT` origin in a new private browser
window. Sign in with Google as the controlled **Alex Exempel**. The prepared
family case opens its existing household. Otherwise, create **Talprov** through
the normal form. Use only invented information.

Open **Skyttels textassistent**, approve its separate AI and map-work choices,
and select **Starta textassistenten**. Then choose **Starta röst** under
**Tala med Skyttel**. In fullscreen map mode, open **Visa detaljer och utkast**
to reach these controls. The fixture needs no hardware microphone permission.
Keep the tab open and active: its normal status requests maintain the server's
voice connection. Closing the tab is a connection-loss check, not a pause.

## Transcript fragments and delegation

Commands below go into the launcher's terminal, not a shell. Start exactly one
voice session at a time. To simulate a request, enter these separate lines:

```text
user Läs vilka typer hushållet har.
delegate
```

`user` sends one input-transcript fragment. It does not claim that a pause or
fragment is a complete instruction. `delegate` sends a separate metadata-only
delegation event with a new ID. The application builds the current task from
the fragments and prior bounded context, then calls the shared text backend.

A `held` event identifies each stopped Terra request with a numeric `id` and
shows its synthetic context, draft versions, latest tool result and tool names.
If request `1` is held, enter:

```text
tool 1 read_type_catalog {}
```

The actual MCP client reads the catalog. The next `held` event has a new ID;
its `lastToolResult` contains the actual types. If that ID is `2`, finish with:

```text
reply 2 Typkatalogen är läst. Inget har sparats.
sessions
```

`sessions` shows active provider IDs and the commentary events sent by Skyttel.
Completion must refer to the originating delegation ID. Commentary submission
is not proof of audible speech; this fixture has no speech output. For proposals
and saves, check the browser's whole draft, actual MCP results and durable
receipts. Follow the manual case's exact tool arguments, using IDs and versions
from the held request. The launcher does not repair stale arguments.

## Terminal controls

<!-- markdownlint-disable MD013 -->
| Command | Effect |
| --- | --- |
| `seed-family` | Prepare the synthetic family map and conflict before the first sign-in; refuses a nonempty installation. |
| `user TEXT` | Add a synthetic user transcript fragment; a new fragment can interrupt older backend work. |
| `assistant TEXT` | Add prior synthetic assistant speech as context; it grants no save authority. |
| `delegate` | Send a new metadata-only delegation for the accumulated user fragments. |
| `pending` | Inspect held Terra requests and their original synthetic context. |
| `tool REQUEST TOOL JSON` | Release one model tool call through the actual MCP entry point. |
| `reply REQUEST TEXT` | Release a final model reply; it cannot manufacture a durable receipt. |
| `fail REQUEST` | Fail that held Terra request at the external provider boundary. |
| `usage SECONDS` | Send cumulative Live usage, not an increment. |
| `final SECONDS` | Send a matching final Live closure event with total seconds. |
| `finalize off` | Withhold the final provider event when Skyttel requests closure. |
| `finalize on` | Restore final closure events for subsequent stops. |
| `drop` | Drop the controlled server-side provider connection. |
| `sessions` | Inspect current provider IDs and submitted commentary/close events. |
| `restart` | Reject held responses and restart with the same temporary database and origin. |
| `quit` | Stop the application and remove the temporary database. |
<!-- markdownlint-enable MD013 -->

For a delayed response, leave a request held while the case changes or discards
the draft, cancels work, stops voice or supplies a correction. Release the old
request afterward with its original ID and arguments. The SDK may ignore an
aborted request entirely. The browser and persisted draft/receipt determine the
result; a terminal `released` event alone proves no application change.

To check incomplete final usage, send `usage 12`, then `usage 15`, then
`finalize off`. Stop voice in the browser. The last known total is 15, not 27,
and the final provider value is unknown. In the browser Network panel, the
voice `stop` response exposes `voice.seconds: 15` and `voice.usageFinal: false`.
Restore `finalize on` before the next session. These synthetic values do not
prove provider billing or any actual charge.

For restart recovery, enter `restart` and wait for `restarted`. Reload the page,
approve a fresh assistant connection and inspect the persistent draft and
previous save attempts. Conversation and voice resources do not survive;
committed map changes and durable receipts do. The controlled recovery case
prepares a pending attempt and separately interrupts an already confirmed save.
It does not hide a post-commit reply; record that distinction in its result.

## Browser transport and audio controls

Open this fixture's browser developer console. These controls exist only in
the disposable fixture and change the external browser media substitute. They
do not change production settings or the application's access rules.

Before choosing **Starta röst**, simulate denied microphone access:

```js
window.skyttelVoiceFixture.setMicrophone('deny');
```

After checking the visible error and working forms, set it back to `allow`
and start again. Use `error` instead of `deny` for a missing-device failure.
To simulate blocked audio playback, set this before starting voice:

```js
window.skyttelVoiceFixture.setPlayback('blocked');
```

Require the visible playback message and **Spela upp ljud** button. Set playback
to `allow`, then press that button; the simulated playback warning should clear.
No sound is produced. During an active session, the following console command
simulates a broken native connection:

```js
window.skyttelVoiceFixture.disconnect();
```

Use `reconnect()` within three seconds for a transient interruption. Leave it
disconnected for the application's timeout, or use `fail()` for immediate
failure. `audioError()` emits a media-output error. After stopping, inspect:

```js
window.skyttelVoiceFixture.stats();
```

Require `openPeers: 0`, `audioElements: 0`, and `state: 'ended'` for every
microphone and remote track. A disconnected connection must disable its
microphone track while waiting. These are actual silent browser media tracks,
not evidence that a physical microphone or speaker works. Reloading resets all
substitute controls; a new voice session follows normal application rules.

## Cleanup

Stop voice, then type `quit` in the launcher terminal, or press Ctrl+C. Wait for
`closed`, which prints the removed directory. From another terminal, set the
variable to the exact directory printed by this launcher's `ready` event:

```sh
SKYTTEL_VOICE_CASE_DIR='/tmp/skyttel-test-REPLACE-WITH-PRINTED-DIRECTORY'
test ! -e "${SKYTTEL_VOICE_CASE_DIR:?}" && printf '%s\n' 'Fixture removed'
unset SKYTTEL_VOICE_CASE_DIR
```

Close the private browser window and remove its port forward. If the process is
forcibly killed, stop any remaining process before removing only its printed
temporary directory. Each new launcher starts empty. Do not publish terminal
recordings: the intentionally visible fixture context is synthetic household
content. Never use this launcher with real household information.
