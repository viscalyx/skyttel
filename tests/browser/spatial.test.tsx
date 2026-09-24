import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { SpatialMap } from '../../src/client/SpatialMap.js';
import '../../src/client/styles.css';
import type { MapState } from '../../src/shared/map.js';
import { defaultViewSettings, type PersonalView } from '../../src/shared/personal-view.js';

const state: MapState = {
  userId: 'alex',
  contentVersion: 1,
  types: [
    { id: 'person', householdId: 'home', revision: 1, name: 'Person', description: '' },
    { id: 'own', householdId: 'home', revision: 1, name: 'Musiksak', description: '' },
  ],
  relationshipTypes: [
    {
      id: 'uses',
      householdId: 'home',
      revision: 1,
      name: 'Använder',
      description: '',
      forwardLabel: 'använder',
      reverseLabel: 'används av',
    },
  ],
  objects: [
    {
      id: 'lo',
      typeId: 'person',
      householdId: 'home',
      revision: 1,
      name: 'Lo Exempel',
      description: '',
    },
    {
      id: 'music',
      typeId: 'own',
      householdId: 'home',
      revision: 1,
      name: 'Musikspelaren',
      description: '',
    },
    {
      id: 'kim',
      typeId: 'person',
      householdId: 'home',
      revision: 1,
      name: 'Kim Exempel',
      description: '',
    },
  ],
  relationships: [
    {
      id: 'edge',
      householdId: 'home',
      revision: 1,
      typeId: 'uses',
      sourceId: 'lo',
      targetId: 'music',
      knowledge: 'known',
    },
    {
      id: 'unknown',
      householdId: 'home',
      revision: 1,
      typeId: 'uses',
      sourceId: 'kim',
      targetId: null,
      knowledge: 'unknown',
    },
  ],
  draft: { version: 0, changes: [] },
};

state.draft.changes = state.objects.map((object, index) => ({
  id: object.id,
  before: index === 1 ? null : object,
  after: index === 2 ? null : object,
  type: state.types[object.typeId === 'person' ? 0 : 1],
}));
state.draft.relationships = state.relationships.map((edge, index) => ({
  id: edge.id,
  before: edge,
  after: index ? null : edge,
  type: state.relationshipTypes[0],
  objectNames: {},
}));

function MapView({ relationships = state.relationships } = {}) {
  const [view, setView] = useState<PersonalView>({
    positions: [],
    settings: { ...defaultViewSettings, version: 0 },
  });
  const [selection, setSelection] = useState<{
    kind: 'object' | 'relationship';
    id: string;
  } | null>(null);
  const [objects, setObjects] = useState(
    new Map(state.objects.map((object) => [object.id, object])),
  );
  const [message, setMessage] = useState('Ingen vald');
  return (
    <>
      <p role="status">{message}</p>
      <pre data-placement>{JSON.stringify(view.positions)}</pre>
      <SpatialMap
        personal={{
          view,
          pending: false,
          message: '',
          refresh: async () => {},
          move: async (id, position) =>
            setView((previous) => ({
              ...previous,
              positions: [
                ...previous.positions.filter((item) => item.id !== id),
                { ...position, id, version: 1 },
              ],
            })),
          configure: async (settings) =>
            setView((previous) => ({ ...previous, settings: { ...settings, version: 1 } })),
        }}
        active
        state={state}
        objects={objects}
        relationships={new Map(relationships.map((edge) => [edge.id, edge]))}
        selection={selection}
        disabled={false}
        onSelect={(object) => {
          setSelection({ kind: 'object', id: object.id });
          setMessage(object.name);
        }}
        onSelectRelationship={(edge) => {
          setSelection({ kind: 'relationship', id: edge.id });
          setMessage(`Samband: ${edge.knowledge}`);
        }}
        onFocus={(id) => {
          setSelection({ kind: 'object', id });
          setMessage(`Kopplingar för ${id}`);
        }}
        onClear={() => {
          setSelection(null);
          setMessage('Hela rymden');
        }}
        onReset={() => {
          setSelection(null);
          setMessage('Översikt återställd');
        }}
        onRemove={(object) => {
          setObjects((previous) => {
            const next = new Map(previous);
            next.delete(object.id);
            return next;
          });
          setMessage('Borttagning föreslagen');
        }}
      />
    </>
  );
}

