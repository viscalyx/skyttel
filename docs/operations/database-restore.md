# Restore an installation database or disk

Use this procedure for a complete SQLite database or disk copy. Keep the
service closed until every step passes. A household ZIP import uses the
[household recovery procedure](recovery.md) and does not restore login
credentials. [Permanent erasure](permanent-erasure.md) has separate recovery
rules. This procedure does not add a backup service.

## Establish trusted inputs before changing the disk

1. Stop all application processes and prevent the host from starting another
   instance. Block public ingress. Stop old assistant and browser delivery
   connections. Keep the source and restored installation from running
   together.
2. Identify the exact consistent SQLite copy and its journal handling. Do
   not copy an open database file. Record the original copy time, all
   derivatives, the source authority generation and the intended release.
   Copying a copy does not change its original time or retention deadline.
3. Review whether the copy can reintroduce permanently erased information.
   Require trusted provenance and complete later erasure information, or
   proof that no later erasure is relevant. If this evidence is absent,
   keep the installation closed. A record inside the old copy cannot prove
   which erasures occur after that copy.
4. Maintain the authority generation and restore declaration in the host's
   private configuration, outside every restored disk and database copy.
   Restrict changes to authorized operators. Do not restore this
   configuration from the same copy. A file on the restored volume is not
   an independent barrier.

The application cannot detect an undeclared filesystem rollback when both
the database and the external generation remain unchanged. Rotate the
external generation **before every restore**, including another restore of
a copy with the same generation. This operator step is mandatory.

## Restore while access is blocked

1. Generate a new UUID for `SKYTTEL_AUTHORITY_GENERATION`. Keep it separate
   from the restored volume. Do not reuse an earlier generation.
2. Set `SKYTTEL_RESTORE_FROM_GENERATION` to the source copy's generation.
   Set `SKYTTEL_RESTORE_CONFIRMED_AT` to the fixed UTC time of this controlled
   restore, in ISO format. Set `SKYTTEL_RESTORE_ERASURE_REVIEWED=true` only
   after the trusted review above. Retain these values unchanged across
   restart; they are the independent restore declaration.
   Explicitly designate a trusted recovery administrator for this restore.
   Set `SKYTTEL_RECOVERY_ADMIN_PROVIDER` to `google` or `microsoft`, and
   `SKYTTEL_RECOVERY_ADMIN_SUBJECT` to that provider's stable account
   identifier. Never use email or name. Keep these settings outside the
   restored volume, with the generation. Retain the designation unchanged
   through restarts, including after review completion. Missing or invalid
   settings stop startup. The first administrator and roles in the copy do
   not grant recovery authority.
   For a copy from before authority generations exist, use the explicit
   value `legacy` only after verifying that provenance. This path requires
   an absent authority record and the same trusted erasure clearance. It
   still restores data forward into the current release. It cannot
   replace a known UUID generation or stand in for a normal legacy upgrade.
3. Restore the consistent database or disk while all old processes remain
   stopped. Do not restore old application code. Use the current compatible
   release and the existing account identity configuration.
4. Start one application instance behind blocked ingress. A missing,
   malformed or inconsistent authority declaration must stop startup.
   Before readiness, Skyttel invalidates old browser sessions, pending
   sign-in and linking attempts, OAuth codes and tokens, signing keys and
   assistant connections. Provider identity links and household content
   remain. All pending invitations become invalid. Ordinary household access
   stays blocked until explicit review, including fresh browser sign-in and
   assistant access. Already accepted model work does not resume.
5. Check readiness and version privately. Test old cookies, late callbacks,
   unused authorization codes, access tokens, refresh tokens and JWTs,
   including a client with cached signing keys. They must not grant access.
   Restart and repeat. In an isolated exercise, restore another test copy
   with another new generation; old access and previous review must not
   authorize access.
6. Allow the designated person to sign in through a restricted maintenance
   route using the configured provider identity. A different linked login
   does not prove that identity. The person may be absent from the copy.
   Follow the [recovery review](../user-guide/installation-recovery.md).
   Compare every membership and role against independent current records,
   including revocations after the copy. Keep access blocked if current
   permissions cannot be established. Record who checks the list and the
   evidence used in private operational records.
7. Revoke obsolete memberships and correct roles in the review. Ensure each
   household has an administrator; the recovery administrator can explicitly
   appoint themselves. Confirm the entire remaining list in one action,
   even if no change is needed. This atomically opens access and ends the
   temporary recovery authority. The designation itself grants no lasting
   membership. Old invitations remain invalid; issue new ones if needed.
8. Verify fresh sign-in for retained members and denied access for removed
   members. **Kom ihåg mig** must begin unchecked. Verify the restored
   household, drafts and registered save results. Restart and verify the
   same outcome. Use a trustworthy retained action result when available.
   A missing result or network failure alone does not establish a restore.

Only the confirmed restore permits a new explicit storage choice when its
older result is unavailable. It does not confirm that older choice or
repeat it. Skyttel displays:

> Skyttel har återställts från en säkerhetskopia. Gamla inloggningar kan
> inte längre användas. Logga in igen för att fortsätta.

Open ingress only after the authorization and content checks pass. Keep
the independent generation and fixed declaration through later restarts.
Ordinary restarts do not extend login, task or result deadlines.

## Record actual copy and deletion evidence

Keep the evidence private. Identify each database, disk snapshot,
operator download and derivative, its original copy time, access owners,
retention controls and deletion outcome. Applicable copies must be deleted
within 30 days of their original creation. A new copy does not restart
that period. Restrict access to authorized operations staff.

Supplier documentation, a configured retention period or a snapshot that
disappears from a list does not prove physical deletion. Obtain evidence
for the actual installation and storage service. Record limitations,
including underlying storage or supplier copies that operators cannot
verify directly.

The local automated exercise uses disposable SQLite copies and synthetic
identity providers. No actual hosted copy inventory, production barrier
deployment, restricted provider access or physical deletion evidence is
available for the current delivery. These mandatory checks remain open;
the release evidence in [security checks](security-checks.md) must not
describe them as verified.
