import type { ProjectedPoint } from './spatial-scene.js';

type Endpoint = Pick<ProjectedPoint, 'x' | 'y' | 'depth'>;
type Point = Pick<ProjectedPoint, 'x' | 'y'>;

/** Clip a polygon to the side where the signed value is nonpositive. */
function clip(points: Point[], value: (point: Point) => number) {
  const result: Point[] = [];
  let previous = points[points.length - 1];
  let previousValue = value(previous);
  for (const point of points) {
    const currentValue = value(point);
    if (currentValue <= 0 !== previousValue <= 0) {
      const fraction = previousValue / (previousValue - currentValue);
      result.push({
        x: previous.x + (point.x - previous.x) * fraction,
        y: previous.y + (point.y - previous.y) * fraction,
      });
    }
    if (currentValue <= 0) result.push(point);
    previous = point;
    previousValue = currentValue;
  }
  return result;
}

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
  const sourceReciprocalDepth = 1 / source.depth;
  const depthChange = 1 / target.depth - sourceReciprocalDepth;
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
    const crossing = depthChange ? (1 / point.depth - sourceReciprocalDepth) / depthChange : 0;
    const from = depthChange < 0 ? Math.max(0, crossing) : 0;
    const to = depthChange > 0 ? Math.min(1, crossing) : 1;
    if (from >= to || (!depthChange && point.depth > source.depth)) continue;
    const square = [
      { x: point.x - radius, y: point.y - radius },
      { x: point.x + radius, y: point.y - radius },
      { x: point.x + radius, y: point.y + radius },
      { x: point.x - radius, y: point.y + radius },
    ];
    let regions: Point[][];
    if (from === 0 && to === 1) regions = [square];
    else if (bend && dx === 0) {
      // Vertical curves can retrace their own pixels. Preserve the entire
      // screen interval occupied by the foreground branch of the curve.
      const nearFrom = from === 0 ? to : 0;
      const nearTo = from === 0 ? 1 : from;
      const y = (t: number) => source.y + dy * t + 2 * bend * t * (1 - t);
      const heights = [y(nearFrom), y(nearTo)];
      const turning = (dy + 2 * bend) / (4 * bend);
      if (turning > nearFrom && turning < nearTo) heights.push(y(turning));
      const minimum = Math.min(...heights);
      const maximum = Math.max(...heights);
      regions = [clip(square, (p) => p.y - minimum), clip(square, (p) => maximum - p.y)];
    } else {
      regions = [
        clip(square, (p) => {
          // The decorative bend changes only Y, so X still gives the exact
          // parameter on a nonvertical curve. Straight routes use their chord.
          const fraction = bend
            ? (p.x - source.x) / dx
            : ((p.x - source.x) * dx + (p.y - source.y) * dy) / lengthSquared;
          return sourceReciprocalDepth + depthChange * fraction - 1 / point.depth;
        }),
      ];
    }
    const path = regions
      .filter((region) => region.length > 2)
      .map(
        (region) => `${region.map((p, index) => `${index ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')} Z`,
      )
      .join(' ');
    if (!path) continue;
    masks.push({
      id: point.id,
      x: point.x,
      y: point.y,
      radius,
      path,
    });
  }
  return masks;
}