test('personal placement buttons move the selected object in three dimensions without editing household facts', async () => {
  render(<MapView />);
  await page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }).click();
  await page.getByText('Ordna min vy', { exact: true }).click();
  await page.getByRole('button', { name: 'Flytta uppåt i rummet', exact: true }).click();
  const first = JSON.parse(document.querySelector('[data-placement]')?.textContent ?? '[]');
  expect(first).toHaveLength(1);
  await page.getByRole('button', { name: 'Flytta nedåt i rummet', exact: true }).click();
  const second = JSON.parse(document.querySelector('[data-placement]')?.textContent ?? '[]');
  expect(second[0].y).toBeCloseTo(first[0].y - 1);
  expect(second[0].x).toBe(first[0].x);
  expect(second[0].z).toBe(first[0].z);
});

test('native touch gestures move in the camera plane and height while cancellation and finger swaps restore the original placement', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await expect.element(lo).toBeVisible();
  const session = cdp();
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const location = () => {
    const rect = lo.element().getBoundingClientRect();
    const offset = window.frameElement?.getBoundingClientRect();
    return {
      x: rect.x + rect.width / 2 + (offset?.x ?? 0),
      y: rect.y + rect.height / 2 + (offset?.y ?? 0),
    };
  };
  const send = (
    type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
    points: { id: number; x: number; y: number }[],
  ) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const positions = () =>
    JSON.parse(document.querySelector('[data-placement]')?.textContent ?? '[]');
  let start = location();
  await send('touchStart', [{ id: 1, ...start }]);
  await send('touchMove', [{ id: 1, x: start.x + 30, y: start.y + 20 }]);
  await send('touchEnd', []);
  await expect.poll(() => positions().length).toBe(1);
  const before = positions()[0];
  start = location();
  const second = { id: 2, x: start.x + 100, y: start.y };
  await send('touchStart', [{ id: 1, ...start }]);
  await send('touchStart', [{ id: 1, ...start }, second]);
  await send('touchMove', [{ id: 1, x: start.x, y: start.y - 35 }, second]);
  await expect.element(page.getByText('Höjdflyttning · personlig vy')).toBeVisible();
  await send('touchEnd', [second]);
  await send('touchEnd', []);
  await expect.poll(() => positions()[0].y).toBeGreaterThan(before.y);
  expect(positions()[0].x).toBe(before.x);
  expect(positions()[0].z).toBe(before.z);
  const saved = positions();
  start = location();
  await send('touchStart', [{ id: 1, ...start }]);
  await send('touchMove', [{ id: 1, x: start.x + 30, y: start.y }]);
  await send('touchCancel', []);
  expect(positions()).toEqual(saved);
  start = location();
  const stationary = { id: 2, x: start.x + 100, y: start.y };
  await send('touchStart', [{ id: 1, ...start }]);
  await send('touchStart', [{ id: 1, ...start }, stationary]);
  await send('touchMove', [{ id: 1, x: start.x, y: start.y - 30 }, stationary]);
  await send('touchEnd', [{ id: 1, x: start.x, y: start.y - 30 }]);
  await send('touchMove', [{ ...stationary, y: stationary.y + 30 }]);
  await send('touchEnd', []);
  expect(positions()).toEqual(saved);
  // A moving second finger cancels instead of silently interpreting a pinch
  // as a height edit; three-finger interruption also leaves no saved move.
  for (const extra of [false, true]) {
    start = location();
    const anchor = { id: 2, x: start.x + 100, y: start.y };
    await send('touchStart', [{ id: 1, ...start }]);
    await send('touchStart', [{ id: 1, ...start }, anchor]);
    if (extra)
      await send('touchStart', [
        { id: 1, ...start },
        anchor,
        { id: 3, x: start.x + 130, y: start.y },
      ]);
    else
      await send('touchMove', [
        { id: 1, ...start },
        { ...anchor, y: anchor.y + 30 },
      ]);
    await send('touchEnd', []);
  }
  expect(positions()).toEqual(saved);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
});

