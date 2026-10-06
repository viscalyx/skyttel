import { useId, useLayoutEffect, useRef } from 'react';
import type { MapObject, MapState } from '../shared/map.js';
import { trapDialogTab } from './modal-focus.js';
import { ObjectRemovalNotice } from './ObjectRemovalNotice.js';

export type ObjectActionsEntry = {
  object: MapObject;
  restoreFocus: () => void;
  consumeHeldClick?: () => boolean;
};

/** The same ordinary object actions are available from graphical and textual entries. */
export function ObjectActions({
  entry,
  state,
  disabled,
  mapAvailable = true,
  onClose,
  onEdit,
  onFocus,
  onRemove,
}: {
  entry: ObjectActionsEntry;
  state: MapState;
  disabled: boolean;
  mapAvailable?: boolean;
  onClose: () => void;
  onEdit: (object: MapObject) => void;
  onFocus: (id: string) => void;
  onRemove: (object: MapObject) => Promise<boolean> | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const prefix = useId();
  useLayoutEffect(() => {
    const modal = dialog.current;
    modal?.showModal();
    heading.current?.focus();
    return () => modal?.close();
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
    entry.restoreFocus();
  }
  return (
    <dialog
      ref={dialog}
      className="spatial-menu"
      aria-labelledby={`${prefix}-title`}
      onClickCapture={(event) => {
        if (entry.consumeHeldClick?.()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        trapDialogTab(event);
      }}
    >
      <h3 ref={heading} id={`${prefix}-title`} tabIndex={-1}>
        Åtgärder för {entry.object.name}
      </h3>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          close();
          onEdit(entry.object);
        }}
      >
        Redigera objekt
      </button>
      <button
        type="button"
        disabled={disabled || !mapAvailable}
        onClick={() => {
          close();
          onFocus(entry.object.id);
        }}
      >
        Visa samband i kartan
      </button>
      <button
        type="button"
        aria-describedby={`${prefix}-removal`}
        disabled={
          disabled ||
          state.draft.changes.some((change) => change.id === entry.object.id && !change.after)
        }
        onClick={async () => {
          close();
          const origin = document.activeElement;
          await onRemove(entry.object);
          if (document.activeElement === origin || document.activeElement === document.body)
            entry.restoreFocus();
        }}
      >
        Ta bort objekt
      </button>
      <ObjectRemovalNotice state={state} objectId={entry.object.id} id={`${prefix}-removal`} />
      <button type="button" onClick={close}>
        Avbryt
      </button>
    </dialog>
  );
}
