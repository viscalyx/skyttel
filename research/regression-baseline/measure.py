"""Sample a Linux process tree while running an unchanged repository npm script."""
import datetime
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time

out = Path(sys.argv[1])
command = sys.argv[2:]
out.parent.mkdir(parents=True, exist_ok=True)
hz = os.sysconf('SC_CLK_TCK')
page = os.sysconf('SC_PAGE_SIZE')
started = time.monotonic()
env = os.environ.copy()
env['CI'] = '1'

def counters():
    result = {}
    for name in ['memory.current', 'memory.events', 'cpu.stat', 'memory.pressure', 'cpu.pressure']:
        try:
            result[name] = Path('/sys/fs/cgroup', name).read_text()
        except OSError:
            pass
    return result

before = counters()
seen = {}
peaks = {'rss_bytes': 0, 'pss_bytes': 0, 'processes': 0, 'cpu_cores': 0}
previous_total = 0
previous_time = started
with out.with_suffix('.log').open('w') as log, out.with_suffix('.jsonl').open('w') as samples:
    process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=env)
    while True:
        table = {}
        for path in Path('/proc').glob('[0-9]*/stat'):
            try:
                raw = path.read_text()
                fields = raw[raw.rindex(')') + 2:].split()
                pid = int(path.parent.name)
                table[pid] = {'ppid': int(fields[1]), 'ticks': int(fields[11]) + int(fields[12]),
                              'start': fields[19], 'rss': int(fields[21]) * page}
            except (OSError, ValueError, IndexError):
                pass
        ids = {process.pid}
        while True:
            added = {pid for pid, info in table.items() if info['ppid'] in ids}
            if added <= ids:
                break
            ids |= added
        rss = 0
        pss = 0
        pss_read = 0
        for pid in ids & table.keys():
            info = table[pid]
            seen[(pid, info['start'])] = info['ticks']
            rss += info['rss']
            try:
                for line in Path('/proc', str(pid), 'smaps_rollup').read_text().splitlines():
                    if line.startswith('Pss:'):
                        pss += int(line.split()[1]) * 1024
                        pss_read += 1
            except OSError:
                pass
        now = time.monotonic()
        total_cpu = sum(seen.values()) / hz
        cores = (total_cpu - previous_total) / (now - previous_time)
        sample = {'elapsed_s': now - started, 'rss_bytes': rss, 'pss_bytes': pss,
                  'pss_read': pss_read, 'processes': len(ids & table.keys()),
                  'sampled_cpu_seconds': total_cpu, 'cpu_cores': cores,
                  'context': counters()}
        samples.write(json.dumps(sample) + '\n')
        samples.flush()
        for key in peaks:
            peaks[key] = max(peaks[key], sample[key])
        previous_total, previous_time = total_cpu, now
        status = process.poll()
        if status is not None:
            break
        time.sleep(1)
usage = resource.getrusage(resource.RUSAGE_CHILDREN)
result = {'command': command, 'CI': '1', 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'exit_code': status, 'elapsed_s': time.monotonic() - started, 'peaks': peaks,
          'sampled_cpu_seconds': previous_total, 'wait4_user_s': usage.ru_utime,
          'wait4_system_s': usage.ru_stime, 'before': before, 'after': counters(),
          'method': '1s /proc descendant samples; summed RSS double-counts shared pages; PSS read when permitted; short-lived processes may escape samples; cgroup includes unrelated VM work; wait4 child CPU includes reaped descendants on Linux'}
out.with_suffix('.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
sys.exit(status)
