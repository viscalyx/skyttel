# Reproduce resource evidence

Use the existing repository configuration. Run one command at a time from
the repository root. These samplers invoke npm scripts, so the shared test
lock still applies. Do not change workers or start a second heavy suite.
No billable provider suite is part of this procedure.

## Native macOS

Copy `measure-macos.py` to a temporary directory. Record whether this is a
native terminal or a terminal inside the development container. The script
requires Python 3 and built-in macOS tools; it installs nothing.

```sh
python3 /tmp/measure-macos.py /tmp/skyttel-build npm run build
python3 /tmp/measure-macos.py /tmp/skyttel-unit npm run test:unit:coverage
python3 /tmp/measure-macos.py /tmp/skyttel-integration npm run test:integration
```

Keep the environment, summary, samples, timing and log files. Record the
machine's chip, other active workloads, power state, thermal conditions and
whether dependencies/browser binaries are already installed. Also retain
the exact test configuration, lockfile and uncommitted diff when present.
One run is an observation. Repeat an otherwise comparable run if a policy
decision needs evidence about variation.

The sampled tree RSS can double-count shared pages. It is neither private
memory nor a hard upper bound: brief processes and peaks can be missed.
The `%CPU` field from `ps` is a smoothed process value, not a one-second
tree CPU rate. Use it with the child CPU times in the timing file and the
system-wide memory/swap observations. The maximum RSS from `time -l` is a
single-process maximum, not the process-tree peak.

Record usable interaction with the rest of the machine during the run.
Treat responsiveness and sustained swap/pressure as separate observations;
elapsed minutes alone do not establish acceptable resource use.

## Linux container or GitHub runner

Use `measure.py` with the same commands and the CI font profile where
supported. The sampler needs Python 3 and readable Linux `/proc` and cgroup
files; it installs nothing.

```sh
python3 /tmp/measure.py /tmp/skyttel-build npm run build
python3 /tmp/measure.py /tmp/skyttel-unit npm run test:unit:ci -- --coverage
python3 /tmp/measure.py /tmp/skyttel-integration npm run test:integration:ci
```

Record `uname -a`, `/proc/meminfo`, CPU affinity, `cpu.max`, `memory.max`,
Node/npm/browser versions, git commit, dirty tree and configuration hashes.
On a runner, retain its image/version and actual available CPUs/RAM/disk.
Do not substitute the runner's advertised limits for observed resources.

The sampler records tree RSS, readable proportional set size (PSS), sampled
CPU demand, child CPU usage and cgroup memory/CPU pressure and events.
Sampling misses brief processes and peaks. Summed RSS double-counts shared
pages; PSS can be incomplete if a process exits or access is denied. Cgroup
counters can include unrelated work, especially when the cgroup spans a VM.
They must not be presented as this test command's own resource consumption.

Neither script collects peak fixture cost in isolation or measures Docker
daemon/container resources outside the command's descendant process tree.
Container checks need a separate Docker/VM measurement if that becomes a
policy prerequisite. Do not combine their memory with browser-tree memory
by adding maxima from different times.
