import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { createHousehold, signIn } from '../support/client.js';
import { expect, test } from '../support/test.js';

const assistant = (page: Page) => page.getByRole('region', { name: 'Arbetsyta', exact: true });

test('manual text launcher public preparation seeded rejects an unaccepted delivery', {
  tag: '@technical',
}, async ({ page }) => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/manual-text-assistant.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '';
  let resolveReady!: (value: { origin: string; directory: string }) => void;
  const ready = new Promise<{ origin: string; directory: string }>((resolve) => {
    resolveReady = resolve;
  });
  child.stdout.on('data', (chunk) => {
    output += String(chunk);
    const line = output.split('\n').find((value) => value.includes('"event":"ready"'));
    if (line) resolveReady(JSON.parse(line));
  });
  child.stderr.on('data', () => {});
  const app = await ready;
  try {
    await signIn(page.request, app.origin);
    const { household } = await (await createHousehold(page.request, app.origin)).json();
    const path = `${app.origin}/api/households/${household.id}/map`;
    const state = await (await page.request.get(path)).json();
    const response = await page.request.post(`${path}/draft`, {
      headers: { origin: app.origin },
      data: {
        version: state.draft.version,
        contentVersion: state.contentVersion,
        id: 'lo',
        baseRevision: null,
        value: {
          typeId: state.types[0].id,
          name: 'Lo Exempel',
          properties: [
            {
              id: 'description',
              label: 'Beskrivning',
              kind: 'text' as const,
              value: 'Påhittad uppgift',
            },
          ],
        },
      },
    });
    expect(response.status()).toBe(200);
    const before = await (await page.request.get(path)).json();
    expect(before.draft.changes).toHaveLength(1);
    expect(before.draft.changes[0]).toMatchObject({
      id: 'lo',
      before: null,
      after: {
        name: 'Lo Exempel',
        properties: expect.arrayContaining([
          expect.objectContaining({
            label: 'Beskrivning',
            kind: 'text',
            value: 'Påhittad uppgift',
          }),
        ]),
      },
    });
    await page.goto(`${app.origin}/households/${household.id}`);
    const result = await page.evaluate(async (url) => {
      const control = (
        window as unknown as {
          skyttelTextDelivery: { arm(): void; status(): { phase: string }; clear(): void };
        }
      ).skyttelTextDelivery;
      control.arm();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = { status: response.status, phase: control.status().phase };
      control.clear();
      return result;
    }, `${app.origin}/api/households/${household.id}/text-assistant/missing-session/messages`);
    expect(result).toEqual({ status: 404, phase: 'not-accepted' });
    expect(await (await page.request.get(path)).json()).toEqual(before);
    expect((await (await page.request.get(`${path}/operations`)).json()).operations).toEqual([]);
    await page.reload();
    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as { skyttelTextDelivery: { status(): { phase: string } } }
          ).skyttelTextDelivery.status().phase,
      ),
    ).toBe('idle');
  } finally {
    child.stdin.end('quit\n');
    if (child.exitCode === null) await once(child, 'exit');
    expect(child.exitCode).toBe(0);
    expect(output).toContain('"event":"closed"');
    await expect(access(app.directory)).rejects.toThrow();
  }
});
