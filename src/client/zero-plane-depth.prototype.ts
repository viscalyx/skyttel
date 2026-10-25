// Throwaway depth comparison: project finite patches, then clip their tint to
// content behind them. Reciprocal camera depth is affine in screen coordinates.
import { type PerspectiveCamera, Vector3 } from 'three';
import {
  type PlaneComparison,
  prototypePlaneExtent,
  prototypePlanes,
  type zeroPlanesPrototype,
} from './zero-planes.prototype.js';

type Vertex = { x: number; y: number; z: number };
export type DepthPatch = { name: string; color: string; polygon: Vertex[] };
export type DepthBounds = { x: number; y: number; width: number; height: number };

function clip(polygon: Vertex[], distance: (point: Vertex) => number) {
  if (!polygon.length) return [];
  const result: Vertex[] = [];
  let previous = polygon[polygon.length - 1];
  let before = distance(previous);
  for (const point of polygon) {
    const after = distance(point);
    if (before >= 0 !== after >= 0) {
      const t = before / (before - after);
      result.push({
        x: previous.x + t * (point.x - previous.x),
        y: previous.y + t * (point.y - previous.y),
        z: previous.z + t * (point.z - previous.z),
      });
    }
    if (after >= 0) result.push(point);
    previous = point;
    before = after;
  }
  return result;
}

export function projectDepthPatches(
  planes: ReturnType<typeof zeroPlanesPrototype>,
  value: PlaneComparison,
  theme: 'light' | 'dark',
  camera: PerspectiveCamera,
  width: number,
  height: number,
): DepthPatch[] {
  if (value.shape === 'lines') return [];
  const radius = prototypePlaneExtent;
  const minor = value.shape === 'oval' ? radius * 0.7 : radius;
  const outline =
    value.shape === 'square'
      ? [
          [-radius, -minor],
          [radius, -minor],
          [radius, minor],
          [-radius, minor],
        ]
      : Array.from({ length: 128 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 128;
          return [Math.cos(angle) * radius, Math.sin(angle) * minor];
        });
  planes.group.updateMatrixWorld(true);
  return prototypePlanes.map((plane, index) => {
    let polygon: Vertex[] = outline.map(([x, y]) => {
      const p = new Vector3(x, y, 0)
        .applyMatrix4(planes.group.children[index].matrixWorld)
        .applyMatrix4(camera.matrixWorldInverse);
      return { x: p.x, y: p.y, z: p.z };
    });
    // Clip before perspective division, including patches that cross the camera.
    polygon = clip(polygon, (p) => -p.z - camera.near);
    polygon = clip(polygon, (p) => camera.far + p.z);
    polygon = polygon.map((p) => {
      const projected = new Vector3(p.x, p.y, p.z).applyMatrix4(camera.projectionMatrix);
      return {
        x: ((projected.x + 1) * width) / 2,
        y: ((1 - projected.y) * height) / 2,
        z: -1 / p.z,
      };
    });
    polygon = clip(polygon, (p) => p.x);
    polygon = clip(polygon, (p) => width - p.x);
    polygon = clip(polygon, (p) => p.y);
    polygon = clip(polygon, (p) => height - p.y);
    return { name: plane.name, color: plane[theme], polygon };
  });
}

export function depthTintRegions(
  patches: DepthPatch[],
  bounds: DepthBounds,
  reciprocalDepth: (point: { x: number; y: number }) => number,
) {
  return patches.flatMap((patch) => {
    let polygon = clip(patch.polygon, (p) => p.z - reciprocalDepth(p) - 1e-7);
    polygon = clip(polygon, (p) => p.x - bounds.x);
    polygon = clip(polygon, (p) => bounds.x + bounds.width - p.x);
    polygon = clip(polygon, (p) => p.y - bounds.y);
    polygon = clip(polygon, (p) => bounds.y + bounds.height - p.y);
    if (polygon.length < 3) return [];
    return [
      {
        name: patch.name,
        color: patch.color,
        path: `${polygon.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} Z`,
      },
    ];
  });
}
