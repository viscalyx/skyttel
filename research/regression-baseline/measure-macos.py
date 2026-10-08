"""Measure one native macOS npm command without changing test configuration.

Usage: python3 measure-macos.py /tmp/skyttel-unit npm run test:unit:coverage
Requires only Python 3 and built-in macOS tools. Run from the repository root.
"""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

if sys.platform != 'darwin':
    sys.exit('Run this sampler in native macOS; use measure.py inside Linux.')
out = Path(sys.argv[1])
command = sys.argv[2:]
out.parent.mkdir(parents=True, exist_ok=True)
metadata = {
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'command': command,
    'system': subprocess.check_output(['sw_vers'], text=True),
    'hardware': subprocess.check_output(['sysctl', 'hw.memsize', 'hw.ncpu'], text=True),
    'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'dirty_tree': subprocess.check_output(['git', 'status', '--porcelain=v1'], text=True),
    'node': subprocess.check_output(['node', '--version'], text=True).strip(),
    'npm': subprocess.check_output(['npm', '--version'], text=True).strip(),
    'method': '1s descendant RSS/%CPU samples; RSS double-counts shared pages; ps %CPU is a smoothed per-process value, not interval tree CPU; short processes and between-sample peaks may be missed; time -l reports child usage and a single-process maximum RSS, not tree peak; vm_stat and swap are system-wide and include other work',
}
out.with_suffix('.environment.json').write_text(json.dumps(metadata, indent=2) + '\n')
started = time.monotonic()
peak_rss = 0
with out.with_suffix('.log').open('w') as log, out.with_suffix('.time.txt').open('w') as timing, out.with_suffix('.jsonl').open('w') as samples:
    child = subprocess.Popen(['/usr/bin/time', '-l', *command], stdout=log, stderr=timing)
    while True:
        rows = subprocess.check_output(['ps', '-axo', 'pid=,ppid=,rss=,%cpu=,comm='], text=True)
        table = {}
        for line in rows.splitlines():
            fields = line.split(None, 4)
            if len(fields) < 4:
                continue
            table[int(fields[0])] = {'ppid': int(fields[1]), 'rss_bytes': int(fields[2]) * 1024, 'ps_cpu_percent': float(fields[3]), 'comm': fields[4] if len(fields) > 4 else ''}
        ids = {child.pid}
        while True:
            added = {pid for pid, row in table.items() if row['ppid'] in ids}
            if added <= ids:
                break
            ids |= added
        tree = {pid: table[pid] for pid in ids if pid in table}
        rss = sum(row['rss_bytes'] for row in tree.values())
        peak_rss = max(peak_rss, rss)
        snapshot = {'elapsed_s': time.monotonic() - started, 'tree_rss_bytes': rss, 'tree': tree,
                    'vm_stat': subprocess.check_output(['vm_stat'], text=True),
                    'swap': subprocess.check_output(['sysctl', 'vm.swapusage'], text=True)}
        samples.write(json.dumps(snapshot) + '\n')
        samples.flush()
        status = child.poll()
        if status is not None:
            break
        time.sleep(1)
summary = {'exit_code': status, 'elapsed_s': time.monotonic() - started, 'sampled_peak_tree_rss_bytes': peak_rss}
out.with_suffix('.summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
sys.exit(status)
