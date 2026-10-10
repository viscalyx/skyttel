import { expect, test } from 'vitest';
import { connectionOcclusion } from '../../../src/client/spatial-occlusion.js';
import type { ProjectedPoint } from '../../../src/client/spatial-scene.js';

function point(id: string, x: number, depth: number): ProjectedPoint {
  return { id, x, y: 0, depth, scale: 1, visible: true };
}

function xBounds(path: string) {
  const coordinates = path.split(' ').filter((token) => !['M', 'L', 'Z'].includes(token));
  const xs = coordinates.filter((_, index) => index % 2 === 0).map(Number);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

test('a sloping relationship changes depth within an overlapping symbol using perspective depth', () => {
  // At screen fraction 3/4, reciprocal depth is 1/20. Arithmetic depth
  // would incorrectly put the crossing halfway along the line.
  const masks = connectionOcclusion(point('source', 0, 10), point('target', 100, 30), [
    point('object', 75, 20),
  ]);
  expect(masks).toHaveLength(1);
  expect(xBounds(masks[0].path).min).toBeCloseTo(75, 10);
});

test('the former curved route retains the same depth crossing on its displayed curve', () => {
  const masks = connectionOcclusion(
    point('source', 0, 10),
    point('target', 100, 30),
    [{ ...point('object', 75, 20), y: 8.625 }],
    23,
  );
  expect(xBounds(masks[0].path).min).toBeCloseTo(75, 10);
});

test('reversing a sloping relationship hides its far end up to the perspective crossing', () => {
  const masks = connectionOcclusion(point('source', 0, 30), point('target', 100, 10), [
    point('object', 25, 20),
  ]);
  expect(xBounds(masks[0].path).max).toBeCloseTo(25, 10);
});

test('only nearer overlapping objects obscure a relationship at a constant depth', () => {
  const source = point('source', 0, 10);
  const target = point('target', 100, 10);
  expect(connectionOcclusion(source, target, [point('behind', 50, 20)])).toEqual([]);
  expect(connectionOcclusion(source, target, [point('outside', 1000, 5)])).toEqual([]);
  expect(xBounds(connectionOcclusion(source, target, [point('ahead', 50, 5)])[0].path)).toEqual({
    min: 33,
    max: 67,
  });
});

test('objects ahead of both endpoints hide the whole overlap and objects behind both hide none', () => {
  const source = point('source', 0, 10);
  const target = point('target', 100, 30);
  expect(xBounds(connectionOcclusion(source, target, [point('ahead', 50, 5)])[0].path)).toEqual({
    min: 33,
    max: 67,
  });
  expect(connectionOcclusion(source, target, [point('behind', 50, 40)])).toEqual([]);
});
