import type { MapSelection } from '../shared/text-assistant.js';

export type MapRevealRequest = {
  id: string;
  objectIds: string[];
  relationshipId?: string;
};

function rendered(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.checkVisibility();
}

function contained(element: HTMLElement, bounds: DOMRect) {
  const box = element.getBoundingClientRect();
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.left >= bounds.left &&
    box.right <= bounds.right &&
    box.top >= bounds.top &&
    box.bottom <= bounds.bottom
  );
}

/** Resolve only after the actual map and populated inspector show the requested item. */
export function waitForMapDisplay(
  root: HTMLElement,
  request: MapRevealRequest,
  target: MapSelection,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve) => {
    let frame = 0;
    let scrolled = false;
    const finish = (displayed: boolean) => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      document.removeEventListener('visibilitychange', visibility);
      resolve(displayed);
    };
    const abort = () => finish(false);
    const visibility = () => {
      if (document.visibilityState !== 'visible') finish(false);
    };
    const timeout = window.setTimeout(abort, 5_000);
    const inspect = () => {
      if (signal.aborted || !root.isConnected || document.visibilityState !== 'visible') {
        finish(false);
        return;
      }
      const surface = root.querySelector('.spatial-surface');
      const inspector = root.querySelector(
        `[data-selection-kind="${target.kind}"][data-selection-id="${CSS.escape(target.id)}"]`,
      );
      if (
        rendered(surface) &&
        surface.dataset.revealRequest === request.id &&
        rendered(inspector)
      ) {
        if (!scrolled) {
          surface.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          scrolled = true;
        }
        const bounds = surface.getBoundingClientRect();
        const viewport = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
        const nodesVisible = request.objectIds.every((id) => {
          const node = surface.querySelector(`.spatial-node[data-object-id="${CSS.escape(id)}"]`);
          return rendered(node) && contained(node, bounds) && contained(node, viewport);
        });
        const selected = surface.querySelector(
          target.kind === 'object'
            ? `.spatial-node[data-object-id="${CSS.escape(target.id)}"][aria-pressed="true"]`
            : `.spatial-edge[data-layout-id="relationship-${CSS.escape(target.id)}"].selected`,
        );
        if (nodesVisible && rendered(selected) && contained(selected, bounds)) {
          finish(true);
          return;
        }
      }
      frame = requestAnimationFrame(inspect);
    };
    signal.addEventListener('abort', abort, { once: true });
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(inspect);
  });
}
