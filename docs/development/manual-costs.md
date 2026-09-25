# Controlled local cost checks

Use this launcher for reproducible browser checks of installation costs.
The app, authentication, OAuth/MCP, usage recording and SQLite are real.
Only external identity/model responses and browser media are controlled.
No real provider requests, credentials, microphone or paid usage are needed.
Integration tests cover these controlled scenarios. Manual repetition is
optional troubleshooting and is not required by #97.

## Start and stop

Run from the repository root in the devcontainer:

```sh
npm ci
npm run build
node --import tsx scripts/manual-costs.ts
```

Wait for the JSON `ready` event containing `origin` and `directory`. Keep the
terminal open. Forward that random port privately in VS Code's **Ports**
panel, using the same host port. Open the exact printed
`http://127.0.0.1:PORT` address in a new private browser window.

The launcher accepts no arguments or database path, ignores the private
application environment file, and creates a fresh private temporary database.
Google signs in as **Alex Exempel**, the configured installation operator.
Create **Kostnadsprov** through the ordinary form when a case needs a map.
Use only invented information. No demo household is installed automatically.

Commands below go into the launcher's terminal, not a shell. Use `restart`
to restart the server with the same database, origin and browser cookies.
Reload the browser afterward. Use `quit` when finished; require the `closed`
event and check that its `removedDirectory` no longer exists. Start a new
launcher for each case. Never reuse a real installation for these controls.

## Controlled measurements

<!-- markdownlint-disable MD013 -->
| Command | Effect |
| --- | --- |
| `text known` | Future Terra replies report the worked example below; this is the default. |
| `text missing` | Future Terra replies succeed without a usage object. |
| `text held` | Future Terra requests wait until released or interrupted by the app. |
| `release` | Release held requests with the known measurements. |
| `delegate` | Send the synthetic request through the active voice session to the actual Terra backend. |
| `usage 90` | Send cumulative reported seconds to the single active Live session. Repeating a value does not mean extra usage. |
| `finalize off` | Suppress the final Live measurement when the app closes the session. |
| `finalize on` | Restore final measurements, using the latest `usage` value; this is the default. |
| `identity robin` | Future external sign-ins identify Robin Exempel; existing sessions remain unchanged. Use Microsoft for Robin. |
| `identity alex` | Restore Alex for future sign-ins. Use Google for Alex. |
| `restart` | Cancel held requests and restart the same installation. |
| `quit` | Stop the application and remove its temporary directory. |
<!-- markdownlint-enable MD013 -->

To generate Terra usage, open **Skyttels textassistent**, approve both AI
and map-work choices, select **Starta textassistenten**, and send
**Prova kostnadsunderlaget.** The fixed response is
**Det kontrollerade kostnadsprovet är klart.** No map change is proposed.

To generate Live usage, choose **Starta röst**, wait for **Lyssnar. Du kan
tala, rätta eller be att spara hela utkastet.**, then enter `usage` commands
in the terminal. Keep the tab active
until **Stäng av rösten** finishes. The fixture supplies silent media
tracks; it neither listens nor speaks. A new session requires a new start
action. Set `finalize off` before stopping to preserve provisional usage.

KOST-01 uses `delegate` after voice startup. It sends the same synthetic
request as a voice transcript fragment and delegation event. The actual
server invokes Terra through the shared assistant, so both categories
come from one voice task. Wait for the fixed response before stopping.

The known Terra example is 100,000 input tokens: 20,000 cache reads,
10,000 cache writes and 70,000 ordinary input. Its 5,000 output tokens
already include 2,000 reasoning tokens. At the recorded Standard rates,
this is `0.14 + 0.004 + 0.025 + 0.06 = 0.229 USD`.
A final 90-second Live session costs an estimated `0.075 USD`.
Together with the default full-month Render assumption of `7.25 USD`,
the estimated subtotal is `7.554 USD`, or `75.54 SEK` at the explicit
assumption of 10 SEK/USD. Changing that assumption to 11 gives `83.09 SEK`
after presentation rounding. A fresh installation still shows incomplete
month coverage; the known example does not establish earlier usage.

## A failed refresh without losing the last values

After opening **Månadskostnad**, use Chromium's developer tools network
request blocking to block `*/api/operator/costs?*`. Keep the page open
and select **Uppdatera underlaget**. The page must show an error and retain
the previously fetched values as stale. Remove the block and refresh again.
Do not reload the whole page while blocking: that tests initial loading
instead of retaining already fetched values.

The Playwright equivalent returns a controlled HTTP 503 for that same
browser request. It asserts visible stale status and unchanged values,
then removes the failure and verifies recovery.

## Two identities

Keep Alex's private window open. Enter `identity robin` and use a separate
browser profile or a different browser with its own cookies. Sign in with
Microsoft there. Copy Robin's Skyttel user ID and use Alex's ordinary
membership page to invite that ID. Accept the invitation as Robin, then
promote Robin to administrator as Alex. This gives Robin household
administration, not installation cost access.

`identity` changes only future sign-ins. It does not impersonate another
user in an existing session. To sign in again as Alex, enter
`identity alex` first. Follow the linked manual cases for role changes
and sign-out; all changes affect only this disposable installation.

The exact browser workflows are in
[KOST-01–KOST-03](../manual-tests/costs.md). Current operator configuration,
rate maintenance and limits are described in the
[operator runbook](../operations/costs.md) and
[cost implementation guide](costs.md).
