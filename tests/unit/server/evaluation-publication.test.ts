import { createHash, randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { evaluationPublication } from '../../../scripts/model-evaluation/publication.js';

test('oversized result records publish in bounded parts without losing their original JSON', {
  tags: ['technical'],
}, () => {
  for (const diagnostics of [
    Array.from({ length: 10_000 }, (_, index) => ({
      name: 'read_my_draft',
      taskId: 'observed-task',
      startedMs: index * 20,
      elapsedMs: 3,
    })),
    randomBytes(120_000).toString('base64'),
  ]) {
    const record = {
      format: 'skyttel-model-evaluation',
      version: 1,
      issue: 341,
      type: 'attempt',
      data: {
        profile: 'supplied-high',
        scenario: 'change-price-payment',
        step: 'kort-utan-sparande',
        modality: 'text',
        repetition: 1,
        outcome: 'fail',
        fixed: ['effective_objects'],
        content: [{ id: 'backend-0', outcome: 'fail', reason: 'Ändringen saknas.' }],
        elapsedMs: null,
        backendCostUsd: 0.012,
        diagnostics,
      },
    };
    const original = `${JSON.stringify(record, null, 2)}\n`;
    const markdown = `## Ändringsbesked\n\n\`\`\`json\n${original}\`\`\`\n`;
    const bodies = evaluationPublication(markdown);
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.every((body) => body.length <= 55_000)).toBe(true);
    const parts = bodies.map((body) => {
      const match = body.match(/```json\n([\s\S]*?)\n```/);
      expect(match).not.toBeNull();
      const part = JSON.parse(match?.[1] ?? '');
      expect(part).toMatchObject({
        format: 'skyttel-model-evaluation-transport',
        version: 1,
        encoding: 'gzip+base64',
        sha256: createHash('sha256').update(original).digest('hex'),
        parts: bodies.length,
        record: { issue: 341, type: 'attempt', outcome: 'fail' },
      });
      return part;
    });
    expect(parts.map((part) => part.part)).toEqual(
      Array.from({ length: bodies.length }, (_, index) => index + 1),
    );
    const restored = gunzipSync(
      Buffer.from(parts.map((part) => part.payload).join(''), 'base64'),
    ).toString('utf8');
    expect(restored).toBe(original);
    expect(JSON.parse(restored)).toEqual(record);
  }
});
