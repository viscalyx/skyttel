# Large-map observations

The [measurement plan](large-map-performance.md) defines the dataset,
network and readiness boundaries. All values below are individual
observations in milliseconds, not percentile estimates.

## Baseline

Implementation base: `71b831f3cb14325360df38d0d2f655e10b46445f`.
Measured 2026-09-24 with headless Chromium 153.0.8010.12, Node 24.21.0,
Linux 7.0.12-linuxkit, ARM64, 1,440 × 1,000 viewport. The devcontainer
reported 10 available processors, 25,159,561,216 bytes of host memory and
no additional cgroup CPU or memory cap. CPU model was unavailable. Server
and browser shared this environment; there was one map client and no
competing map writes. Host load averages after the pair were 5.35/3.93/4.11.

| Run | Cache | Open | Search | Save | Labels | Overlaps |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Cold | 4542 | 618 | 838 | 2000 | 486925 |
| 1 | Warm | 4372 | 686 | 853 | 2000 | 486925 |

Time limits passed, but the overview failed readability. The fix limits
ordinary labels to available space, retains explicit all-label mode, and
pages long lists while keeping every entry reachable. Shared save and
authorization semantics remain unchanged.

## Final observations

Final measurements are recorded after the implementation and checks finish.
