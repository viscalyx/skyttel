import type { DepthBounds } from './zero-plane-depth.prototype.js';

// Tint only SourceGraphic pixels; transparent space and text labels stay clear.
export function ZeroPlanesDepthFilter({
  id,
  image,
  bounds,
}: {
  id: string;
  image: string;
  bounds?: DepthBounds;
}) {
  const region = bounds ?? { x: 0, y: 0, width: 1, height: 1 };
  const units = bounds ? 'userSpaceOnUse' : 'objectBoundingBox';
  return (
    <filter
      id={id}
      filterUnits={units}
      primitiveUnits={units}
      {...region}
      colorInterpolationFilters="sRGB"
    >
      <feImage href={image} {...region} preserveAspectRatio="none" result="planeTint" />
      <feComposite in="planeTint" in2="SourceGraphic" operator="atop" />
    </filter>
  );
}
