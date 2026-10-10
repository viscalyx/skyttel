import type { ProjectedPoint } from './spatial-scene.js';

type Endpoint = Pick<ProjectedPoint, 'x' | 'y' | 'depth'>;

/** Portions of a projected relationship hidden by nearer object symbols. */
export function connectionOcclusion(
  source: Endpoint,
  target: Endpoint,
  points: Iterable<ProjectedPoint>,
  bend = 0,
) {
  const masks: { id: string; x: number; y: number; radius: number; path: string }[] = [];
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const lengthSquared = dx * dx + dy * dy;
  const near = 1 / source.depth;
  const change = 1 / target.depth - near;
  for (const point of points) {
    const radius = 17 * point.scale;
    const t = lengthSquared
      ? Math.max(
          0,
          Math.min(1, ((point.x - source.x) * dx + (point.y - source.y) * dy) / lengthSquared),
        )
      : 0;
    if (
      Math.hypot(point.x - source.x - dx * t, point.y - source.y - dy * t) >
      radius + 10 + Math.abs(bend) / 2
    )
      continue;
    // Reciprocal camera depth is linear in projected screen distance.
    const crossing = change ? (1 / point.depth - near) / change : 0;
    const from = change < 0 ? Math.max(0, crossing) : 0;
    const to = change > 0 ? Math.min(1, crossing) : 1;
    if (from >= to || (!change && point.depth > source.depth)) continue;
    const startX = source.x + dx * from;
    const startY = source.y + dy * from + 2 * bend * from * (1 - from);
    const endX = source.x + dx * to;
    const endY = source.y + dy * to + 2 * bend * to * (1 - to);
    const controlX = startX + ((to - from) * dx) / 2;
    const controlY = startY + ((to - from) * (dy + 2 * bend * (1 - 2 * from))) / 2;
    masks.push({
      id: point.id,
      x: point.x,
      y: point.y,
      radius,
      path: bend
        ? `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
        : `M ${startX} ${startY} L ${endX} ${endY}`,
    });
  }
  return masks;
}
