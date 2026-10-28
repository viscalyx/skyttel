# Set up LangSmith for Skyttel development and production

This guide is for the developer and installationsansvarig setting up
LangSmith for the first time. Set up development first, verify it, then
repeat the application steps for production. The result is two destinations:

<!-- markdownlint-disable MD013 -->
| Destination | Receives activity from | Application settings live in |
| :-- | :-- | :-- |
| `skyttel-dev` | Interactive development and manual testing | Private devcontainer environment file |
| `skyttel-prod` | The deployed Skyttel application | Render service environment |
<!-- markdownlint-enable MD013 -->

Use one LangSmith personal organization and its existing workspace for both.
Separate destinations make development activity easy to distinguish from
production. They share the account's allowance; separation does not create
another free allowance or a security boundary between workspace members.

LangSmith receives diagnostic evidence about assistant work. A **trace**
groups a task or voice session with its related model and tool activity.
A **workspace** contains destinations and controls access. In the newer
interface, an **agent** is a named application record with environments.
Registering that record does not move Skyttel into LangSmith: Skyttel still
runs in your devcontainer or on Render.

Follow the [development setup guide](../development/devcontainer.md) for
local login and startup, and the [Render guide](render.md) for deployment.
Keep each installation's existing database, authentication secret and
installation authority. No extra container, diagnostic archive or scheduled
service is needed.

## 1. Gather what you need

Before starting, have:

- Your own LangSmith login, or an email address to create one.
- A password manager for API keys. An API key is a secret used by Skyttel
  to authenticate to LangSmith; do not paste it into chat or commit it.
- Access to Skyttel's installation settings in development and production.
- Access to the private development environment file and Render service.
- A Skyttel revision that includes the diagnostic-sending control and
  configuration described here. A guide in a worktree does not update the
  application running from another checkout.

Account setup, activation and production deployment are separate actions.
For an agent carrying out this guide, credentials and passing implementation
tests do not authorize account changes, uploads, deployment or billable
model/voice/judge calls. Use the authorization already given for each action;
obtain it where it is absent.

## 2. Create or open your LangSmith account

