import { randomBytes } from 'node:crypto';
import { readdir, readFile, readlink } from 'node:fs/promises';
import { get, type IncomingMessage } from 'node:http';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import sharp from 'sharp';

export async function seedLargeExport(directory: string, householdId: string, userId: string) {
  const pixels = await sharp(randomBytes(256 * 256 * 3), {
    raw: { width: 256, height: 256, channels: 3 },
  })
    .webp({ lossless: true })
    .toBuffer();
  const database = new Database(join(directory, 'skyttel.db'));
  try {
    database.transaction(() => {
      for (let index = 0; index < 100; index++)
        database
          .prepare('INSERT INTO profile_image VALUES (?, ?, ?, ?, ?, 256, 256)')
          .run(`browser-retained-${index}`, householdId, 'historical-object', userId, pixels);
    })();
  } finally {
    database.close();
  }
}

// Bridge one actual browser GET to its real HTTP stream and stop consuming
// after the first chunk. /proc proves unread source bytes on Linux; a pending
// browser response or route.fetch()'s buffered ZIP alone cannot prove this.
export async function holdBrowserExport(page: Page, directory: string, path: string) {
  const expiresAt = await page
    .getByRole('region', { name: 'Fullständig export' })
    .locator('time')
    .getAttribute('datetime');
  if (!expiresAt) throw new Error('Prepare an export before arming its stream.');
  // Obtain only this browser's cookie header in memory. Never log credentials.
  const headers = {
    cookie: (await page.context().cookies(path))
      .map(({ name, value }) => `${name}=${value}`)
      .join('; '),
  };
  let response: IncomingMessage | undefined;
  let receivedBytes = 0;
  let archiveBytes = 0;
  let sourceReadBytes: number | null = null;
  let interrupted = false;
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markPaused = () => {};
  const paused = new Promise<void>((resolve) => {
    markPaused = resolve;
  });
  let markCompleted = () => {};
  const completed = new Promise<void>((resolve) => {
    markCompleted = resolve;
  });
  await page.route(
    `${path}/exports/*`,
    async (route) => {
      response = await new Promise<IncomingMessage>((resolve, reject) => {
        get(route.request().url(), { headers }, resolve).once('error', reject);
      });
      expect(response.statusCode).toBe(200);
      archiveBytes = Number(response.headers['content-length']);
      expect(archiveBytes).toBeGreaterThan(16 * 1024 * 1024);
      const chunks: Buffer[] = [];
      const current = response;
      let settled = () => {};
      const ended = new Promise<void>((resolve) => {
        settled = resolve;
      });
      current.once('end', settled);
      current.on('error', () => {
        interrupted = true;
        settled();
      });
      await new Promise<void>((resolve, reject) => {
        current.once('error', reject);
        current.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          receivedBytes += chunk.length;
          if (chunks.length === 1) {
            current.pause();
            resolve();
          }
        });
      });
      const archive = join(
        directory,
        '.skyttel-exports',
        new URL(route.request().url()).pathname.split('/').at(-1) as string,
        'archive.zip',
      );
      await expect
        .poll(async () => {
          for (const fd of await readdir('/proc/self/fd')) {
            try {
              if ((await readlink(`/proc/self/fd/${fd}`)) !== archive) continue;
              const info = await readFile(`/proc/self/fdinfo/${fd}`, 'utf8');
              sourceReadBytes = Number(/^pos:\s*(\d+)/m.exec(info)?.[1]);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
          }
          return (
            sourceReadBytes !== null &&
            sourceReadBytes >= receivedBytes &&
            sourceReadBytes < archiveBytes &&
            !current.complete &&
            Date.now() < Date.parse(expiresAt)
          );
        })
        .toBe(true);
      markPaused();
      await held;
      current.resume();
      await ended;
      if (interrupted || !current.complete) await route.abort('connectionreset');
      else
        await route.fulfill({
          status: 200,
          contentType: 'application/zip',
          body: Buffer.concat(chunks),
        });
      markCompleted();
    },
    { times: 1 },
  );
  return {
    paused,
    completed,
    release,
    inspect: () => ({
      receivedBytes,
      archiveBytes,
      sourceReadBytes,
      interrupted,
      expiresAt,
      beforeExpiry: Date.now() < Date.parse(expiresAt),
    }),
    close: () => {
      release();
      response?.destroy();
    },
  };
}
