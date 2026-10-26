// Simulate an external writer at the CLI's filesystem boundary.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const open = fs.openSync;
let changed = false;
fs.openSync = (path, ...args) => {
  const descriptor = open(path, ...args);
  if (!changed && path === process.env.FS_RACE_INPUT) {
    changed = true;
    // Trailing JSON whitespace keeps the original document syntactically valid.
    fs.appendFileSync(path, Buffer.alloc(8 * 1024 * 1024, ' '));
  }
  return descriptor;
};
syncBuiltinESMExports();
