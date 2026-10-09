import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createHousehold, signIn } from '../support/client.js';
import { microphoneButton, startConversationWithText } from '../support/conversation-page.js';

for (const seeded of [false, true])
  test(`context preparation preserves buffered PCM through summary on ${seeded ? 'seeded' : 'empty'} public installation`, {
    tag: '@technical',
  }, async ({ page }) => {
    // Extract the exact publicly runnable block before starting the fixture.
    const document = await readFile('docs/manual-tests/conversation-preparation.md', 'utf8');
    const source = document.match(/```javascript\n([\s\S]*?)\n```/u)?.[1];
    if (!source) throw new Error('Missing documented public preparation');
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/manual-voice.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: undefined },
    });
    const events: {
      event: string;
      origin?: string;
      directory?: string;
      householdId?: string;
      id?: string;
      kind?: string;
      message?: string;
    }[] = [];
    let buffer = '';
    let diagnostics = '';
    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.startsWith('{')) events.push(JSON.parse(line));
    });
    child.stderr.on('data', (chunk) => {
      diagnostics += String(chunk);
    });
    try {
      await expect.poll(() => events.some(({ event }) => event === 'ready')).toBe(true);
      const ready = events.find(({ event }) => event === 'ready');
      if (!ready?.origin || !ready.directory) throw new Error('Missing disposable launcher');
      if (seeded) {
        child.stdin.write('seed-family\n');
        await expect.poll(() => events.some(({ event }) => event === 'seeded')).toBe(true);
      }
      await signIn(page.request, ready.origin);
      const household = seeded
        ? events.find(({ event }) => event === 'seeded')?.householdId
        : (await (await createHousehold(page.request, ready.origin, 'Kontextprov')).json())
            .household.id;
      if (!household) throw new Error('Missing household');
      const path = `${ready.origin}/api/households/${household}/map`;
      let before = await (await page.request.get(path)).json();
      if (!seeded) {
        expect(before.objects).toEqual([]);
        expect(
          (
            await page.request.post(`${path}/draft`, {
              headers: { origin: ready.origin },
              data: {
                version: before.draft.version,
                contentVersion: before.contentVersion,
                id: 'lo',
                baseRevision: null,
                value: {
                  typeId: before.types[0].id,
                  name: 'Lo Exempel',
                  description: 'Påhittad uppgift',
                },
              },
            })
          ).status(),
        ).toBe(200);
        before = await (await page.request.get(path)).json();
      }
      expect(before.draft.changes.length).toBeGreaterThan(0);
      const history = await (await page.request.get(`${path}/history`)).json();
      await page.goto(ready.origin);
      await startConversationWithText(page);
      await page.evaluate(() => Object.assign(window, { contextOriginalFetch: window.fetch }));
      await page.evaluate(source);
      await page.evaluate(() => {
        (
          window as unknown as { skyttelVoicePreparation: { hold: (route: string) => void } }
        ).skyttelVoicePreparation.hold('voice');
      });
      const box = await microphoneButton(page).boundingBox();
      if (!box) throw new Error('Missing native microphone');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (
                window as unknown as { skyttelVoicePreparation: { status: () => { held: string } } }
              ).skyttelVoicePreparation.status().held,
          ),
        )
        .toBe('voice');
      await page.evaluate(() => window.skyttelVoiceFixture.setMicrophoneTone(440));
      await page.waitForTimeout(3000);
      expect(await page.evaluate(() => window.skyttelVoiceFixture.sentAudio())).toEqual([]);
      await page.mouse.up();
      const releasedAt = await page.evaluate(() => performance.now());
      await expect(microphoneButton(page)).toHaveAttribute('aria-pressed', 'false');
      await page.evaluate(() => window.skyttelVoiceFixture.setMicrophoneTone(880));
      const started = page.waitForResponse(
        (response) => response.url().endsWith('/voice') && response.request().method() === 'POST',
      );
      await page.evaluate(() =>
        (
          window as unknown as { skyttelVoicePreparation: { release: () => void } }
        ).skyttelVoicePreparation.release(),
      );
      expect((await started).status()).toBe(201);
      child.stdin.write('context 89\n');
      await expect
        .poll(() =>
          events.some(({ event, kind }) => event === 'held' && kind === 'context-summary'),
        )
        .toBe(true);
      const summary = events.find(
        ({ event, kind }) => event === 'held' && kind === 'context-summary',
      );
      if (!summary?.id) throw new Error('Missing actual summary request');
      child.stdin.write(
        `reply ${summary.id} Historisk sammanfattning: Lo är det senaste förslaget.\n`,
      );
      await expect(page.getByRole('log', { name: 'Samtalstext' })).toContainText(
        'Skyttel har sammanfattat samtalet för att få plats i kontexten.',
      );
      await expect
        .poll(() => page.evaluate(() => window.skyttelVoiceFixture.stats().openPeers))
        .toBe(1);
      const renewedAt = await page.evaluate(() => performance.now());
      await expect
        .poll(() =>
          page.evaluate(
            (at) =>
              window.skyttelVoiceFixture
                .sentAudio()
                .some(
                  (sample) => sample.at > at && sample.frequency > 400 && sample.frequency < 480,
                ),
            renewedAt,
          ),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          (at) =>
            window.skyttelVoiceFixture
              .captureChanges()
              .filter((change) => change.at > at && change.enabled),
          releasedAt,
        ),
      ).toEqual([]);
      expect(
        await page.evaluate(() =>
          window.skyttelVoiceFixture
            .sentAudio()
            .some((sample) => sample.frequency > 820 && sample.frequency < 940),
        ),
      ).toBe(false);
      expect(await page.evaluate(() => window.skyttelVoiceFixture.stats().microphoneRequests)).toBe(
        1,
      );
      await expect(microphoneButton(page)).toHaveAttribute('aria-pressed', 'false');
      await page.evaluate(() =>
        (
          window as unknown as { skyttelVoicePreparation: { restore: () => void } }
        ).skyttelVoicePreparation.restore(),
      );
      expect(
        await page.evaluate(
          () =>
            window.fetch ===
            (window as unknown as { contextOriginalFetch: typeof fetch }).contextOriginalFetch,
        ),
      ).toBe(true);
      expect(await page.evaluate(() => 'skyttelVoicePreparation' in window)).toBe(false);
      expect(await (await page.request.get(path)).json()).toEqual(before);
      expect(await (await page.request.get(`${path}/history`)).json()).toEqual(history);
      child.stdin.write('quit\n');
      await expect.poll(() => events.some(({ event }) => event === 'closed')).toBe(true);
      await expect(stat(ready.directory)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(diagnostics).toBe('');
      expect(events.filter(({ event }) => event === 'error')).toEqual([]);
    } finally {
      await page.mouse.up();
      if (child.exitCode === null) child.stdin.write('quit\n');
      await expect.poll(() => child.exitCode).toBe(0);
    }
  });
