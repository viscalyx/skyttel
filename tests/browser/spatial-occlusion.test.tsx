import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { connectionOcclusion } from '../../src/client/spatial-occlusion.js';

afterEach(cleanup);

test('a foreground branch of a retraced curved relationship remains visible over an object', {
  tags: ['technical'],
}, async () => {
  const masks = connectionOcclusion(
    { x: 0, y: 0, depth: 10 },
    { x: 0, y: 0, depth: 30 },
    [{ id: 'object', x: 0, y: 6, depth: 15, scale: 1, visible: true }],
    23,
  );
  const { container } = render(
    <svg width="64" height="64" viewBox="-20 -20 64 64" aria-hidden="true">
      <defs>
        <clipPath id="occlusion-test-circle">
          <circle cx="0" cy="6" r="17" />
        </clipPath>
        <mask
          id="occlusion-test-mask"
          maskUnits="userSpaceOnUse"
          x="-20"
          y="-20"
          width="64"
          height="64"
        >
          <rect x="-20" y="-20" width="64" height="64" fill="white" />
          {masks.map((mask) => (
            <path key={mask.id} d={mask.path} fill="black" clipPath="url(#occlusion-test-circle)" />
          ))}
        </mask>
      </defs>
      <rect x="-20" y="-20" width="64" height="64" fill="white" />
      <path
        d="M 0 0 Q 0 23 0 0"
        stroke="red"
        strokeWidth="2"
        fill="none"
        mask="url(#occlusion-test-mask)"
      />
    </svg>,
  );
  const screenshot = await page.screenshot({
    element: container.firstElementChild as SVGSVGElement,
    base64: true,
  });
  const picture = new Image();
  picture.src = `data:image/png;base64,${screenshot.base64}`;
  await picture.decode();
  const sample = document.createElement('canvas');
  sample.width = 64;
  sample.height = 64;
  const context = sample.getContext('2d');
  if (!context) throw new Error('Pixel sampling unavailable');
  context.drawImage(picture, 0, 0);
  expect([...context.getImageData(20, 26, 1, 1).data]).toEqual([255, 0, 0, 255]);
});
