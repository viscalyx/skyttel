import { expect } from 'vitest';
import type { cdp } from 'vitest/browser';

/** Restore the desktop runner's native input capabilities after touch emulation. */
export async function restoreDesktopPointer(session: ReturnType<typeof cdp>) {
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  // Chromium can leave pointer:none after disabling touch on the reused page.
  // A native capture refreshes its input capabilities without navigating away
  // from Vitest. Discard the one pixel; this is not an image assertion.
  await session.send('Page.captureScreenshot', {
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 1, height: 1, scale: 1 },
  });
  await expect.poll(() => window.matchMedia('(pointer: fine)').matches).toBe(true);
  expect(navigator.maxTouchPoints).toBe(0);
  const runnerWindow = window.top;
  if (!runnerWindow) throw new Error('Missing top-level browser');
  await expect.poll(() => runnerWindow.matchMedia('(pointer: fine)').matches).toBe(true);
  expect(runnerWindow.navigator.maxTouchPoints).toBe(0);
}
