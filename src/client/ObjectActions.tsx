import { useLayoutEffect, useRef } from 'react';
import type { MapObject, MapState } from '../shared/map.js';
import { moveObjectActionFocus, ObjectActionButtons } from './ObjectActionButtons.js';

export type ObjectActionsEntry = {
  object: MapObject;
  anchor: HTMLElement;
  focusActions?: boolean;
  restoreFocus: () => void;
  consumeHeldClick?: () => boolean;
};

/** Context actions follow the clicked object or name without blocking the map. */
export function ObjectActions({
  entry,
  state,
  disabled,
  mapAvailable = true,
  onClose,
  onEdit,
  onReveal,
  onRead,
  onRelationships,
  onFocus,
  onRemove,
}: {
  entry: ObjectActionsEntry;
  state: MapState;
  disabled: boolean;
  mapAvailable?: boolean;
  onClose: () => void;
  onEdit: (object: MapObject) => void;
  onReveal?: (object: MapObject) => void;
  onRead?: (object: MapObject) => void;
  onRelationships?: (object: MapObject) => void;
  onFocus: (id: string) => void;
  onRemove: (object: MapObject) => Promise<boolean> | undefined;
}) {
  const toolbar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!element) return;
    let frame = 0;
    function position() {
      if (!element) return;
      const anchor = entry.anchor.getBoundingClientRect();
      if (
        !entry.anchor.isConnected ||
        !anchor.width ||
        !anchor.height ||
        entry.anchor.closest('[hidden], [inert]')
      ) {
        onClose();
        return;
      }
      const viewport = window.visualViewport;
      const left = (viewport?.offsetLeft ?? 0) + 8;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const right = left + (viewport?.width ?? window.innerWidth) - 16;
      const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
      const { width, height } = element.getBoundingClientRect();
      let x = anchor.right + 8;
      let y = anchor.top + (anchor.height - height) / 2;
      if (x + width > right) {
        x = anchor.left - width - 8;
        if (Math.max(left, x) + width > anchor.left) {
          // Keep the object visible when neither side can hold the actions.
          x = anchor.left;
          y = anchor.bottom + 8 + height <= bottom ? anchor.bottom + 8 : anchor.top - height - 8;
        }
      }
      element.style.left = `${Math.max(left, Math.min(x, right - width))}px`;
      element.style.top = `${Math.max(top, Math.min(y, bottom - height))}px`;
      element.style.visibility = 'visible';
      // Projected nodes and labels move with the camera even without a resize.
      frame = requestAnimationFrame(position);
    }
    position();
    function dismiss(event: Event) {
      if (event.target instanceof Node && !element?.contains(event.target)) onClose();
    }
    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
      entry.restoreFocus();
    }
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('contextmenu', dismiss, true);
    document.addEventListener('keydown', dismissWithEscape, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('contextmenu', dismiss, true);
      document.removeEventListener('keydown', dismissWithEscape, true);
    };
  }, [entry, onClose]);
  useLayoutEffect(() => {
    const element = toolbar.current;
    // Touch release can focus the original target; avoid stealing focus mid-gesture.
    if (entry.focusActions !== false && entry.anchor.isConnected)
      (element?.querySelector<HTMLButtonElement>('button:enabled') ?? element)?.focus();
  }, [entry]);
  function close() {
    onClose();
    entry.restoreFocus();
  }
  return (
    <div
      ref={toolbar}
      role="toolbar"
      aria-label={`Åtgärder för ${entry.object.name}`}
      className="spatial-object-actions"
      tabIndex={-1}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onClose();
      }}
      onClickCapture={(event) => {
        if (entry.consumeHeldClick?.()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerDownCapture={() => entry.consumeHeldClick?.()}
      onKeyDown={(event) => {
        event.stopPropagation();
        moveObjectActionFocus(event);
      }}
    >
      <ObjectActionButtons
        object={entry.object}
        state={state}
        disabled={disabled}
        mapAvailable={mapAvailable}
        contextual
        onEdit={(object) => {
          close();
          onEdit(object);
        }}
        onRead={
          onRead &&
          ((object) => {
            close();
            onRead(object);
          })
        }
        onRelationships={
          onRelationships &&
          ((object) => {
            close();
            onRelationships(object);
          })
        }
        onReveal={
          onReveal &&
          ((object) => {
            close();
            onReveal(object);
          })
        }
        onFocus={(id) => {
          close();
          onFocus(id);
        }}
        onRemove={async (object) => {
          close();
          const origin = document.activeElement;
          const result = await onRemove(object);
          if (document.activeElement === origin || document.activeElement === document.body)
            entry.restoreFocus();
          return result ?? false;
        }}
      />
    </div>
  );
}
