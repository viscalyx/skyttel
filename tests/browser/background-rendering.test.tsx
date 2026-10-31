import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { spatialScene } from '../../src/client/spatial-scene.js';
import { defaultViewSettings } from '../../src/shared/personal-view.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function openScene(width: number) {
  const canvas = document.createElement('canvas');
  canvas.style.width = `${width}px`;
  canvas.style.height = `${width === 390 ? 844 : 960}px`;
  document.body.append(canvas);
  const scene = spatialScene(
    canvas,
    () => {},
    () => {},
    undefined,
    canvas,
  );
  cleanups.push(() => {
    scene.dispose();
    canvas.remove();
  });
  await expect.poll(() => canvas.width).toBe(width);
  const context = canvas.getContext('webgl2');
  if (!context) throw new Error('Real WebGL rendering required');
  const pixels = () => {
    const data = new Uint8Array(canvas.width * canvas.height * 4);
    context.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      context.RGBA,
      context.UNSIGNED_BYTE,
      data,
    );
    return data;
  };
  return { scene, pixels, canvas };
}

for (const width of [1440, 390])
  for (const [theme, appearance] of [
    ['light', 'pearl'],
    ['light', 'dawn'],
    ['light', 'ocean'],
    ['dark', 'atmosphere'],
    ['dark', 'mist'],
    ['dark', 'universe'],
    ['dark', 'ocean'],
  ] as const)
    test(`background freeze, resume and reset: ${theme}/${appearance}, ${width}px`, {
      tags: ['technical'],
      timeout: 30_000,
    }, async () => {
      const { scene, pixels } = await openScene(width);
      const settings = {
        ...defaultViewSettings,
        background: true,
        ...(theme === 'light' ? { lightBackground: appearance } : { darkBackground: appearance }),
      };
      scene.configure(settings, theme);
      const baseline = pixels();
      scene.navigate('rotate-left');
      scene.navigate('right');
      scene.navigate('in');
      const moving = pixels();
      expect(samePixels(moving, baseline)).toBe(false);
      scene.configure(settings, theme, true);
      expect(samePixels(pixels(), moving)).toBe(true);
      scene.navigate('rotate-right');
      scene.navigate('left');
      scene.navigate('out');
      expect(samePixels(pixels(), moving)).toBe(true);
      scene.configure(settings, theme, false);
      expect(samePixels(pixels(), moving)).toBe(true);
      scene.navigate('rotate-left');
      const resumed = pixels();
      expect(samePixels(resumed, moving)).toBe(false);
      scene.configure(settings, theme, true);
      scene.reset();
      expect(samePixels(pixels(), resumed)).toBe(true);
      scene.configure(settings, theme, false);
      expect(samePixels(pixels(), resumed)).toBe(true);
      scene.reset();
      expect(samePixels(pixels(), baseline)).toBe(true);
    });

function samePixels(actual: Uint8Array, expected: Uint8Array) {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function warmth(pixels: Uint8Array) {
  let total = 0;
  for (let index = 0; index < pixels.length; index += 4) total += pixels[index] - pixels[index + 2];
  return total / (pixels.length / 4);
}

for (const width of [1440, 390])
  for (const theme of ['light', 'dark'] as const)
    test(`ocean stillness, direction and theme isolation: ${theme}, ${width}px`, {
      tags: ['technical'],
      timeout: 30_000,
    }, async () => {
      const { scene, pixels, canvas } = await openScene(width);
      const settings = {
        ...defaultViewSettings,
        background: true,
        lightBackground: 'ocean' as const,
        darkBackground: 'ocean' as const,
      };
      scene.configure(settings, theme);
      const initial = pixels();
      const still = await page.elementLocator(canvas).screenshot({ base64: true });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      expect((await page.elementLocator(canvas).screenshot({ base64: true })).base64).toBe(
        still.base64,
      );
      if (theme === 'light') {
        for (let index = 0; index < 6; index++) scene.navigate('tilt-up');
        const sand = warmth(pixels());
        expect(sand).toBeGreaterThan(warmth(initial) + 8);
        for (let index = 0; index < 12; index++) scene.navigate('tilt-down');
        expect(warmth(pixels())).toBeLessThan(sand - 8);
      } else {
        let redTotal = 0;
        let greenMaximum = 0;
        for (let index = 0; index < initial.length; index += 4) {
          redTotal += initial[index];
          greenMaximum = Math.max(greenMaximum, initial[index + 1]);
        }
        expect(redTotal / (initial.length / 4)).toBeLessThan(35);
        expect(greenMaximum).toBeGreaterThan(40);
        for (const direction of ['rotate-left', 'rotate-right', 'tilt-up', 'tilt-down']) {
          scene.reset();
          // One command must change the frame. Repeating it only renders
          // unchecked intermediate frames, which is costly on software GPUs.
          scene.navigate(direction);
          expect(samePixels(pixels(), initial)).toBe(false);
        }
      }
      scene.reset();
      scene.configure(settings, theme === 'light' ? 'dark' : 'light');
      expect(Math.abs(warmth(pixels()) - warmth(initial))).toBeGreaterThan(5);
      scene.configure(settings, theme);
      expect(samePixels(pixels(), initial)).toBe(true);
    });
