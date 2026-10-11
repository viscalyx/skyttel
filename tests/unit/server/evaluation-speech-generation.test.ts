import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { generateSpeech, speechRecipe } from '../../../scripts/model-evaluation/generate-speech.js';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'skyttel-speech-'));
  directories.push(path);
  return path;
}
function response(usage: unknown = { input_tokens: 100, output_tokens: 25, total_tokens: 125 }) {
  return new Response(
    [
      { type: 'speech.audio.delta', audio: Buffer.from([0, 0, 10, 0]).toString('base64') },
      { type: 'speech.audio.done', usage },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join(''),
  );
}

test('speech generation reuses complete matching audio without a second provider charge', {
  tags: ['technical'],
}, async () => {
  const output = await directory();
  const create = vi.fn(async () => response());
  const options = { directory: output, create, ids: ['kort-utan-sparande'] };
  const result = await generateSpeech(options);
  expect(result.records.map((record) => record.voice)).toEqual(['marin', 'cedar']);
  expect(result.costUsd).toBeCloseTo(0.00072);
  const bytes = await readFile(join(output, 'marin/kort-utan-sparande.wav'));
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.readUInt32LE(24)).toBe(24000);
  expect(bytes.readUInt32LE(40)).toBe(4);
  expect(result.records[0].humanReview).toBe('pending');
  expect((await generateSpeech(options)).records).toEqual(result.records);
  expect(create).toHaveBeenCalledTimes(2);
});

test.each(['text', 'audio'])(
  'speech generation rejects changed %s before reusing or paying for an artifact',
  { tags: ['technical'] },
  async (variant) => {
    const output = await directory();
    const create = vi.fn(async () => response());
    const options = { directory: output, create, ids: ['kort-utan-sparande'] };
    await generateSpeech(options);
    const stem = join(output, 'marin/kort-utan-sparande');
    if (variant === 'audio') await writeFile(`${stem}.wav`, 'corrupt');
    else {
      const request = JSON.parse(await readFile(`${stem}.request.json`, 'utf8'));
      request.input = 'Annan text.';
      await writeFile(`${stem}.request.json`, JSON.stringify(request));
    }
    await expect(generateSpeech(options)).rejects.toThrow('speech_artifact_mismatch');
    expect(create).toHaveBeenCalledTimes(2);
  },
);

test('unknown speech usage preserves received audio and prevents automatic paid retries', {
  tags: ['technical'],
}, async () => {
  const output = await directory();
  const create = vi.fn(async () => response(null));
  const options = { directory: output, create, ids: ['kort-utan-sparande'] };
  await expect(generateSpeech(options)).rejects.toThrow('speech_usage_unknown');
  expect((await readFile(join(output, 'marin/kort-utan-sparande.wav'))).length).toBe(48);
  await expect(generateSpeech(options)).rejects.toThrow('EEXIST');
  expect(create).toHaveBeenCalledOnce();
});

test('invalid scenario selection fails before any provider call', {
  tags: ['technical'],
}, async () => {
  const create = vi.fn(async () => response());
  await expect(
    generateSpeech({ directory: await directory(), create, ids: ['missing'] }),
  ).rejects.toThrow('unknown_speech_step');
  expect(create).not.toHaveBeenCalled();
  expect(speechRecipe.voices).toEqual(['marin', 'cedar']);
});

test('a selected voice and speed are recorded and reused without changing other defaults', {
  tags: ['technical'],
}, async () => {
  const create = vi.fn(async () => response());
  const options = {
    directory: await directory(),
    create,
    ids: ['fragor-och-andringar'],
    voices: ['cedar'],
    speed: 1.1,
  };
  const result = await generateSpeech(options);
  expect(create).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ voice: 'cedar', speed: 1.1 }),
  );
  expect(result.records).toHaveLength(1);
  expect(result.recipe).toMatchObject({ voices: ['cedar'], speeds: { cedar: 1.1 } });
  await generateSpeech(options);
  expect(create).toHaveBeenCalledOnce();
  await expect(generateSpeech({ ...options, speed: 1.2 })).rejects.toThrow(
    'speech_artifact_mismatch',
  );
  expect(create).toHaveBeenCalledOnce();
  expect(speechRecipe.speeds).toEqual({ marin: 1.15, cedar: 1.25 });
});

test.each([
  { voices: ['unknown'] },
  { voices: [] },
  { voices: ['cedar', 'cedar'] },
  { speed: Number.NaN },
  { speed: 0 },
  { speed: 5 },
])('invalid speech settings fail before payment: %j', { tags: ['technical'] }, async (settings) => {
  const create = vi.fn(async () => response());
  await expect(
    generateSpeech({
      directory: await directory(),
      create,
      ids: ['kort-utan-sparande'],
      ...settings,
    }),
  ).rejects.toThrow('invalid_speech_settings');
  expect(create).not.toHaveBeenCalled();
});
