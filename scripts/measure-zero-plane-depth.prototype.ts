// Browser profiling against the already-running disposable prototype.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { signIn } from '../tests/support/client.js';

const url = new URL(process.argv[2]);
const output = process.argv[3] ?? '/tmp/zero-plane-motion.json';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await signIn(page.request, url.origin);
  await page.goto(url.href);
  await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
  const panel = page.locator('.zero-planes-prototype');
  const choices = await panel
    .getByRole('combobox', { name: 'Djupvisning', exact: true })
    .locator('option')
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  const results = [];
  for (const mode of choices) {
    await page.goto(url.href);
    await panel.getByRole('combobox', { name: 'Djupvisning', exact: true }).selectOption(mode);
    await panel.locator('summary').click();
    await page.screenshot({ path: `${output.replace(/\.json$/, '')}-${mode}.png` });
    const metrics = page.evaluate(async () => {
      const frames: number[] = [];
      let previous = performance.now();
      const end = previous + 2500;
      await new Promise<void>((resolve) => {
        const loop = {
          frame(now: number) {
            frames.push(now - previous);
            previous = now;
            if (now < end) requestAnimationFrame(loop.frame);
            else resolve();
          },
        };
        requestAnimationFrame(loop.frame);
      });
      frames.sort((a, b) => a - b);
      return {
        frames: frames.length,
        medianMs: frames[Math.floor(frames.length / 2)],
        p95Ms: frames[Math.floor(frames.length * 0.95)],
        over50ms: frames.filter((n) => n > 50).length,
        maxMs: Math.max(...frames),
      };
    });
    const canvas = await page.locator('.spatial-surface canvas').boundingBox();
    if (!canvas) throw new Error('No map canvas');
    await page.mouse.move(canvas.x + canvas.width * 0.7, canvas.y + canvas.height * 0.2);
    await page.mouse.down({ button: 'right' });
    for (let i = 0; i < 100; i++) {
      await page.mouse.move(
        canvas.x + canvas.width * (0.7 - i * 0.004),
        canvas.y + canvas.height * (0.2 + Math.sin(i / 15) * 0.05),
      );
    }
    await page.mouse.up({ button: 'right' });
    results.push({ mode, ...(await metrics) });
    await panel.locator('summary').click();
  }
  const result = {
    results,
    errors,
    note: 'Headless Chromium on nine synthetic objects. Frame timings depend on the host; human review is still needed.',
  };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
