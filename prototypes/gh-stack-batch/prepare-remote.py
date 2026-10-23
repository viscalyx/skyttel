"""Prepare a separate PR fixture. This does not verify the local integration trial."""
import json
from pathlib import Path
import subprocess

root = Path('/tmp/wayfinder-528-remote')
root.mkdir(exist_ok=False)

def cmd(*args):
    subprocess.run(args, cwd=root, check=True)

def data(name, value):
    (root / name).write_text(json.dumps(value, separators=(',', ':')) + '\n')

def commit(message):
    cmd('git', 'add', '.')
    cmd('git', 'commit', '-m', message)

cmd('git', 'init', '-b', 'wf528-main')
cmd('git', 'config', 'user.name', 'Prototype')
cmd('git', 'config', 'user.email', 'prototype@example.invalid')
data('values.json', {'a': 0, 'b': 0})
data('package.json', {'private': True, 'scripts': {'verify': 'node verify.cjs'}})
(root / 'verify.cjs').write_text('''const fs = require('node:fs');
const v = JSON.parse(fs.readFileSync('values.json'));
const c = JSON.parse(fs.readFileSync('c.json'));
const d = JSON.parse(fs.readFileSync('d.json'));
if (v.a !== 1 || v.b !== 2 || c !== v.a + v.b || d !== v.a * 10) {
  console.error({v, c, d}); process.exit(1);
}
console.log('Final fixture: a=1, b=2, c=3, d=10');
''')
commit('Seed disposable PR fixture')
cmd('git', 'switch', '-c', 'wf528-A')
data('values.json', {'a': 1, 'b': 0})
commit('A: set a to 1')
cmd('git', 'switch', '-c', 'wf528-B')
data('values.json', {'a': 1, 'b': 2})
commit('B: set b to 2')
cmd('git', 'switch', '-c', 'wf528-D')
data('d.json', 999)
commit('D: initial derived value, before review repair')
cmd('git', 'switch', '-c', 'wf528-R')
data('d.json', 10)
commit('R: correct D after specification review')
cmd('git', 'switch', '-c', 'wf528-C')
data('c.json', 3)
commit('C: combine A and B')
cmd('git', 'remote', 'add', 'origin', 'https://github.com/johlju/DebugApps.git')
cmd('git', 'push', 'origin', 'wf528-main', 'wf528-A', 'wf528-B', 'wf528-D', 'wf528-R', 'wf528-C')
