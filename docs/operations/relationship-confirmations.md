# Relationship-form confirmation storage

This guide helps installation operators plan storage and investigate
blocked relationship-form submissions. Confirmation evidence is separate
from private drafts, saved map data, receipts and change history.

## Limits and admission

The fixed limits are 1,000 retained confirmations and 8 MiB per member in a
household, and 10,000 confirmations and 64 MiB across the installation.
Both count and byte limits apply. These defaults allow regular editing
and occasional large forms while reserving most installation storage for
household information. They are not runtime settings. New households or
identities cannot bypass the installation limit.

The byte budget includes UTF-8 identifiers, complete outcomes, request
fingerprints and a 512-byte allowance per record for fixed metadata and
index entries. The installation budget also reserves 4 KiB for the single
signing record and fixed index metadata. Count limits also bound index
growth. This is an evidence
accounting budget, not a SQLite file-size or whole-installation disk quota.
Unused request fields contribute only to a fixed-size fingerprint;
legitimate properties remain complete in staged outcomes. Rejected
admissions create no persistent rejection record. Admission and draft
mutation share one serialized database transaction.

When any applicable limit is reached, the form explains the temporary
limitation and retains editable input. Accepted confirmations are never
evicted to admit a new attempt. Checks and exact retries bypass admission
limits. An ordinary save does not reclaim these confirmations.

## Recovery and cleanup

Each accepted result has an immutable deadline seven consecutive 24-hour
periods after server acceptance. At the deadline, recovery is unavailable,
even before cleanup runs. Checks, retries, saves and restarts do not renew
it. Startup and a one-minute background sweep reclaim expired evidence in
batches of at most 100 rows, yielding between batches. Database failures
produce the event `relationship_confirmation_cleanup_failed` and retry on
the next sweep. Investigate persistent failures and storage headroom using
the normal installation monitoring and recovery procedures.

Cleanup frees pages for reuse; it does not shrink the SQLite file. The
limits do not replace disk monitoring or establish production outage
impact. No claim about deployed ingress limits or disk-full recovery is
implied by the application limits.

New attempts use signed identifiers bound to the member, household and
content generation. An unused identifier is admissible for one hour after
server issuance; acceptance starts the separate seven-day recovery period.
After that hour, missing evidence is conservatively unavailable. Delayed
requests cannot become fresh writes after cleanup. No permanent attempt
tombstones or per-issuance rows accumulate. The signing key is one durable
installation record; no additional secret configuration is required.

An unavailable confirmation returns a distinct conflict error, never the
empty success result used for established absence. Older clients therefore
cannot interpret expiry as proof that a request never arrived. Reload old
clients before submitting new forms. Access revocation, content replacement
and erasure still restrict recovery independently of its deadline.

## Upgrade and rollback

Previously untimestamped confirmations receive one persisted seven-day
grace deadline during upgrade. Startup compacts their request data into
fingerprints in bounded batches without changing outcomes or deadlines.
Existing evidence above a limit is temporarily grandfathered; new
admissions require capacity under every limit. No unexpired evidence is
discarded to restore admission. Check recovery during grace and admission
after expired evidence is reclaimed.

Keep a backup before upgrade. Expired evidence cannot be recovered by an
application rollback. Use a pre-upgrade backup with its compatible
application and follow the [restore procedure](database-restore.md).
See the [upgrade notes](operator-upgrade-notes.md) for rollout requirements.
