import { spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'manual-dir': { type: 'string', default: 'docs/manual-tests' },
    config: { type: 'string', default: 'playwright.config.ts' },
    area: { type: 'string', multiple: true },
  },
});
const discovery = spawnSync(
  process.execPath,
  [
    resolve('node_modules/@playwright/test/cli.js'),
    'test',
    '--list',
    '--reporter=json',
    '--config',
    values.config,
  ],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
if (discovery.status !== 0) {
  console.error(discovery.stderr || discovery.stdout);
  process.exit(1);
}
const report = JSON.parse(discovery.stdout);
const tests = [];
function collect(suites, parents = []) {
  for (const suite of suites) {
    const titles = [...parents, ...(suite.file === suite.title ? [] : [suite.title])];
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        tests.push({
          ...test,
          file: resolve(report.config.rootDir, spec.file),
          title: spec.title,
          fullTitle: [...titles, spec.title].join(' > '),
          tags: spec.tags,
        });
      }
    }
    collect(suite.suites ?? [], titles);
  }
}
collect(report.suites);
const caseIdentity = (title) => title.match(/^([\p{Lu}\d]+(?:-[\p{Lu}\d]+)*-\d+):/u)?.[1];
let count = 0;
const claimed = new Map();
const identities = new Map();
const errors = [];
const textPresent = (value) => typeof value === 'string' && value.trim().length > 0;
const observationKinds = new Set([
  'screen-reader',
  'physical-microphone-audio',
  'os-permission',
  'physical-input',
  'visual-symbol-recognition',
  'external-client',
]);
const selectedAreas = values.area?.map((file) => resolve(file));
const selectedIdentities = new Set();
const manualFiles = globSync(`${values['manual-dir']}/**/*.md`).sort();
for (const area of selectedAreas ?? []) {
  if (!manualFiles.some((file) => resolve(file) === area))
    errors.push(`selected area ${area} not found under ${values['manual-dir']}`);
}
for (const file of manualFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(
    /^### ([\p{L}\d-]+):[^\n]*\n([\s\S]*?)(?=^#{1,3} |$(?![\s\S]))/gmu,
  )) {
    if (identities.has(match[1])) {
      errors.push(
        `${file}: ${match[1]}: duplicate case identity; first declared in ${identities.get(match[1])}`,
      );
    } else {
      identities.set(match[1], file);
    }
    if (selectedAreas && !selectedAreas.includes(resolve(file))) continue;
    selectedIdentities.add(match[1]);
    const blocks = [...match[2].matchAll(/```manual-mapping\n([\s\S]*?)\n```/g)];
    if (!blocks.length) {
      errors.push(`${file}: ${match[1]}: missing manual-mapping metadata`);
      continue;
    }
    const diagnostic = (message) => errors.push(`${file}: ${match[1]}: ${message}`);
    if (blocks.length !== 1) {
      diagnostic('provide exactly one manual-mapping block');
      continue;
    }
    let metadata;
    try {
      metadata = JSON.parse(blocks[0][1]);
    } catch (error) {
      diagnostic(`invalid manual-mapping JSON: ${error.message}`);
      continue;
    }
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      diagnostic('manual-mapping must be an object');
      continue;
    }
    if (!textPresent(metadata.reference))
      diagnostic('reference must name the selected configuration or variants');
    if (
      !Array.isArray(metadata.outcomes) ||
      !metadata.outcomes.length ||
      !metadata.outcomes.every(textPresent)
    )
      diagnostic('outcomes must name at least one protected result');
    if (Boolean(metadata.counterpart) === Boolean(metadata.humanObservation))
      diagnostic('provide exactly one counterpart or humanObservation branch');
    if (metadata.humanObservation) {
      if (!observationKinds.has(metadata.humanObservation.kind))
        diagnostic(`humanObservation.kind must be one of ${[...observationKinds].join(', ')}`);
      if (!textPresent(metadata.humanObservation.observation))
        diagnostic('humanObservation must name the required observation');
    }
    if (metadata.evidence !== undefined) {
      if (!Array.isArray(metadata.evidence))
        diagnostic('evidence must be an array of separately identified references');
      else
        for (const evidence of metadata.evidence) {
          if (!evidence || !['technical', 'overlap', 'real-provider'].includes(evidence.kind)) {
            diagnostic('evidence.kind must be technical, overlap or real-provider');
            continue;
          }
          if (!textPresent(evidence.purpose))
            diagnostic(`${evidence.kind} evidence must state its purpose`);
          if (!validateReference(evidence, diagnostic)) continue;
          if (evidence.kind !== 'real-provider')
            findReference(evidence, `${evidence.kind} evidence`, diagnostic);
        }
    }
    const counterpart = metadata.counterpart;
    if (counterpart) {
      if (typeof counterpart !== 'object' || Array.isArray(counterpart)) {
        errors.push(`${file}: ${match[1]}: provide exactly one counterpart object`);
        continue;
      }
      if (!validateReference(counterpart, diagnostic)) continue;
      const found = findReference(counterpart, 'counterpart', diagnostic);
      if (!found) continue;
      const testIdentity = caseIdentity(found.title);
      if (testIdentity && testIdentity !== match[1]) {
        errors.push(
          `${file}: ${match[1]}: counterpart case identity ${testIdentity} must agree with the manual case`,
        );
      }
      if (found.tags.includes('technical'))
        diagnostic('a technical test cannot be an ordinary counterpart');
      if (claimed.has(found)) {
        errors.push(
          `${file}: ${match[1]}: ${found.title} is already the ordinary counterpart of ${claimed.get(found)}`,
        );
      } else {
        claimed.set(found, match[1]);
      }
    }
    count++;
  }
}
function validateReference(reference, diagnostic) {
  if (!textPresent(reference.spec) || !existsSync(resolve(reference.spec))) {
    diagnostic(`missing spec reference ${reference.spec ?? '(no spec)'}`);
    return false;
  }
  if (textPresent(reference.title) === textPresent(reference.caseId)) {
    diagnostic('reference must provide exactly one title or caseId');
    return false;
  }
  return true;
}

function findReference(reference, role, diagnostic) {
  const found = tests.filter(
    (test) =>
      test.file === resolve(reference.spec) &&
      (reference.title
        ? test.title === reference.title || test.fullTitle === reference.title
        : caseIdentity(test.title) === reference.caseId),
  );
  if (found.length !== 1) {
    diagnostic(
      `${found.length ? 'ambiguous' : 'missing'} ${role} ${reference.spec} / ${reference.title ?? reference.caseId}: ${found.length} discovered tests${found.map((test) => `\n  ${test.fullTitle}`).join('')}`,
    );
    return undefined;
  }
  return found[0];
}
const functionalIdentities = new Map();
for (const test of tests) {
  if (!test.tags.includes('technical')) {
    const id = caseIdentity(test.title);
    if (selectedAreas && !claimed.has(test) && !selectedIdentities.has(id)) continue;
    if (id && functionalIdentities.has(id)) {
      errors.push(
        `${test.file}: ${id}: duplicate functional case identity; ${test.fullTitle} and ${functionalIdentities.get(id)}`,
      );
    } else if (id) {
      functionalIdentities.set(id, test.fullTitle);
    }
  }
  if (!selectedAreas && !test.tags.includes('technical') && !claimed.has(test)) {
    errors.push(`${test.file}: ${test.title}: no ordinary manual counterpart`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Manual mapping valid: ${count} manual cases; ${tests.length} discovered tests.`);
}