test('personal display controls retain corner choices, independent pan inversions and all movement alternatives', async () => {
  render(<MapView />);
  await page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }).click();
  await page.getByText('Ordna min vy', { exact: true }).click();
  await page.getByLabelText('Visa axlar hela tiden', { exact: true }).click();
  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    await page.getByLabelText('Axelvisarens hörn', { exact: true }).selectOptions(corner);
    await expect
      .element(page.getByRole('img', { name: 'Rummets axlar: sidled X, höjd Y, djup Z' }))
      .toHaveClass(new RegExp(corner));
  }
  for (const label of [
    'Vänd panorering i sidled',
    'Vänd panorering i höjdled',
    'Visa stjärnhimmel',
  ]) {
    await page.getByLabelText(label, { exact: true }).click();
    await expect.element(page.getByLabelText(label, { exact: true })).toBeChecked();
  }
  for (const label of ['vänster', 'höger', 'uppåt', 'nedåt', 'inåt', 'utåt'])
    await page.getByRole('button', { name: `Flytta ${label} i rummet`, exact: true }).click();
  await page.getByText('Navigera rymden', { exact: true }).click();
  for (const label of ['Panorera vänster', 'Panorera höger', 'Panorera uppåt', 'Panorera nedåt'])
    await page.getByRole('button', { name: label, exact: true }).click();
});

test('native empty-space mouse, wheel and touch navigation changes the camera without moving objects', async () => {
  render(<MapView />);
  await expect
    .element(page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }))
    .toBeVisible();
  const session = cdp();
  const canvas = document.querySelector('canvas');
  if (!canvas) throw new Error('Visible map required');
  const rect = canvas.getBoundingClientRect();
  const offset = window.frameElement?.getBoundingClientRect();
  const start = { x: rect.x + 15 + (offset?.x ?? 0), y: rect.y + 15 + (offset?.y ?? 0) };
  const line = () => document.querySelector('line[data-object-id="lo"]')?.getAttribute('x1');
  const before = line();
  for (const [button, buttons, modifiers] of [
    ['left', 1, 0],
    ['right', 2, 0],
    ['left', 1, 8],
  ] as const) {
    await session.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...start,
      button,
      buttons,
      modifiers,
      clickCount: 1,
    });
    await session.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: start.x + 30,
      y: start.y + 15,
      button,
      buttons,
      modifiers,
    });
    await session.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: start.x + 30,
      y: start.y + 15,
      button,
      buttons: 0,
      modifiers,
      clickCount: 1,
    });
  }
  expect(line()).not.toBe(before);
  for (const [deltaX, deltaY, modifiers] of [
    [0, 20, 0],
    [10, 20, 0],
    [0, 15, 8],
    [0, -20, 2],
  ]) {
    await session.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      ...start,
      deltaX,
      deltaY,
      modifiers,
    });
  }
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
    touchPoints: { id: number; x: number; y: number }[],
  ) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
  await touch('touchStart', [{ id: 1, ...start }]);
  await touch('touchMove', [{ id: 1, x: start.x + 20, y: start.y + 10 }]);
  await touch('touchStart', [
    { id: 1, x: start.x + 20, y: start.y + 10 },
    { id: 2, x: start.x + 110, y: start.y + 10 },
  ]);
  await touch('touchMove', [
    { id: 1, x: start.x + 30, y: start.y + 20 },
    { id: 2, x: start.x + 145, y: start.y + 20 },
  ]);
  await touch('touchStart', [
    { id: 1, x: start.x + 30, y: start.y + 20 },
    { id: 2, x: start.x + 145, y: start.y + 20 },
    { id: 3, x: start.x + 170, y: start.y + 20 },
  ]);
  await touch('touchMove', [
    { id: 1, x: start.x + 35, y: start.y + 20 },
    { id: 2, x: start.x + 145, y: start.y + 20 },
    { id: 3, x: start.x + 170, y: start.y + 20 },
  ]);
  await touch('touchCancel', []);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  expect(document.querySelector('[data-placement]')?.textContent).toBe('[]');
  window.dispatchEvent(new Event('blur'));
});

