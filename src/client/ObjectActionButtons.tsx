import { type KeyboardEvent, useId } from 'react';
import type { MapObject, MapState } from '../shared/map.js';
import { ObjectRemovalNotice } from './ObjectRemovalNotice.js';
import { WorkspaceIcon } from './WorkspaceTools.js';

export type ObjectActionCallbacks = {
  onEdit: (object: MapObject) => void;
  onRead?: (object: MapObject) => void;
  onRelationships?: (object: MapObject) => void;
  onReveal?: (object: MapObject) => void;
  onFocus?: (id: string) => void;
  onRemove?: (object: MapObject) => Promise<boolean> | undefined;
};

export function moveObjectActionFocus(event: KeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:enabled')];
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

/** Shared object actions for the context toolbar and movable property windows. */
export function ObjectActionButtons({
  object,
  state,
  disabled,
  mapAvailable = true,
  contextual = false,
  removed = false,
  onEdit,
  onRead,
  onRelationships,
  onReveal,
  onFocus,
  onRemove,
}: ObjectActionCallbacks & {
  object: MapObject;
  state: MapState;
  disabled: boolean;
  mapAvailable?: boolean;
  contextual?: boolean;
  removed?: boolean;
}) {
  const prefix = useId();
  const revealHelp =
    'Visa objektet och dess direkta samband i kartan. Rensar kartans sökning och filter och tar med upphörda vid behov.';
  const contextHelp =
    'Visa objektets direkta samband i kartan. Behåller kartans sökning och filter, inklusive valet för upphörda.';
  return (
    <>
      <button
        type="button"
        aria-label={contextual ? 'Redigera objekt' : `Redigera ${object.name}`}
        title={`Redigera ${object.name}. Öppnar objektets redigeringsformulär.`}
        disabled={disabled || removed}
        onClick={() => onEdit(object)}
      >
        <WorkspaceIcon name="edit" />
      </button>
      {onRead && (
        <button
          type="button"
          aria-label={`Visa uppgifter för ${object.name}`}
          title={`Visa alla detaljuppgifter för ${object.name}. Öppnar objektets uppgiftsfönster.`}
          onClick={() => onRead(object)}
        >
          <WorkspaceIcon name="detail" />
        </button>
      )}
      {onRelationships && (
        <button
          type="button"
          aria-label={`Samband för ${object.name}`}
          title={`Visa och hantera samband för ${object.name}. Öppnar sambandsformuläret.`}
          onClick={() => onRelationships(object)}
        >
          <WorkspaceIcon name="relationships" />
        </button>
      )}
      {onReveal && (
        <button
          type="button"
          aria-label="Visa i kartan"
          title={revealHelp}
          aria-describedby={`${prefix}-reveal`}
          disabled={disabled || !mapAvailable || removed}
          onClick={() => onReveal(object)}
        >
          <WorkspaceIcon name="focus" />
        </button>
      )}
      {onFocus && (
        <button
          type="button"
          aria-label="Visa samband i kartan"
          title={contextHelp}
          aria-describedby={`${prefix}-context`}
          disabled={disabled || !mapAvailable || removed}
          onClick={() => onFocus(object.id)}
        >
          <WorkspaceIcon name="connections" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={contextual ? 'Ta bort objekt' : `Ta bort ${object.name}`}
          title={`Ta bort ${object.name} och dess samband i ditt utkast. Sparad karta ändras först när du sparar hela utkastet.`}
          className="spatial-object-remove"
          aria-describedby={`${prefix}-removal`}
          disabled={
            disabled ||
            removed ||
            state.draft.changes.some((change) => change.id === object.id && !change.after)
          }
          onClick={() => void onRemove(object)}
        >
          <WorkspaceIcon name="trash" />
        </button>
      )}
      <span id={`${prefix}-reveal`} hidden>
        {revealHelp}
      </span>
      <span id={`${prefix}-context`} hidden>
        {contextHelp}
      </span>
      <div hidden>
        <ObjectRemovalNotice state={state} objectId={object.id} id={`${prefix}-removal`} />
      </div>
    </>
  );
}
