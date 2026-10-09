import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Use a disposable development fixture.');
  const { values } = parseArgs({
    options: {
      origin: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      headless: { type: 'boolean', default: false },
      'freeze-grace': { type: 'boolean', default: false },
    },
  });
  if (!values.origin) throw new Error('Supply the printed origin.');
  const origin = new URL(values.origin);
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.pathname !== '/')
    throw new Error('Use the exact loopback origin printed by manual-voice.ts.');
  const width = Number(values.width);
  const height = Number(values.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new Error('Supply the case width and height.');
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-voice-observation-'));
  const context = await chromium
    .launchPersistentContext(directory, {
      headless: values.headless,
      viewport: { width, height },
      args: ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'],
    })
    .catch(async (error) => {
      await rm(directory, { recursive: true, force: true });
      throw error;
    });
  const page = context.pages()[0];
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const stop = () => input.close();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const emit = (event: string, data = {}) => console.log(JSON.stringify({ event, ...data }));
  let paused = false;
  let interruption: 'media' | 'http' | undefined;
  try {
    await page.goto(origin.href);
    if (!(await page.evaluate(() => Boolean(window.skyttelVoiceFixture))))
      throw new Error('The supplied origin is not the controlled voice fixture.');
    // The short observations use the same external clock arrangement as NOT-07.
    if (height <= 450 || values['freeze-grace']) await page.clock.install();
    const port = (await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
    emit('ready', {
      origin: origin.origin,
      width,
      height,
      directory,
      endpoint: `http://127.0.0.1:${port}`,
    });
    for await (const command of input) {
      try {
        if (command.trim() === 'quit') break;
        const action = command.trim();
        if (action === 'disconnect' || action === 'offline') {
          if (interruption)
            throw new Error('Restore the current connection before interrupting again.');
          if (height <= 450 || values['freeze-grace']) {
            await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
            paused = true;
          }
          interruption = action === 'offline' ? 'http' : 'media';
          if (interruption === 'http') await context.setOffline(true);
          else await page.evaluate(() => window.skyttelVoiceFixture.disconnect());
          emit(action === 'offline' ? 'offline' : 'disconnected', { clockPaused: paused });
        } else if (action === 'reconnect' || action === 'online') {
          if (interruption !== (action === 'online' ? 'http' : 'media'))
            throw new Error('Use the matching online or reconnect command.');
          if (action === 'online') await context.setOffline(false);
          else await page.evaluate(() => window.skyttelVoiceFixture.reconnect());
          if (paused) await page.clock.resume();
          paused = false;
          interruption = undefined;
          emit(action === 'online' ? 'online' : 'reconnected', { clockPaused: false });
        } else throw new Error('Use disconnect, reconnect, offline, online or quit.');
      } catch (error) {
        emit('error', { message: error instanceof Error ? error.message : 'Control failed.' });
      }
    }
  } finally {
    if (interruption === 'http') await context.setOffline(false).catch(() => {});
    if (paused) await page.clock.resume().catch(() => {});
    input.close();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    try {
      await context.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    emit('closed');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Voice observation preparation failed.');
  process.exitCode = 1;
});