test('painted stars respond to rotation and zoom while panning and object movement leave the distant sky fixed', async () => {
  render(<MapView relationships={[]} />);
  await page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }).click();
  await page.getByText('Ordna min vy', { exact: true }).click();
  await page.getByLabelText('Visa stjärnhimmel', { exact: true }).click();
  await page.getByText('Navigera rymden', { exact: true }).click();
  const starPixels = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Visible map required');
    const screenshot = await page.screenshot({ element: canvas, base64: true });
    const picture = new Image();
    picture.src = `data:image/png;base64,${screenshot.base64}`;
    await picture.decode();
    const sample = document.createElement('canvas');
    sample.width = picture.width;
    sample.height = picture.height;
    const context = sample.getContext('2d');
    if (!context) throw new Error('Pixel sampling unavailable');
    context.drawImage(picture, 0, 0);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    const bounds = canvas.getBoundingClientRect();
    const overlays = [...document.querySelectorAll('.spatial-labels button, .spatial-axis')].map(
      (element) => element.getBoundingClientRect(),
    );
    const visible = (pixel: number) => {
      const x = bounds.x + (pixel % sample.width);
      const y = bounds.y + Math.floor(pixel / sample.width);
      return !overlays.some(
        (overlay) =>
          x >= overlay.left - 6 &&
          x <= overlay.right + 6 &&
          y >= overlay.top - 6 &&
          y <= overlay.bottom + 6,
      );
    };
    const pixels = new Set<number>();
    for (let index = 0; index < data.length; index += 4) {
      if (
        data[index] >= 200 &&
        data[index + 1] >= 225 &&
        data[index + 2] >= 232 &&
        data[index + 2] - data[index] >= 10 &&
        visible(index / 4)
      )
        pixels.add(index / 4);
    }
    return { pixels, visible };
  };
  const common = (
    a: Awaited<ReturnType<typeof starPixels>>,
    b: Awaited<ReturnType<typeof starPixels>>,
  ) => {
    const visible = [...a.pixels].filter(b.visible);
    return visible.filter((pixel) => b.pixels.has(pixel)).length / visible.length;
  };
  const original = await starPixels();
  expect(original.pixels.size).toBeGreaterThan(15);
  await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
  const panned = await starPixels();
  expect(common(original, panned)).toBeGreaterThan(0.85);
  await page.getByRole('button', { name: 'Flytta uppåt i rummet', exact: true }).click();
  expect(common(panned, await starPixels())).toBeGreaterThan(0.85);
  await page.getByRole('button', { name: 'Rotera vänster', exact: true }).click();
  const rotated = await starPixels();
  expect(common(panned, rotated)).toBeLessThan(0.3);
  await page.getByRole('button', { name: 'Zooma in', exact: true }).click();
  expect(common(rotated, await starPixels())).toBeLessThan(0.3);
});

afterEach(cleanup);

