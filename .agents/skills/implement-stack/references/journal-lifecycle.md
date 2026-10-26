# Journal lifecycle

## Location decision

Use the main checkout's ignored `tmp/implement-stack/` directory. It gives
linked worktrees one discoverable state root outside Git metadata and keeps
independent clones separate. Both development container profiles persist
the checkout through a host bind mount, including this directory.

The Git common directory also shares state across worktrees, but mixes
workflow artifacts with Git internals. An external per-repository directory
needs separate identity, discovery and container persistence arrangements.
The existing ignored workspace directory avoids those additional conventions.
Its durability depends on retaining the checkout and its ignored files;
moving state here does not bound disk growth or provide a backup.

## Discovery

1. Read `git worktree list --porcelain -z`. Parse NUL-delimited records;
   the first record identifies the main checkout, even from a linked worktree.
   See [Git's worktree format](https://git-scm.com/docs/git-worktree#_porcelain_format).
2. Resolve that checkout's physical absolute path. Require an accessible,
   non-bare working tree whose top level matches that path and whose
   `git rev-parse --path-format=absolute --git-common-dir` matches the caller's
   canonical common directory. A bare first record, missing checkout or
   mismatch blocks the prerequisite; report the required checkout repair.
   Use neither the caller's top level nor the common directory's parent as a
   fallback.
3. Set `<state-root>` to `<main-worktree>/tmp/implement-stack/`. Confirm it is
   ignored and stays within that checkout after resolving symlinks. Report
   an inaccessible or shared external destination as a blocked prerequisite.
4. Inspect `<git-common-dir>/implement-stack/` for legacy journals and the
   legacy `writer.lock` before creating state. If present, follow
   [legacy handoff](#legacy-handoff). An absent legacy directory needs no
   reconstruction. If an expected journal is missing, report the recovery
   gap and obtain direction before treating the Spec as a new run.
5. Use the resolved root for [ownership](state-and-recovery.md#journal-and-ownership).
   Resume from existing journal contents; preserve earlier evidence and append
   new observations instead of initializing another journal for the same Spec.

## Legacy handoff

- Preserve legacy state until the user explicitly requests relocation.
  Report its location and block a second journal or writer while it remains.
- Before relocation, obtain handoff from every owner in both locations:
  stop their mutations, confirm each owner's release of its claim, and require
  resumed agents to use this discovery procedure. Age or a missing process
  alone is not proof of relinquished ownership.
- Inventory journals, logs and catalog copies, including incomplete runs.
  With all owners stopped and user authorization, move the legacy state root
  to the resolved destination only when that destination is absent. If both
  locations contain state, preserve both and resolve the conflict with the
  user before moving anything; never overwrite or silently combine journals.
- Verify inventory and file contents at the destination, record the old and
  new locations in the journal, and update the Spec's location before resuming
  through the normal ownership check. Keep Git recovery refs, worktrees and
  third-party recovery journals in their own locations.

## Retention and manual cleanup

- Cleanup belongs to the user. Retain journals, logs, catalog copies,
  worktrees and recovery refs after publication, merge, abandonment, failure
  and interruption until the user removes them. No repository workflow owns
  later cleanup; no expiry, automatic deletion or cleanup command applies.
- Release only the current session's writer claim when handing off ownership.
  Releasing a claim leaves recovery artifacts intact; an interrupted owner's
  claim still requires the ownership check before takeover.
- At publication, report the resolved journal location and user-controlled
  cleanup. Explain that manual removal or workspace cleaning can erase recovery
  evidence. Keep evidence needed by active or incomplete runs; the user must
  establish that follow-up and recovery no longer need it before removal.
- Deleting a journal does not delete Git worktrees or recovery refs. Those
  artifacts remain separately under the user's control.
