# Deploy and recover Skyttel on Render

This runbook is for the production operator. An approved merge to `main`
publishes a verified GHCR image and then deploys that exact digest. A stable
tag publishes a release but does not replace production. No second approval
is required after merge.

## Prepare the service once

Use a Render Hobby workspace with one paid, image-backed web service.
Choose Frankfurt as the initial region. Do not connect the service to a
Git repository for builds. Select a verified release by its full
`ghcr.io/viscalyx/skyttel@sha256:...` reference. Keep the registry image and
its signed release evidence available for each planned recovery version.
For a private package, use a registry credential with read-only package
access. Follow the [release verification guide](../development/container-releases.md).

Attach one persistent disk at `/data`, writable by UID/GID 1000. Keep the
database at `/data/skyttel.sqlite`. Configure the secrets and provider
registrations from the [installation guide](installation.md). Keep the
authentication secret unchanged across deployments. Use one instance and
disable autoscaling and automatic deployment. Set the HTTP health check
path to `/healthz`. Leave the Docker command and pre-deploy command empty.
The image starts the application, runs migrations and verifies the
authentication schema before opening its listener.

Render's [persistent disk rules](https://render.com/docs/disks) require an
interruption during replacement. Its
[pre-deploy command](https://render.com/docs/deploys#pre-deploy-command)
cannot access that disk. Do not move database migration into that command.
Do not add a database server, second application instance or automatic
backup job.

Create the GitHub `production` environment. Restrict it to the protected
`main` branch and do not add a required reviewer. Store `RENDER_API_KEY` as
an environment secret. Set environment variables `RENDER_SERVICE_ID` and
`SKYTTEL_ORIGIN` to the service ID and public HTTPS origin. Use a dedicated
Render account with access limited to the deployment workspace; Render's
API key inherits its account's access. Do not use a personal account with
unrelated services. The deployment job's GitHub token can read release
artifacts and create deployment status records; it cannot publish images.

Enable Render deployment-failure notifications for the operator and GitHub
Actions failure notifications for the release workflow. Verify both
destinations with a controlled failed check before relying on them. A
GitHub deployment failure and workflow error are recorded even if Render
calls a deployment live but the application's checks fail.

The initial service must run a verified image with `/api/version` support
before enabling automatic updates. For an existing installation without
this endpoint, perform the first compatible update during an attended
maintenance window. Verify its release evidence, disk and database state
with the procedure below. Automation will not guess the state of an older
installation that cannot report its identity.

## Read a deployment result

Open the release workflow's deployment job and its
`render-deployment-<attempt>` artifact. The JSON report contains only the
requested version, commit and digest, observed app identity, database schema
identity, Render deployment status and check outcomes. Retain it with the
release evidence beyond the 90-day artifact retention period.

Success requires all of the following:

- The saved service image and deployment image use the requested digest.
- Render reports that deployment live with the same resolved digest.
- `/healthz` succeeds and `/api/version` reports the baked version and
  commit with a readable, migrated database.
- The anonymous bootstrap and application page respond correctly.
- The final service and deployment inspection still identify this rollout.

The digest comes from Render's resolved deployment image; the version and
commit come from the image's compiled application. The image cannot embed
its own final digest. The report joins these independent observations.
The public endpoints contain no household names, content or identities.

Release checks include a disposable container test with synthetic household
content. It checks ordinary restart and replacement on the same disk,
including private drafts, objects, history and save receipts. It also
injects a failed migration and verifies that existing content remains.
Add personal-view persistence to this same check when that feature arrives.
Deployment controller tests simulate Render failures and competing releases.
These automated checks do not establish real Render or provider behavior;
verify the first live rollout and the real-provider checks separately.

After the first live rollout, restart the service normally. Compare its
saved image, resolved digest, `/api/version` and `/healthz` again, and have
an authorized user confirm existing household content and drafts. Record
only pass/fail and version identity in shared evidence. Keep household
screenshots, cookies, credentials and raw provider responses private.

Old browser sessions cannot write with an outdated build identity. Tell
users to copy unsent form text before reloading. An interrupted save has an
unknown result until its receipt is checked; reloading does not establish
that an unsent form or an interrupted save was stored.

## Diagnose failure before retry

Release build, test or security failures do not call Render. After a
deployment begins, the application and database can change independently.
Never assume that a failed rollout left both at their previous state.

1. Read the deployment report and Render's current deployment status.
   If a migration is still running, let it finish. A workflow timeout does
   not cancel Render. Do not trigger a competing dashboard deployment.
2. Compare the saved image reference, the live deployment's resolved
   digest and the application's `/api/version`. If the application cannot
   respond, its version and database readiness are unknown. Check the
   sanitized startup events in Render's private logs and inspect migration
   state on the existing disk in an attended maintenance window. Do not
   publish the database, environment or full logs.
3. Resolve the failure before restarting or deploying. Database migrations
   are transactional, but a healthy start followed by a failed smoke check
   can leave a newer schema. Do not remove migration history, initialize a
   new empty database, or replace the disk to clear the failure.
4. An older image may run only if it supports the current schema and
   migration checksums. Test this compatibility on synthetic data and read
   the release guidance. Deploying older code does not restore the database.
   If compatibility is unknown, keep access closed and repair forward.
5. For an attended recovery, update the saved image reference and request
   the same digest through Render. Verify the resulting live deployment,
   database readiness, page, anonymous bootstrap and real household access.
   A failed or canceled latest deployment, unhealthy app, or mismatch
   between saved and running image blocks automatic retry until reconciled.
6. Rerun the failed release job after diagnosis. A retry verifies an already
   live matching image without another restart. An older queued candidate
   is skipped if its commit is no longer the head of `main`.

Only the release workflow may perform unattended changes to this service.
Do not use a deploy hook, another workflow, Blueprint auto-sync or dashboard
deployments concurrently. The workflow serializes changes and does not
cancel an active migration. Restrict other writers accordingly.

See Render's [update service API](https://api-docs.render.com/reference/update-service)
and [deploy API](https://api-docs.render.com/reference/create-deploy).
An image override on a deploy hook alone does not update the saved service
reference. That can select an older image on a later deployment.

## Disk loss and future recovery

Persistent disk protects ordinary restarts and deployments. It does not
protect against loss of the disk. No extra automatic backup is configured.
The planned portable recovery path is complete versioned household export
and reimport; it is not implemented yet. Until it exists, do not present a
code rollback as data recovery. Data since the last usable export can be
lost in a major failure, and extended downtime can be necessary. Server
secrets and fresh login associations remain separate from household export.