test('graphics navigation and label modes expose selectable objects and directed facts', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await expect.element(lo).toBeVisible();
  await lo.click({ modifiers: ['Control'] });
  await expect.element(page.getByRole('status')).toHaveTextContent('Kopplingar för lo');
  await lo.click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Lo Exempel');
  await page.getByText('Navigera rymden', { exact: true }).click();
  for (const name of [
    'Panorera höger',
    'Panorera vänster',
    'Panorera uppåt',
    'Panorera nedåt',
    'Rotera vänster',
    'Rotera höger',
    'Luta uppåt',
    'Luta nedåt',
    'Zooma in',
    'Zooma ut',
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect.element(lo).toBeInTheDocument();
  }
  await page.getByLabelText('Alla etiketter', { exact: true }).click();
  await expect
    .element(page.getByText('Närmare utsnitt. Panorera för att se fler etiketter.'))
    .toBeVisible();
  await page.getByLabelText('Alla etiketter', { exact: true }).click();
  await page.getByRole('button', { name: 'Återställ vy' }).click();
  await page
    .getByRole('button', {
      name: 'Välj samband: Lo Exempel → använder → Musikspelaren',
      exact: true,
    })
    .click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Samband: known');
  await page
    .getByRole('button', { name: 'Välj samband: Kim Exempel → använder → Okänt', exact: true })
    .click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Samband: unknown');
  await page
    .getByRole('img', { name: 'Rymdens bakgrund. Välj innehåll med etiketterna eller listan.' })
    .click({ position: { x: 5, y: 5 } });
  await expect.element(page.getByRole('status')).toHaveTextContent('Hela rymden');
});

test('direction rendering retains selectable self references and explicitly absent targets', async () => {
  render(
    <MapView
      relationships={[
        { ...state.relationships[0], id: 'self', targetId: 'lo' },
        { ...state.relationships[1], id: 'none', knowledge: 'none' },
      ]}
    />,
  );
  await page
    .getByRole('button', {
      name: 'Välj samband: Lo Exempel → använder → Lo Exempel',
      exact: true,
    })
    .click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Samband: known');
  await page
    .getByRole('button', {
      name: 'Välj samband: Kim Exempel → använder → Uttryckligen inget',
      exact: true,
    })
    .click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Samband: none');
});

test('context menu edits, focuses, cancels and removes only the chosen object', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Lo Exempel');
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Visa kopplingar', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Kopplingar för lo');
  await lo.click({ button: 'right' });
  await userEvent.keyboard('{Escape}');
  await expect.element(lo).toHaveFocus();
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await expect.element(lo).toHaveFocus();
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Ta bort objekt', exact: true }).click();
  await expect.element(lo).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Välj objekt: Kim Exempel', exact: true }))
    .toBeVisible();
});

test('a real WebGL context can recover without replacing selected household content', async () => {
  render(<MapView />);
  await page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }).click();
  const extension = document
    .querySelector('canvas')
    ?.getContext('webgl2')
    ?.getExtension('WEBGL_lose_context');
  expect(extension).toBeTruthy();
  extension?.loseContext();
  await expect
    .element(page.getByText('Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.'))
    .toBeVisible();
  extension?.restoreContext();
  await expect
    .element(page.getByText('Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.'))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
});

test('long press does not activate a menu action on release and movement cancels a pending menu', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await expect.element(lo).toBeVisible();
  const element = lo.element();
  fireEvent.pointerDown(element, {
    pointerType: 'touch',
    isPrimary: true,
    clientX: 20,
    clientY: 20,
  });
  fireEvent.pointerMove(element, { pointerType: 'touch', clientX: 50, clientY: 20 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  await expect
    .element(page.getByRole('button', { name: 'Redigera objekt', exact: true }))
    .not.toBeInTheDocument();
  fireEvent.pointerDown(element, {
    pointerType: 'touch',
    isPrimary: true,
    clientX: 20,
    clientY: 20,
  });
  await expect
    .element(page.getByRole('button', { name: 'Redigera objekt', exact: true }))
    .toBeVisible();
  fireEvent.pointerUp(element, { pointerType: 'touch' });
  fireEvent.click(page.getByRole('button', { name: 'Redigera objekt', exact: true }).element());
  await expect
    .element(page.getByRole('button', { name: 'Redigera objekt', exact: true }))
    .toBeVisible();
  await expect.element(page.getByRole('status')).toHaveTextContent('Ingen vald');
  await page.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Lo Exempel');
});