1. Open [LangSmith](https://smith.langchain.com) and sign in or create your
   account. Use the region intended for this installation.
2. Keep the default personal organization and one developer. Do not create
   another organization, add a second seat or add a payment method for this
   setup.
3. Open **Settings → Billing and Usage**. Confirm the Developer plan,
   no payment method, remaining trace allowance and reset date. The documented
   limit for a personal organization without a card is 5,000 traces per
   month. Check the actual account before enabling either destination.
4. Open **Settings** in LangSmith. For the default US region, you can open
   [Settings directly](https://smith.langchain.com/settings). If you use
   another region, stay on that region's LangSmith website.
5. Select **General** and look for **Workspace ID**. If Settings shows
   organization settings instead, select **Workspaces**, click your existing
   workspace, then open its **General** settings. The default US region also
   has a [direct workspace-settings link](https://smith.langchain.com/settings/workspaces).
6. Copy the value labelled **Workspace ID**. It is a UUID with a shape like
   `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Record it privately for both
   installations. If you only see **Organization ID**, return to
   **Workspaces** and select the workspace; that is a different identifier.
   See the [documented Workspace ID location](https://docs.langchain.com/langsmith/create-account-api-key#configure-the-sdk).
7. Confirm that your login can inspect traces and request deletion.
   Protect account recovery and keep access available for later cleanup.

If the account requires payment or additional access, resolve that before
activation. Development activity uses the same allowance as production.
See [account and API keys](https://docs.langchain.com/langsmith/create-account-api-key)
and [billing](https://docs.langchain.com/langsmith/billing).

Record the API endpoint for the selected region:

| Region | API endpoint |
| :-- | :-- |
| GCP US | `https://api.smith.langchain.com` |
| GCP EU | `https://eu.api.smith.langchain.com` |
| GCP APAC | `https://apac.api.smith.langchain.com` |
| AWS US | `https://aws.api.smith.langchain.com` |

Use the API endpoint, not the website address from the browser. Copy it
without a trailing slash, path or query. Do not choose a region from the
household's language: use the account's actual region. Changing regions does
not migrate data. See [regions](https://docs.langchain.com/langsmith/regions-faq)
and the [regional endpoint reference](https://support.langchain.com/articles/6271700631-pointing-the-langsmith-sdk-and-cli-at-a-non-us-regional-endpoint).

**Check before continuing:** you have the region, API endpoint, workspace
UUID, free capacity and access to inspect and delete traces.

## 3. Create skyttel-dev and skyttel-prod

Choose the path that matches your LangSmith interface. Do only one path.

### Path A: the top-left control names your workspace

This is an agent-based workspace.

1. Open **New Agent → Observability** or **Trace existing agent**.
2. Enter `skyttel-dev` in both **Agent name** and **Agent ID**, then create
   the record. Use Observability: Skyttel already runs outside LangSmith.
3. Repeat with `skyttel-prod` as both name and ID.
4. Select `skyttel-dev` and choose **Development** in the environment
   selector. For `skyttel-prod`, choose **Production**. These environment
   names are fixed; `skyttel-dev` and `skyttel-prod` are agent names.
5. Obtain the destination name and project UUID for each selected environment
   using [the lookup below](#look-up-agent-destination-values).

If an ID already exists, open it and verify that it is the intended Skyttel
record before reusing it. You do not need to build or deploy an agent inside
LangSmith. See [agent creation](https://docs.langchain.com/langsmith/create-an-agent)
and [environments](https://docs.langchain.com/langsmith/agent-environments).

Skyttel's destination setting uses the returned `tracer_session_name`.
Do not substitute the agent name, agent ID or project UUID. The two returned
names can look different from `skyttel-dev` and `skyttel-prod`; copy them
exactly. The environment's `tracer_session_id` is the project UUID used for
lookup and cleanup. This is LangSmith's
[compatibility configuration](https://docs.langchain.com/langsmith/create-an-agent#configure-integrations-that-require-a-project-name).

### Path B: the top-left control shows the LangSmith logo

This is a project-based workspace. Create two tracing projects named exactly
`skyttel-dev` and `skyttel-prod`, using
[the project setup below](#create-or-read-project-based-destinations).
It works without relying on a particular version of the project's UI.

For this path, `SKYTTEL_LANGSMITH_PROJECT` is literally `skyttel-dev` in
development and `skyttel-prod` in production. Record each project's returned
UUID separately. Do not create evaluation experiments in place of tracing
projects. See the [tracing quickstart](https://docs.langchain.com/langsmith/observability-quickstart).

### Record the two destinations

Keep this worksheet privately. It contains identities, not API-key secrets.

<!-- markdownlint-disable MD013 -->
| Setting | Development | Production |
| :-- | :-- | :-- |
| Region and API endpoint | From step 2 | Same region and endpoint |
| Workspace UUID | From step 2 | Same workspace UUID |
| Agent/environment, if applicable | `skyttel-dev` / Development | `skyttel-prod` / Production |
| Destination name | Development `tracer_session_name`, or `skyttel-dev` for Path B | Production `tracer_session_name`, or `skyttel-prod` for Path B |
| Project UUID for inspection/deletion | Returned development UUID | Returned production UUID |
<!-- markdownlint-enable MD013 -->

**Check before continuing:** the two destination names and UUIDs are
different. They must resolve inside the intended workspace and region.

## 4. Set retention and create two runtime keys

1. Open each destination's tracing page, selecting the correct environment
   for Path A. Open **Retention** and choose **Base**. Verify the rolling
   14-day policy for new traces.
2. Leave retention upgrades, evaluators and automation disabled. Do not
   create datasets, experiments or bulk exports as part of this setup.
3. Open **Settings → API Keys → API Key → Tracing Only**. Use
   `skyttel-dev` as the description, select only the intended workspace,
   choose an expiration date and create the key.
4. Copy the one-time secret into your password manager before closing the
   dialog. Label it for development and record its expiration.
5. Create another tracing-only key described as `skyttel-prod`. Store and
   label it for production, with an expiration and rotation reminder.

Separate keys let you rotate or revoke one installation's credential.
Their workspace scope does not restrict either key to one destination:
the destination setting determines routing. Check the worksheet when copying.

A runtime tracing key submits traces and updates. It cannot inspect stored
traces, register an agent or perform cleanup. Use your login and, when needed,
a separate personal access token (PAT) for setup/read/delete operations.
Never install that setup token in Skyttel. See
[tracing-key permissions](https://docs.langchain.com/langsmith/create-account-api-key#tracing-keys).

Retention applies separately to payloads and analytics/billing metadata.
Some metadata can remain indefinitely. Changing retention affects new
traces; dataset copies have independent lifetimes. See
[retention](https://docs.langchain.com/langsmith/usage-and-billing).

**Check before continuing:** two destinations, two labelled runtime keys,
verified retention and a permitted cleanup path.

## 5. Prepare each Skyttel installation before adding credentials

Do this first in development, then independently in production. Sending is
enabled by default when valid configuration is present and no stored opt-out
or suspension exists. Establish the disabled state before adding credentials.

1. Start or deploy the tracing-capable Skyttel revision with all four
   `SKYTTEL_LANGSMITH_*` settings absent. If the current release lacks the
   control or current conversation information, use this unconfigured first
   startup/deployment. For Render, remove the settings from both the service
   and linked environment groups before approving that release.
2. Verify application health, login and household access. As
   installationsansvarig, open **Inställningar → Drift → Diagnostik med
   LangSmith**. With no configuration, expect **Inte ansluten**.
3. Select **Stäng av sändning** and confirm the disabled state. Keep the same
   database: this setting survives application restarts.
4. Inform users about the current conversation information, version 3. It
   names OpenAI and LangSmith and describes exact text, relevant household
   tool content, excluded raw audio, installation control and deletion limits.
5. End active conversations and pause new ones during configuration.
   Preserve household work. Accepting newer information does not make an
   older conversation eligible; start new conversations after activation.

An unconfigured first deployment permits the new control to become available
without enabling uploads. Do not assume intermediate development releases
are already deployed. Complete this step before configuring either target.

## 6. Connect development to skyttel-dev

Use the development column of the worksheet and the development runtime key.
Follow [configure development tracing](../development/devcontainer.md#configure-development-tracing)
to edit the private environment file and restart the app. That section covers
ordinary startup, separate worktrees and exported values that can override
the file.

The application reads these four settings:

<!-- markdownlint-disable MD013 -->
| Setting | What to enter |
| :-- | :-- |
| `SKYTTEL_LANGSMITH_ENDPOINT` | Regional API endpoint from step 2 |
| `SKYTTEL_LANGSMITH_PROJECT` | Exact development destination name from step 3 |
| `SKYTTEL_LANGSMITH_API_KEY` | Development tracing-only key from step 4 |
| `SKYTTEL_LANGSMITH_WORKSPACE_ID` | Workspace UUID from step 2 |
<!-- markdownlint-enable MD013 -->

For Path B, the project value is `skyttel-dev`. For Path A, use the returned
Development environment's `tracer_session_name`, not the agent ID.

Skyttel uses these application-specific variables. Do not copy the generic
`LANGSMITH_TRACING` or `LANGSMITH_PROJECT` examples from LangSmith into
Skyttel's setup. Remove `LANGSMITH_AGENT_ID` and
`LANGSMITH_AGENT_ENVIRONMENT` from exports and the private environment file;
their presence disconnects this integration.
CLI profiles do not supply the application's configuration.

Verify that the app starts with the same household data and remains disabled.
Then complete [activation and verification](#8-activate-and-verify-one-installation-at-a-time)
for development before moving to production.

Interactive use and manual testing of the running app can send traces.
Ordinary automated tests use isolated configuration and controlled providers
or ingestion endpoints; the development file does not turn them into cloud
upload tests. Real-model and real-voice suites require their own explicit
authorization for billable calls.

## 7. Connect production to skyttel-prod

1. Confirm step 5 is complete on the actual Render installation.
2. Open the existing Render service, then **Environment → + Add Environment
   Variable**.
3. Add the same four application settings from step 6, using the production
   destination and production runtime key. For Path B the project value is
   `skyttel-prod`; for Path A use the Production environment's returned name.
   Enter plain values without surrounding shell quotes.
4. Check linked environment groups for conflicting values. Service values
   take precedence. Confirm no development destination or key is selected.
5. Choose **Save only** if deployment must wait. When deployment is authorized,
   follow the [Render guide](render.md) to deploy the exact verified image
   with the new environment. Check release identity, `/healthz`, database
   readiness, login and household access.
6. Confirm the stored sending state remains disabled, then continue to step 8.

These are Render application settings, not GitHub deployment secrets.
**Restart service** reuses the running deployment's configuration; it does
not apply newly saved settings. See
[Render environment settings](https://render.com/docs/configure-environment-variables)
and [deployment effects](https://render.com/docs/deploys).

An approved merge to main can publish and deploy without another approval.
**Save only** values can become active on that next release. Finish account
preparation, user information, ending conversations and the durable opt-out
before approving an enabled release. Preserve the existing SQLite disk and
follow the exact-image flow rather than replacing it with a source build.

## 8. Activate and verify one installation at a time

Use invented household information for development. Only use content
permitted for upload in production. Text and voice checks can invoke paid
model providers even when LangSmith tracing is within its free allowance.

1. Confirm the destination worksheet, remaining allowance, disabled state
   and current conversation information. Use the
   [pre-rollout checkpoint](langsmith-rollout-checkpoint.md) for remaining
   human checks. Obtain authorization for uploads and billable checks if it
   is not already given.
2. In **Diagnostik med LangSmith**, select **Aktivera sändning**. With valid
   settings and no stored suspension, expect **Sändning aktiverad**.
3. Start a new conversation and accept the current information. Send one
   short text request using permitted content. If voice checks are authorized,
   open a new voice session and make one request.
4. Refresh delivery health in Skyttel. Check for a recent accepted delivery
   and inspect error/drop counts. Startup health alone does not prove that
   LangSmith accepts traces.
5. In LangSmith, open the matching destination. For Path A, select the agent
   and its Development or Production environment. For Path B, select the
   matching project. Set the time range to include the check you just ran.
6. Open the text task's trace and inspect its model/tool children. For voice,
   inspect the separate voice root and links to delegated backend work.
   Follow linked UUIDs with `trace_id:"<UUID>"` in the Runs/Traces search.
   See [trace filtering](https://docs.langchain.com/langsmith/filter-traces).
7. Confirm the check appears in the intended destination, not the other one.
   Inspect `extra.metadata.status` for the exact Skyttel outcome. Confirm
   raw audio, credentials and transport metadata are absent.
8. Record the installation/release, date, destination, safe outcome and any
   gaps privately. Do not make a local trace-payload archive.

Opening voice can upload its root and reviewed intent before context
preparation, transcript content or a successful Live call. Preparation can
also produce a linked backend summary trace. A failed preparation can leave
a voice root without a Live-creation attempt. Treat uploading as active as
soon as you enable it.

**Success:** each installation reports accepted delivery, and its permitted
text/voice activity appears only in the matching destination. If the
destination or content is wrong, disable sending before investigating.

Local automated tests establish local composition, consent, controls and
linkage. They do not establish actual cloud display, account limits, hosted
ingress, physical microphone/audio behavior or human accessibility.

## 9. Resolve common setup problems

<!-- markdownlint-disable MD013 -->
| What you see | What to check |
| :-- | :-- |
| `Inte ansluten` | Start the tracing-capable revision; supply the endpoint, exact destination name and runtime key in the active environment. |
| Disabled after restart | The opt-out is stored in that installation's database. Enable it only when ready. |
| Configuration/export failure | Check all four values, regional API URL, copied destination name and conflicting exported agent variables. |
| Credential suspension / HTTP 401 or 403 | Check key expiration, workspace access and matching region; do not substitute the setup PAT. |
| Quota suspension / HTTP 429 | Check usage and rate limits. Wait for reset or resolve within the free allowance. |
| Accepted delivery but no visible trace | Check workspace, agent/environment or project, time range and trace completeness. One accepted event does not prove the ending arrived. |
| Development appears in production | Disable development sending, correct its destination/key, restart, then verify new activity. Plan cleanup of wrongly routed data. |
| Environment-file edit has no effect | See the development guide's exported-value instructions; Render needs a deployment with the saved environment. |
<!-- markdownlint-enable MD013 -->

After fixing a quota or credential suspension, select **Starta om sändning
efter kontroll**. Ordinary enable or process restart does not clear it.
Only new events are sent: there is no replay or backfill. Health counters
reset on process restart; opt-out and suspension do not.
See [delivery limits and health](langsmith-delivery.md).

## 10. Rotate a key or stop sending

Rotate one installation at a time:

1. Disable sending there and confirm the state.
2. Create a replacement tracing-only key for the same workspace, labelled
   for that installation. Record its expiry.
3. Replace the private development value and restart using the development
   guide, or replace the Render secret and deploy the verified image with
   the new settings.
4. Verify configuration, then enable or recover sending as appropriate.
   Perform live checks only when authorized.
5. Revoke/delete that installation's old key. If a key leaks, revoke it
   immediately. Keep setup/delete credentials outside both applications.

If tracing disrupts ordinary work, sends excluded data or cannot stay free,
disable sending. This discards buffered events and cancels active delivery
where possible; it cannot recall requests already accepted by LangSmith.
Shutdown has at most two seconds to finish or discard.

For recovery, stop sending, remove diagnostic settings if needed and repair
forward with a compatible image. Older images against upgraded SQLite are
unsupported. Do not delete the database or restore old authentication
authority. Household restoration uses [controlled recovery](database-restore.md).

## 11. Remove an installation's sending and clean up its traces

1. Disable that installation's sending. Remove its four application settings
   from the private development file and exported environment, or from Render
   and linked groups. Restart development or deploy the Render environment.
   Verify `Inte ansluten` if enabled, or the durable disabled state.
2. Revoke its runtime key. Keep the other installation's key, household
   storage and authority intact.
3. With cleanup authorization, use separate read/delete access and the
   worksheet's exact project UUID to identify remaining traces. For Path A,
   this UUID is `tracer_session_id`. Do not use the agent name, destination
   name or a Skyttel conversation ID. Do not bulk-export payloads.
4. Request deletion using the current
   [deletion procedure](https://docs.langchain.com/langsmith/data-purging-compliance).
   Its API accepts `POST /api/v1/runs/delete` with the project UUID in
   `session_id` and up to 1,000 `trace_ids`. Use bounded batches, the matching
   regional endpoint/workspace and the separate cleanup credential.
5. Deletion is asynchronous. Query again after processing, including after
   the documented background deletion window. An accepted request does not
   confirm removal. Record pending cleanup and contact support if permitted
   queries still return content. Revoke temporary cleanup access.

Opt-out does not delete cloud data. Some analytics/billing metadata can
remain; do not promise physical deletion of all metadata within 14 days.

## 12. Assess production usefulness after rollout

Use the [diagnosis and assessment procedure](langsmith-assessment.md) for the
production destination: the first ten natural failures in occurrence order
within 14 days, review begun within 48 hours, and at most 30 minutes active
investigation per case. Check proposed causes independently and keep
sanitized records, missing evidence and unresolved cases.

Development checks do not replace those production observations. Day 14,
case ten or an inconclusive finding does not automatically stop sending.
There is no recurring assessment service or automatic shutdown.

## Setup reference

### Look up agent destination values

Use this only for Path A. First create both agent records in step 3.
Open LangSmith's API-key settings and create a separate **personal access
token (PAT)** using your account's access to read the agents. Keep it in your
password manager, outside Skyttel's environment files and Render settings.
A tracing-only runtime key cannot perform this lookup.

Open a terminal inside the devcontainer. Copy the whole block below, including
the final `PY` line. It uses the installed Python 3; no extra package is
needed. At the prompts, enter the regional API endpoint and workspace UUID
from step 2. The PAT prompt hides what you type or paste. The script reads
destination identities only; it does not upload traces or call a model.

```sh
python3 - <<'PY'
import getpass, json, sys, urllib.error, urllib.request
sys.stdin = open('/dev/tty')
base = input('Regional API endpoint from step 2: ').strip().rstrip('/')
workspace = input('Workspace UUID from step 2: ').strip()
token = getpass.getpass('Setup PAT (read agents; hidden): ')
for agent, target in [('skyttel-dev', 'DEVELOPMENT'),
                      ('skyttel-prod', 'PRODUCTION')]:
    request = urllib.request.Request(base + '/api/v1/agents/' + agent,
        headers={'x-api-key': token, 'x-tenant-id': workspace})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'{agent}: HTTP {error.code}; check setup access.')
    environment = next((item for item in result['environments']
                        if item['environment'] == target), None)
    if environment is None:
        raise SystemExit(f'{agent}: {target} environment is missing.')
    print(agent, target)
    print('SKYTTEL_LANGSMITH_PROJECT:', environment['tracer_session_name'])
    print('Project UUID for cleanup:', environment['tracer_session_id'])
PY
```

Copy the two different names and UUIDs into the worksheet. Keep the project
UUIDs for cleanup; neither is the workspace UUID. You can revoke the temporary
setup PAT after lookup if it is not needed for other authorized setup work.
If lookup fails, check the region, workspace, exact agent IDs and PAT access.
Do not try the runtime key or guess the destination name.

### Create or read project-based destinations

Use this only for Path B. Create a separate setup PAT with permission to read
projects and, when creating them, to create projects. Do not put it in Skyttel.
The pinned SDK uses the regional tracing API's `/sessions` endpoint for
projects. See the [tracing API reference](https://api.smith.langchain.com/redoc).

Copy the whole block into a private devcontainer terminal. For each project,
enter `create` for a new destination or `read` to verify an existing one.
If creation reports HTTP 409, use `read` on the next invocation and verify
the existing project. It does not send traces or invoke model providers.

```sh
python3 - <<'PY'
import getpass, json, sys, urllib.error, urllib.parse, urllib.request
sys.stdin = open('/dev/tty')
base = input('Regional API endpoint from step 2: ').strip().rstrip('/')
workspace = input('Workspace UUID from step 2: ').strip()
token = getpass.getpass('Setup PAT (read/create projects; hidden): ')
for name in ['skyttel-dev', 'skyttel-prod']:
    action = input(f'{name}: read or create? ').strip()
    if action not in ('read', 'create'):
        raise SystemExit('Use read or create; no request sent for this name.')
    path, data = '/sessions', None
    if action == 'read':
        path += '?' + urllib.parse.urlencode({'name': name})
    else:
        data = json.dumps({'name': name, 'extra': {},
                           'description': None}).encode()
    request = urllib.request.Request(base + path, data=data, headers={
        'x-api-key': token, 'x-tenant-id': workspace,
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'{name}: HTTP {error.code}; check name/access.')
    project = (next((item for item in result if item['name'] == name), None)
               if action == 'read' else result)
    if project is None:
        raise SystemExit(f'{name}: no matching project; check workspace.')
    print('SKYTTEL_LANGSMITH_PROJECT:', project['name'])
    print('Project UUID for cleanup:', project['id'])
PY
```

Record both names and UUIDs, revoke temporary setup access when no longer
needed, and return to step 4.

Primary service documentation is checked on 2026-10-28. Verify actual account
conditions and UI labels during setup; local checks do not verify your account.
