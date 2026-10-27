# Roll out and operate LangSmith sending

This runbook is for the installationsansvarig and sole developer of the
existing Render installation. Follow it with the [Render guide](render.md).
It describes operator work; implementation checks do not authorize account
changes, deployment, household uploads or billable model, voice or judge
calls. Obtain separate authorization for those actions before performing them.
Credentials and opt-in flags are configuration, not authorization.

Use one application instance and its existing SQLite disk. Preserve the
database, authentication secret and installation authority. No diagnostic
archive, recorder, additional service or scheduled assessment is required.

## 1. Verify the account before preparing an enabled release

1. Sign in at [LangSmith](https://smith.langchain.com) using the developer's
   own account. Select the intended region before creating resources.
   Use its default personal organization and one developer. Do not create
   another organization, invite a second seat or add a payment method.
2. Open **Settings → Billing and Usage**. Record privately the organization,
   free Developer plan, absence of a card/payment method, current allowance,
   consumption, remaining traces and reset date. Current documentation gives
   personal accounts without a card 5,000 traces/month; verify the actual
   account. Additional organizations require Plus; a card allows charged
   excess. Stop if these conditions cannot be met. See
   [billing](https://docs.langchain.com/langsmith/billing).
3. Confirm the sole developer can inspect the destination and can request
   deletion. Use account recovery protection and store secrets privately.
   Record access and cleanup prerequisites without credentials or payloads.
   If access or free limits require payment or substantial new work, revisit
   scope before activation. Do not weaken the constraints to proceed.

The [region guide](https://docs.langchain.com/langsmith/regions-faq) explains
that region changes are not migrations and regions are available on free
plans. Match the organization's actual regional UI and API base URL; never
infer region from the household's language. The
[regional endpoint reference](https://support.langchain.com/articles/6271700631-pointing-the-langsmith-sdk-and-cli-at-a-non-us-regional-endpoint)
lists these SDK endpoints:

| Region | SDK endpoint |
| :-- | :-- |
| GCP US | `https://api.smith.langchain.com` |
| GCP EU | `https://eu.api.smith.langchain.com` |
| GCP APAC | `https://apac.api.smith.langchain.com` |
| AWS US | `https://aws.api.smith.langchain.com` |

## 2. Prepare the destination and separate credentials

Check the top-left control. An agent-based workspace names the workspace;
an older project-based workspace shows the LangSmith logo. For an agent-based
workspace, open **New Agent → Observability** and register Skyttel as an
externally hosted agent. Choose a unique ID, for example `skyttel`, and the
production environment. This registers a trace destination; Skyttel continues
to run on Render. Read the selected environment's `tracer_session_name` and
`tracer_session_id` through the account's setup access. These returned values
are the destination name and project UUID; do not derive them from the display
name or agent ID. See
[agent creation](https://docs.langchain.com/langsmith/create-an-agent).

The following optional setup read requires Python 3 and a separately scoped
PAT with permission to read that agent. It prints only destination identities,
never traces. Run it locally in a private terminal; do not put the PAT in
Render or repository files. Supply the verified regional endpoint and
workspace ID. A tracing-only runtime key cannot perform this read.

```sh
python3 - <<'PY'
import getpass, json, sys, urllib.parse, urllib.request
sys.stdin = open('/dev/tty')  # Prompts must not read the script's heredoc.
base = input('Verified regional API endpoint: ').strip()
workspace = input('Workspace UUID: ').strip()
agent = urllib.parse.quote(input('Agent ID: ').strip(), safe='')
token = getpass.getpass('Setup PAT (read agent): ')
request = urllib.request.Request(base + '/api/v1/agents/' + agent, headers={
    'x-api-key': token, 'x-tenant-id': workspace,
})
with urllib.request.urlopen(request, timeout=30) as response:
    result = json.load(response)
for environment in result['environments']:
    if environment['environment'] == 'PRODUCTION':
        print('Destination:', environment['tracer_session_name'])
        print('Project UUID:', environment['tracer_session_id'])
PY
```

For an older project-based workspace, use the metadata-only setup request
below with a separate PAT that can read projects and, for creation, create
projects. Choose `read` for an existing dedicated project, or `create` only
when a new project is authorized. The pinned SDK's project setup uses these
`/sessions` requests in the regional [tracing API](https://api.smith.langchain.com/redoc).
Record the returned exact name and UUID, then inspect retention in that
project's tracing page. This does not submit a trace or invoke a model.

```sh
python3 - <<'PY'
import getpass, json, sys, urllib.parse, urllib.request
sys.stdin = open('/dev/tty')
base = input('Verified regional API endpoint: ').strip()
workspace = input('Workspace UUID: ').strip()
action = input('Project action (read/create): ').strip()
if action not in ('read', 'create'):
    raise SystemExit('Choose read or create; no request sent.')
name = input('Exact project name: ').strip()
token = getpass.getpass('Setup PAT (read/create projects): ')
path = '/sessions'
data = None
if action == 'read':
    path += '?' + urllib.parse.urlencode({'name': name})
else:
    data = json.dumps({'name': name, 'extra': {}, 'description': None}).encode()
request = urllib.request.Request(base + path, data=data, headers={
    'x-api-key': token, 'x-tenant-id': workspace,
    'Content-Type': 'application/json',
})
with urllib.request.urlopen(request, timeout=30) as response:
    result = json.load(response)
project = (
    next(p for p in result if p['name'] == name)
    if action == 'read' else result
)
print('Destination:', project['name'])
print('Project UUID:', project['id'])
PY
```

Pre-create the destination with setup access: the runtime key is not a setup
credential. This integration uses explicit project-name addressing;
agent environments support it through `tracer_session_name`. Do not configure
both address schemes. See
[destination compatibility](https://docs.langchain.com/langsmith/log-traces-to-agent)
and the [project quickstart](https://docs.langchain.com/langsmith/observability-quickstart).

In the selected environment/project, open **Retention** and select **Base**.
Check the actual rolling 14-day policy before uploads. Disable retention
upgrades, evaluators and automation; do not make datasets, experiments or bulk
exports. Dataset copies have independent lifetimes. Inputs/outputs expire
separately from analytics/billing metadata, some of which can remain
indefinitely. Changing retention affects new traces. See
[retention](https://docs.langchain.com/langsmith/usage-and-billing).

Create the runtime key under **Settings → API Keys → API Key → Tracing Only**.
Select only the intended workspace, set expiry and save the one-time secret
in the password manager. Record expiry and a rotation reminder. This key
submits traces/updates but cannot read stored traces, register an agent or
perform cleanup. Keep setup/read/delete access separate and out of Skyttel.
See [key permissions](https://docs.langchain.com/langsmith/create-account-api-key).

Expected result: a pre-created destination with verified base retention, free
remaining capacity, one restricted runtime credential and a permitted cleanup
path. Documentation research does not establish these account facts.

## 3. Prepare users and Render before the first enabled release

Check the currently deployed release first. If it has no diagnostic control
or current conversation information, use an **unconfigured first deployment**:
remove all four `SKYTTEL_LANGSMITH_*` variables from the service and linked
environment groups before approving the first automatic release. Notify users
and end active conversations. With deployment separately authorized, deploy
the completed verified release without those values, then verify health,
release identity, access and **Inte ansluten**. Read the current information
and establish the durable opt-out below before adding credentials. Do not
assume intermediate development releases are already deployed. This initial
deployment does not enable trace uploads or authorize billable checks.

If the deployed release already provides the current information and control,
use them directly. In both paths, complete the following before the first
configured enabled deployment:

1. Inform all Skyttel users of the current conversation information. It names
   OpenAI and LangSmith and explains exact text, relevant household tool
   content, excluded raw audio, installation control and deletion limits.
   Verify that they can read it and accept version 3 before a new conversation.
2. Ask users to end active conversations; pause new conversations during the
   rollout. Preserve household work and saved changes. A later acceptance
   never makes a conversation started under older information eligible.
3. As installationsansvarig, open **Inställningar → Drift → Diagnostik med
   LangSmith** and select **Stäng av sändning**. Confirm the disabled state.
   Keep the same database to carry this guard into the new release.
4. In Render, select the existing service, then **Environment → + Add
   Environment Variable**. Enter the values below privately. These are
   application environment variables, not GitHub deployment secrets.

<!-- markdownlint-disable MD013 -->
| Variable | Value and source |
| :-- | :-- |
| `SKYTTEL_LANGSMITH_ENDPOINT` | The verified regional SDK base URL above, without a path, query or trailing slash. HTTPS is required outside local loopback tests. |
| `SKYTTEL_LANGSMITH_PROJECT` | Exact pre-created project name, or production environment's returned `tracer_session_name`. |
| `SKYTTEL_LANGSMITH_API_KEY` | Runtime tracing-only secret from the selected regional workspace. |
| `SKYTTEL_LANGSMITH_WORKSPACE_ID` | Workspace UUID from its settings/setup response. Set it explicitly, especially if a key can address multiple workspaces. |
<!-- markdownlint-enable MD013 -->

Supply plain values without shell quotes. All first three values are required
to connect. With no configuration, sending is **Inte ansluten**; partial or
invalid settings disconnect the optional sender and show safe export failure.
Household startup remains available. Correct configuration before relying on
diagnostics. Ordinary SDK variables and CLI profiles are not the application
configuration. Remove ambient `LANGSMITH_AGENT_ID` and
`LANGSMITH_AGENT_ENVIRONMENT`: they cause safe disconnection. Do not use
`LANGSMITH_TRACING` as an activation switch. The durable installation control
governs sending.

Choose **Save only** to defer application until the next deployment. **Save
and deploy** redeploys the existing build with new values; **Save, rebuild,
and deploy** initiates a build. Check linked environment groups for conflicting
values; service values take precedence. See
[Render environment settings](https://render.com/docs/configure-environment-variables).
**Restart service** reuses the running deployment's configuration and does
not apply newly saved values. See [deployment effects](https://render.com/docs/deploys).

An approved merge to main can publish and deploy the exact verified image
without a second approval. Complete account preparation, user information,
ending conversations and the durable opt-out before saving configuration or
approving that enabled release. The unconfigured first deployment above can
precede those new controls, provided no diagnostic values are present.
Save-only configuration can become active on the next
automatic release. Follow the Render guide's exact-image release checks;
do not replace this flow with a source build or an older image.

## 4. Deploy, check and explicitly activate

1. With deployment separately authorized, follow the Render update procedure.
   Verify `/healthz`, release identity, database readiness, login and household
   access. Confirm the stored sending state remains disabled. Health success
   alone does not establish sender readiness or valid account access.
2. Verify current consent is required for a new conversation. Confirm that
   old saved acceptance is insufficient and users see the same information
   for text and voice. The application also excludes old-version sessions.
3. Check the rollout checkpoint and remaining human evidence. Obtain explicit
   authorization before enabling uploads and any billable text/voice checks.
   In the diagnostic settings select **Aktivera sändning**. With valid settings
   and no stored suspension, expect **Sändning aktiverad**. With no prior
   opt-out, configured sending would already default on at startup.

The first eligible backend-task observation can upload immediately after
activation. Opening voice can send its `voice_started` root, including
identifiers and reviewed intent, **before context preparation**, transcript
content or a successful Live call. Preparation can itself create a linked
backend summary trace. The separate Live-creation child begins only immediately
before the actual provider call. A failed preparation can therefore leave
voice-root evidence without any Live-creation attempt. Do not wait for a typed
message or natural failure to treat uploading as active.

When separately authorized, check one current-consent text request and one
voice request with controlled permitted content. Each can invoke billable
providers even if tracing is free. In settings refresh delivery health: expect
a recent accepted delivery and inspect drops/errors. In LangSmith select the
verified destination/time range and check one backend trace with model/MCP
children and a separate voice root with explicit delegation links. Follow
linked UUIDs using `trace_id:"<UUID>"` in the current Runs/Traces search scope.
Older filter-chip UIs differ; API filter grammar is separate. See
[trace filtering](https://docs.langchain.com/langsmith/filter-traces).

Inspect the exact outcome in `extra.metadata.status`; a generic LangSmith
success/error category does not replace Skyttel's completed, failed, canceled,
disconnected or incomplete outcome. Confirm excluded raw audio, credentials
and transport metadata are absent. Record release/date, destination, safe
outcomes and unresolved gaps privately without creating a payload archive.
If the destination or content is wrong, stop sending and follow cleanup below.

Local authenticated HTTP/SQLite tests use controlled model/Live providers and
actual SDK ingestion on loopback. They prove composition, linkage, consent,
controls and isolation locally. They do not verify cloud display, actual
account/quota, hosted ingress, physical microphone/audio or human accessibility.

## 5. Operate, recover and rotate

Use [delivery limits and health](langsmith-delivery.md) when diagnosing gaps.
Last accepted delivery, safe error and drop counts are memory-only and reset
on process restart. Opt-out and quota/credential suspension survive restart.
An accepted operation does not prove that all trace endings arrived. Buffers
expire or are dropped; there is no disk archive, replay or backfill.

On HTTP 401/403, verify key expiry, region, destination and workspace scope.
On HTTP 429, inspect actual usage and limits: it can mean rate limiting as
well as exhausted quota. Resolve it within the free allowance, or wait for
reset. Neither ordinary enable nor process restart clears suspension. After
repair, select **Starta om sändning efter kontroll**; it sends only new events.
Do not add a card, paid feature or second seat to recover.

For rotation, stop sending first and confirm disabled state. Create a new
tracing-only key with the same limited workspace and expiry. Replace the
Render secret and deploy the existing verified image with the new environment
values. A restart alone does not apply the saved secret. Verify readiness,
then explicitly resume or recover, with live checks only if authorized.
Revoke/delete the old key after successful rotation; if leaked, revoke it
immediately. Keep setup/delete credentials outside the service.

If tracing disrupts ordinary work, sends excluded data or cannot stay free,
disable sending. This stops admission, discards buffers and cancels active
delivery where possible; already accepted requests cannot be recalled.
During shutdown the sender has at most two seconds to finish or discard.
For rollback/recovery, stop and discard first, remove diagnostic configuration
if needed and **repair forward** using a corrected compatible image. Older
images against upgraded SQLite are unsupported, including retained images
labelled rollback. Do not delete the database or restore old authentication
authority. Household restoration is a separate
[controlled recovery](database-restore.md).

## 6. Remove sending and verify cloud cleanup

1. Disable sending and confirm the state. Remove all four application
   diagnostic variables from Render and linked groups, deploy those changes
   and verify **Inte ansluten** if enabled, or the durable disabled state.
   Revoke the runtime key. Keep household storage and authority intact.
2. With separate cleanup authorization, use the account's scoped read/delete
   access to identify remaining integration traces in the exact destination.
   Do not copy their payloads or bulk-export them. The project UUID is
   `tracer_session_id`, not a Skyttel conversation ID or destination name.
3. Request trace deletion using the current
   [deletion procedure](https://docs.langchain.com/langsmith/data-purging-compliance).
   Its API accepts `POST /api/v1/runs/delete` with the project UUID in
   `session_id` and up to 1,000 `trace_ids`. Use the matching regional API and
   workspace, with the separate cleanup credential. Repeat bounded batches
   until all remaining integration traces are covered.
4. Deletion is asynchronous. Repeat destination/trace queries after processing
   to check removal, including after the documented background deletion
   window. An accepted request is not confirmation. Record pending cleanup
   and follow up with support if permitted queries still return content.
   Some analytics/billing metadata may remain; do not promise physical
   deletion of all metadata within 14 days. Revoke temporary cleanup access.

Opt-out alone never deletes cloud data. Removal requires the cleanup request
and follow-up, independently of ending the assessment.

## 7. Begin the bounded assessment after authorized rollout

Follow the [diagnosis and assessment procedure](langsmith-assessment.md):
first ten natural failures in occurrence order within 14 days, review begun
within 48 hours, at most 30 minutes active investigation per case, independent
cause checking and sanitized records. Keep missing evidence and unresolved
cases. Day 14, case ten and an inconclusive finding do not stop sending.
There is no recurring assessment service or automatic assessment shutdown.

Primary documentation above is checked on 2026-10-27. Actual account conditions,
cloud rendering and deployment remain operator verification. Use the
[pre-rollout checkpoint](langsmith-rollout-checkpoint.md) to record readiness.
