import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useMovableWindow } from '../../../src/client/use-movable-window.js';

// Numeric layout isolates placement and drag state; Chromium tests cover physical access.
beforeEach(() => {
  vi.stubGlobal('innerWidth', 320);
  vi.stubGlobal('innerHeight', 250);
  vi.stubGlobal('visualViewport', undefined);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      readonly pointerId: number;
      readonly isPrimary: boolean;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.isPrimary = init.isPrimary ?? true;
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(80);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains('map-object-search')) return new DOMRect(12, 12, 180, 36);
    return new DOMRect(
      Number.parseFloat(this.style.left) || 0,
      Number.parseFloat(this.style.top) || 0,
      this.offsetWidth,
      this.offsetHeight,
    );
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Window({ search = false, active = true }: { search?: boolean; active?: boolean }) {
  const panel = useRef<HTMLElement>(null);
  const { position, handle, dragging, status } = useMovableWindow(panel, active, 0);
  return (
    <div className="household-map">
      {search && <div className="map-object-search" />}
      <section
        ref={panel}
        aria-label="Uppgifter"
        style={{ left: position?.x, top: position?.y }}
        data-dragging={dragging}
      >
        {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole lint/a11y/useSemanticElements: Match the production window's focusable title group. */}
        <header {...handle} role="group" tabIndex={0} aria-label="Flytta fönstret">
          Uppgifter
          <button type="button">Stäng</button>
        </header>
        <output>{status}</output>
      </section>
    </div>
  );
}
const panel = () => screen.getByRole('region', { name: 'Uppgifter' });
const position = () => ({ x: panel().style.left, y: panel().style.top });
function pointerHandle() {
  const handle = screen.getByRole('group', { name: 'Flytta fönstret' });
  const captured = new Set<number>();
  handle.setPointerCapture = vi.fn((id) => captured.add(id));
  handle.hasPointerCapture = vi.fn((id) => captured.has(id));
  handle.releasePointerCapture = vi.fn((id) => captured.delete(id));
  return handle;
}

test.each([false, true])(
  'short-screen placement reserves search space when present (%s)',
  (search) => {
    render(<Window search={search} />);
    expect(position()).toEqual({ x: '196px', y: search ? '56px' : '8px' });
  },
);

test('placement respects the visible viewport offset and responds to its scrolling', () => {
  const viewport = Object.assign(new EventTarget(), {
    width: 320,
    height: 250,
    offsetLeft: 20,
    offsetTop: 70,
  });
  vi.stubGlobal('visualViewport', viewport);
  const mounted = render(<Window search />);
  expect(position()).toEqual({ x: '216px', y: '78px' });
  viewport.offsetTop = 90;
  act(() => {
    viewport.dispatchEvent(new Event('scroll'));
  });
  expect(position()).toEqual({ x: '216px', y: '98px' });
  mounted.unmount();
  expect(() => viewport.dispatchEvent(new Event('resize'))).not.toThrow();
});

test('keyboard placement survives resizing, clamps to the viewport and ignores child shortcuts', () => {
  render(<Window />);
  const handle = pointerHandle();
  fireEvent.keyDown(handle, { key: 'ArrowLeft' });
  expect(position()).toEqual({ x: '184px', y: '8px' });
  expect(screen.getByRole('status').textContent).toContain('184 från vänster, 8 uppifrån');
  fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true });
  expect(position()).toEqual({ x: '184px', y: '48px' });
  fireEvent.keyDown(handle, { key: 'ArrowLeft', ctrlKey: true });
  fireEvent.keyDown(screen.getByRole('button', { name: 'Stäng' }), { key: 'ArrowLeft' });
  expect(position()).toEqual({ x: '184px', y: '48px' });
  vi.stubGlobal('innerWidth', 180);
  fireEvent.resize(window);
  expect(position()).toEqual({ x: '72px', y: '48px' });
  vi.stubGlobal('innerWidth', 320);
  fireEvent.resize(window);
  expect(position()).toEqual({ x: '184px', y: '48px' });
});

test.each(['escape', 'cancel', 'lost capture', 'blur'] as const)(
  'an interrupted drag (%s) restores its origin and rejects late pointer movement',
  (reason) => {
    render(<Window />);
    const handle = pointerHandle();
    const origin = position();
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(handle, { pointerId: 2 });
    expect(position()).toEqual(origin);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 160, clientY: 60 });
    expect(position()).toEqual({ x: '156px', y: '48px' });
    expect(panel().dataset.dragging).toBe('true');
    if (reason === 'escape') fireEvent.keyDown(handle, { key: 'Escape' });
    else if (reason === 'cancel') fireEvent.pointerCancel(handle, { pointerId: 1 });
    else if (reason === 'lost capture') {
      handle.releasePointerCapture(1);
      fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    } else fireEvent.blur(window);
    expect(position()).toEqual(origin);
    expect(panel().dataset.dragging).toBe('false');
    expect(handle.hasPointerCapture(1)).toBe(false);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    fireEvent.blur(window);
    expect(position()).toEqual(origin);
    if (reason !== 'blur')
      expect(screen.getByRole('status').textContent).toBe('Flyttningen av fönstret avbröts.');
  },
);

test('only a primary drag on the handle commits movement and releases capture', () => {
  render(<Window />);
  const handle = pointerHandle();
  const origin = position();
  fireEvent.pointerDown(handle, { isPrimary: false });
  fireEvent.pointerDown(handle, { button: 2 });
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Stäng' }));
  expect(handle.setPointerCapture).not.toHaveBeenCalled();
  expect(position()).toEqual(origin);
  fireEvent.pointerDown(handle, { clientX: 200, clientY: 20 });
  fireEvent.pointerMove(handle, { clientX: 160, clientY: 60 });
  fireEvent.pointerUp(handle);
  expect(position()).toEqual({ x: '156px', y: '48px' });
  expect(panel().dataset.dragging).toBe('false');
  expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
  fireEvent.resize(window);
  expect(position()).toEqual({ x: '156px', y: '48px' });
});

test('inactive windows wait for activation before placing their content', () => {
  const mounted = render(<Window active={false} search />);
  expect(position()).toEqual({ x: '', y: '' });
  mounted.rerender(<Window search />);
  expect(position()).toEqual({ x: '196px', y: '56px' });
});

test('a window with no measured size waits for layout before choosing its position', () => {
  const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(0);
  render(<Window search />);
  expect(position()).toEqual({ x: '', y: '' });
  width.mockReturnValue(100);
  fireEvent.resize(window);
  expect(position()).toEqual({ x: '196px', y: '56px' });
});
