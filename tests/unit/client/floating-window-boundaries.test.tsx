import { expect, test } from 'vitest';
import {
  clampWindow,
  type FloatingArea,
  fitWindow,
  moveWindow,
} from '../../../src/client/floating-windows.js';

// These public geometry functions supplement the actual Chromium placement
// checks. Numeric rectangles do not claim browser layout or physical access.
const size = { width: 100, height: 100 };
const viewport = { x: 20, y: 30, width: 800, height: 600 };
const obstacle = { x: 300, y: 230, width: 150, height: 200 };
const area: FloatingArea = { viewport, obstacles: [obstacle] };
function overlaps(point: { x: number; y: number }, box: typeof obstacle) {
  return (
    point.x < box.x + box.width &&
    point.x + size.width > box.x &&
    point.y < box.y + box.height &&
    point.y + size.height > box.y
  );
}

test('a complete floating control respects visual-viewport offsets and chooses the nearest reader boundary', () => {
  expect(clampWindow({ x: -100, y: -100 }, size, viewport)).toEqual({ x: 20, y: 30 });
  expect(clampWindow({ x: 1200, y: 1200 }, size, viewport)).toEqual({ x: 720, y: 530 });
  expect(fitWindow({ x: 300, y: 250 }, size, area)).toEqual({ x: 200, y: 250 });
  expect(fitWindow({ x: 350, y: 230 }, size, area)).toEqual({ x: 350, y: 130 });
  expect(fitWindow({ x: 450, y: 430 }, size, area)).toEqual({ x: 450, y: 430 });
  const competing: FloatingArea = {
    viewport,
    obstacles: [
      { x: 650, y: 30, width: 170, height: 600 },
      { x: 20, y: 480, width: 630, height: 150 },
    ],
  };
  const fitted = fitWindow({ x: 600, y: 500 }, size, competing);
  expect(fitted).toEqual({ x: 550, y: 380 });
  expect(competing.obstacles.some((box) => overlaps(fitted, box))).toBe(false);
});

test('large pointer steps cannot tunnel through a reading pane from either axis or direction', () => {
  for (const [origin, requested, expected] of [
    [
      { x: 100, y: 250 },
      { x: 600, y: 250 },
      { x: 200, y: 250 },
    ],
    [
      { x: 600, y: 250 },
      { x: 100, y: 250 },
      { x: 450, y: 250 },
    ],
    [
      { x: 350, y: 50 },
      { x: 350, y: 500 },
      { x: 350, y: 130 },
    ],
    [
      { x: 350, y: 500 },
      { x: 350, y: 50 },
      { x: 350, y: 430 },
    ],
    [
      { x: 100, y: 100 },
      { x: 600, y: 600 },
      { x: 200, y: 530 },
    ],
    [
      { x: 500, y: 500 },
      { x: 100, y: 100 },
      { x: 100, y: 430 },
    ],
    [
      { x: 100, y: 50 },
      { x: 600, y: 50 },
      { x: 600, y: 50 },
    ],
    [
      { x: 500, y: 500 },
      { x: 500, y: 100 },
      { x: 500, y: 100 },
    ],
  ]) {
    const moved = moveWindow(origin, requested, size, area);
    expect(moved).toEqual(expected);
    expect(overlaps(moved, obstacle)).toBe(false);
  }
});

test('corner contact blocks both components and competing panes preserve a complete usable placement', () => {
  expect(moveWindow({ x: 100, y: 30 }, { x: 500, y: 430 }, size, area)).toEqual({ x: 200, y: 130 });
  const competing: FloatingArea = {
    viewport,
    obstacles: [obstacle, { x: 650, y: 30, width: 170, height: 600 }],
  };
  const moved = moveWindow({ x: 100, y: 250 }, { x: 750, y: 550 }, size, competing);
  expect(competing.obstacles.some((box) => overlaps(moved, box))).toBe(false);
  expect(moved.x).toBeGreaterThanOrEqual(viewport.x);
  expect(moved.x + size.width).toBeLessThanOrEqual(viewport.x + viewport.width);
  expect(moved.y + size.height).toBeLessThanOrEqual(viewport.y + viewport.height);
  // A viewport smaller than the control cannot invent space: retain a finite
  // clamped origin rather than claim that a complete placement exists.
  const tooSmall: FloatingArea = {
    viewport: { x: 10.2, y: 20.2, width: 50, height: 50 },
    obstacles: [{ x: 10, y: 20, width: 50, height: 50 }],
  };
  expect(fitWindow({ x: 25, y: 25 }, size, tooSmall)).toEqual({ x: 11, y: 21 });
});

test('moving away from a pane and grazing its corner does not trap an otherwise clear control', () => {
  expect(moveWindow({ x: 600, y: 250 }, { x: 700, y: 250 }, size, area)).toEqual({
    x: 700,
    y: 250,
  });
  expect(moveWindow({ x: 100, y: 250 }, { x: 200, y: 250 }, size, area)).toEqual({
    x: 200,
    y: 250,
  });
  expect(moveWindow({ x: 100, y: 330 }, { x: 300, y: 530 }, size, area)).toEqual({
    x: 300,
    y: 530,
  });
});
