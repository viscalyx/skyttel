"""THROWAWAY: real local Git/gh-stack comparison; no GitHub mutations."""
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

binary = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=True)
root = Path(tempfile.mkdtemp(prefix="gh-stack-prototype-"))
env = dict(os.environ, GIT_EDITOR="true", GH_STACK_NO_UPDATE_NOTIFIER="1",
           GIT_AUTHOR_NAME="Prototype", GIT_AUTHOR_EMAIL="prototype@example.invalid",
           GIT_COMMITTER_NAME="Prototype", GIT_COMMITTER_EMAIL="prototype@example.invalid")
log = (out / "commands.txt").open("w")
events = []


def run(cwd, *args, expected=0):
    result = subprocess.run([str(a) for a in args], cwd=cwd, env=env,
                            text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    log.write(f"\n$ cd {cwd} && {shlex.join([str(a) for a in args])}\n")
    log.write(result.stdout + f"[exit {result.returncode}]\n")
    log.flush()
    if expected is not None and result.returncode != expected:
        raise RuntimeError(f"{args}: expected {expected}, got {result.returncode}\n{result.stdout}")
    return result.stdout.strip()


def git(cwd, *args, **kwargs):
    return run(cwd, "git", *args, **kwargs)


def write(path, value):
    text = value if isinstance(value, str) else json.dumps(value, separators=(",", ":")) + "\n"
    path.write_text(text)
    log.write(f"\nWRITE {path}\n{text}\n")
    log.flush()


def commit(path, message):
    git(path, "add", ".")
    git(path, "commit", "-m", message)
    return git(path, "rev-parse", "HEAD")


def event(mode, name, **details):
    events.append(dict(mode=mode, event=name, **details))
    print(mode, name, flush=True)


def compare(mode):
    repo = root / mode
    git(root, "init", "-b", "main", repo)
    # Equal conflict-memory configuration; gh-stack init enables this itself.
    git(repo, "config", "rerere.enabled", "true")
    write(repo / "values.json", {"a": 0, "b": 0})
    write(repo / "package.json", {"private": True, "scripts": {"verify": "node verify.cjs"}})
    write(repo / "verify.cjs", """const fs = require('node:fs');
const values = JSON.parse(fs.readFileSync('values.json'));
for (const argument of process.argv.slice(2)) {
  const [key, expected] = argument.split('=');
  const actual = key in values ? values[key] : JSON.parse(fs.readFileSync(key + '.json'));
  if (actual !== Number(expected)) {
    console.error(`${key}: expected ${expected}, observed ${actual}`);
    process.exit(1);
  }
}
console.log('Verified: ' + process.argv.slice(2).join(', '));
""")
    start = commit(repo, "seed fixture")
    paths, delivered, accepted = {}, {}, {}
    tip = repo
    if mode == "baseline":
        git(repo, "switch", "-c", "integration")

    def spawn(name, base):
        p = root / f"{mode}-{name}"
        git(repo, "worktree", "add", "-b", name, p, base)
        paths[name] = p
        event(mode, "dispatch", branch=name, base=base)
        return p

    def handoff(name):
        p = paths[name]
        if git(p, "status", "--porcelain"):
            raise RuntimeError("handoff is dirty")
        delivered[name] = git(p, "rev-parse", "HEAD")
        git(repo, "update-ref", "refs/prototype/original/" + name, delivered[name])
        event(mode, "handoff", branch=name, sha=delivered[name], owner="orchestrator")

    def accept(name, checks):
        run(tip, "npm", "run", "verify", "--", *checks)
        accepted[name] = git(tip, "rev-parse", "HEAD")
        event(mode, "verified-and-closed-in-model", branch=name, sha=accepted[name],
              checks=checks, main=git(repo, "rev-parse", "main"))
        return accepted[name]

    def integrate(name, conflict=False):
        nonlocal tip
        handoff(name)
        if mode == "baseline":
            git(repo, "cherry-pick", delivered[name], expected=1 if conflict else 0)
            tip = repo
        elif name == "A":
            run(paths[name], binary, "init", "--base", "main", name)
            tip = paths[name]
        else:
            run(tip, binary, "add", name)
            # Adoption does not itself combine sibling branches.
            event(mode, "adopted-not-yet-integrated", branch=name,
                  head=git(paths[name], "rev-parse", "HEAD"))
            run(tip, binary, "rebase", "--no-trunk", expected=3 if conflict else 0)
            if not conflict:
                tip = paths[name]

    a = spawn("A", start)
    b = spawn("B", start)
    write(a / "values.json", {"a": 1, "b": 0})
    commit(a, "A: set a to 1")
    write(b / "values.json", {"a": 0, "b": 2})  # B stays active and dirty.
    b_before = git(b, "rev-parse", "HEAD"), (b / "values.json").read_text()
    integrate("A")
    a_verified = accept("A", ["a=1", "b=0"])
    event(mode, "active-B-preserved", unchanged=b_before ==
          (git(b, "rev-parse", "HEAD"), (b / "values.json").read_text()))
    d = spawn("D", a_verified)
    write(d / "d.json", "999\n")  # A later specification review finds this defect.
    d_before = git(d, "rev-parse", "HEAD"), (d / "d.json").read_text()
    commit(b, "B: set b to 2")
    integrate("B", conflict=True)
    conflict_owner = repo if mode == "baseline" else b
    common = Path(git(repo, "rev-parse", "--path-format=absolute", "--git-common-dir"))
    state = dict(operation="integrate B", last_verified=a_verified, delivered=delivered.copy(),
                 branches={n: git(repo, "rev-parse", n) for n in paths},
                 owners={"A": "orchestrator", "B": "orchestrator", "D": "agent"},
                 conflict_owner=str(conflict_owner), main=start)
    write(out / f"{mode}-resume.json", state)
    if mode == "candidate":
        write(out / "gh-stack-conflict-journal.json", (common / "gh-stack-rebase-state").read_text())
    # New processes inspect persisted state before continuing; not a killed process.
    state_again = json.loads((out / f"{mode}-resume.json").read_text())
    git(conflict_owner, "status", "--porcelain")
    event(mode, "resume-from-conflict", last_verified=state_again["last_verified"])
    # Deliberately incomplete resolution demonstrates that a successful Git command
    # is not evidence of a correct integrated result.
    write(conflict_owner / "values.json", {"a": 0, "b": 2})
    git(conflict_owner, "add", "values.json")
    if mode == "baseline":
        git(repo, "cherry-pick", "--continue")
    else:
        run(a, binary, "rebase", "--continue")  # Recovery from another worktree.
        tip = b
    run(tip, "npm", "run", "verify", "--", "a=1", "b=2", expected=1)
    event(mode, "failed-integrated-verification", still_verified=a_verified,
          new_dispatch_allowed=False)
    write(tip / "values.json", {"a": 1, "b": 2})
    commit(tip, "Correct incomplete conflict resolution before accepting B")
    ab_verified = accept("B", ["a=1", "b=2"])
    event(mode, "active-D-preserved", unchanged=d_before ==
          (git(d, "rev-parse", "HEAD"), (d / "d.json").read_text()))
    c = spawn("C", ab_verified)
    write(c / "c.json", "3\n")
    c_before = git(c, "rev-parse", "HEAD"), (c / "c.json").read_text()
    commit(d, "D: produce derived value")
    integrate("D")
    # This deliberately incomplete check models a missed specification requirement.
    abd_verified = accept("D", ["a=1", "b=2", "d=999"])
    event(mode, "review-finding", requirement="D must equal a * 10", actual=999)
    r = spawn("R", abd_verified)
    write(r / "d.json", "10\n")
    commit(r, "R: repair D according to the specification")
    integrate("R")
    accept("R", ["a=1", "b=2", "d=10"])
    event(mode, "active-C-preserved", unchanged=c_before ==
          (git(c, "rev-parse", "HEAD"), (c / "c.json").read_text()))
    commit(c, "C: combine A and B")
    integrate("C")
    final = accept("C", ["a=1", "b=2", "d=10", "c=3"])
    tree = git(tip, "rev-parse", "HEAD^{tree}")
    git(repo, "log", "--all", "--oneline", "--graph", "--decorate")
    git(repo, "diff", start, final, "--stat")
    if mode == "candidate":
        run(tip, binary, "view", "--json")
        for metadata in (common / "gh-stack").glob("*.json"):
            write(out / ("catalog-" + metadata.name), metadata.read_text())
    event(mode, "handover", fixed_start=start, reviewed_target=git(repo, "rev-parse", "main"),
          heads={n: git(repo, "rev-parse", n) for n in paths}, tip=final, tree=tree,
          closed_in_model=["A", "B", "D", "R", "C"], merged=False)
    return dict(repo=str(repo), tip=str(tip), start=start, final=final, tree=tree)


results = {mode: compare(mode) for mode in ["baseline", "candidate"]}
event("comparison", "identical-final-trees", equal=results["baseline"]["tree"] == results["candidate"]["tree"])
cand = results["candidate"]
repo = Path(cand["repo"])
branches = ["A", "B", "D", "R", "C"]
snapshot = {n: git(repo, "rev-parse", n) for n in ["main", *branches]}
write(out / "reviewed-handover.json", dict(refs=snapshot, tree=cand["tree"],
      fixed_start=cand["start"], verification="a=1 b=2 d=10 c=3",
      pr_mapping="not published; A<-main, B<-A, D<-B, R<-D, C<-R"))


def preflight():
    actual = {n: git(repo, "rev-parse", n) for n in snapshot}
    changed = [n for n in snapshot if snapshot[n] != actual[n]]
    event("handover", "local-ref-preflight", accepted=not changed, changed=changed)
    return not changed


preflight()
# Real ref mutation after a passing read check: demonstrates the time gap.
new_target = git(repo, "commit-tree", cand["start"] + "^{tree}", "-p", snapshot["main"],
                 "-m", "Unrelated target advance after review")
git(repo, "update-ref", "refs/heads/main", new_target, snapshot["main"])
preflight()
new_r = git(repo, "commit-tree", "R^{tree}", "-p", snapshot["R"],
            "-m", "Lower-layer head advance after review")
git(repo, "update-ref", "refs/heads/R", new_r, snapshot["R"])
preflight()
event("handover", "top-only-check-misses-lower-head", top_unchanged=git(repo, "rev-parse", "C") == snapshot["C"],
      lower_changed=git(repo, "rev-parse", "R") != snapshot["R"])
# A separate local illustration of squash identities; not an invocation of GitHub.
parent = cand["start"]
for n in branches:
    parent = git(repo, "commit-tree", snapshot[n] + "^{tree}", "-p", parent,
                 "-m", "Illustrated squash for " + n)
git(repo, "update-ref", "refs/prototype/illustrated-squash", parent)
original_reachable = subprocess.run(["git", "merge-base", "--is-ancestor", cand["final"], parent],
                                    cwd=repo).returncode == 0
event("handover", "local-squash-illustration", original_reachable=original_reachable,
      same_tree=git(repo, "rev-parse", parent + "^{tree}") == cand["tree"],
      github_merge_tested=False)
write(out / "result.json", dict(binary_sha256=hashlib.sha256(binary.read_bytes()).hexdigest(),
                                results=results, events=events))
log.close()
transcript = out / "commands.txt"
transcript.write_text('\n'.join(line.rstrip() for line in transcript.read_text().splitlines()).rstrip() + '\n')
print("Evidence:", out)
print("Scratch repositories:", root)
